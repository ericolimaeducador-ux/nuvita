import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { ClassificacaoArea, Paciente } from '../domain/paciente.entity';
import { PacientesService, RequestAuditContext } from './pacientes.service';
import { PacienteRepository } from './ports/paciente.repository';

const { IU, FA, OT } = ClassificacaoArea;

function contextoDe(papel: Papel): RequestAuditContext {
  return {
    ip: '127.0.0.1',
    userAgent: 'jest',
    user: { sub: 'user-1', email: 'u@nuvita.test', papel, clinicaId: 'clinica-1', jti: 'jti', typ: 'access' },
  };
}

function paciente(extra: Partial<Paciente> = {}): Paciente {
  return {
    id: 'paciente-1',
    clinicaId: 'clinica-1',
    nome: 'Maria',
    ativo: true,
    criadoEm: new Date('2026-01-01T00:00:00.000Z'),
    atualizadoEm: new Date('2026-01-01T00:00:00.000Z'),
    ...extra,
  };
}

function montar(repo: Record<string, jest.Mock>) {
  const auditCreate = jest.fn().mockResolvedValue(undefined);
  const service = new PacientesService(
    repo as unknown as PacienteRepository,
    { create: auditCreate } as unknown as AuditLogRepository,
  );
  return { service, auditCreate };
}

const eventos = (auditCreate: jest.Mock) => auditCreate.mock.calls.map((c) => c[0].event);

describe('Classificação de área e elegibilidade ao fluxo clínico', () => {
  describe('create()', () => {
    it('classificação exatamente [IU] → nasce em AGUARDANDO_ATENDIMENTO, com etapaFluxoDesde', async () => {
      const create = jest.fn().mockResolvedValue(paciente());
      const { service } = montar({ create });

      await service.create({ clinicaId: 'clinica-1', nome: 'Maria', classificacoes: [IU] } as never, contextoDe(Papel.SECRETARIA));

      const input = create.mock.calls[0][0];
      expect(input.classificacoes).toEqual([IU]);
      expect(input.etapaFluxo).toBe(EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO);
      expect(input.etapaFluxoDesde).toBeInstanceOf(Date);
    });

    it.each([[[FA]], [[OT]], [[IU, FA]], [[IU, OT]], [[FA, OT]], [[IU, FA, OT]]])(
      'classificação %j → NÃO entra no fluxo (sem etapaFluxo no insert)',
      async (classificacoes) => {
        const create = jest.fn().mockResolvedValue(paciente());
        const { service } = montar({ create });

        await service.create({ clinicaId: 'clinica-1', nome: 'Maria', classificacoes } as never, contextoDe(Papel.SECRETARIA));

        const input = create.mock.calls[0][0];
        expect(input.classificacoes).toEqual(classificacoes);
        expect(input).not.toHaveProperty('etapaFluxo');
        expect(input).not.toHaveProperty('etapaFluxoDesde');
      },
    );

    it('sem classificação (ausente ou vazia) → 400 e nada é gravado', async () => {
      const create = jest.fn();
      const { service } = montar({ create });

      await expect(
        service.create({ clinicaId: 'clinica-1', nome: 'Maria' } as never, contextoDe(Papel.SECRETARIA)),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create({ clinicaId: 'clinica-1', nome: 'Maria', classificacoes: [] } as never, contextoDe(Papel.SECRETARIA)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('update() — alteração da classificação', () => {
    it('audita PACIENTE_CLASSIFICACAO_ALTERADA com valorAnterior/valorNovo (e mantém a etapa quando deixa de ser elegível)', async () => {
      const atual = paciente({ classificacoes: [IU], etapaFluxo: EtapaFluxoClinico.AVALIACAO_IU, etapaFluxoDesde: new Date() });
      const findById = jest.fn().mockResolvedValue(atual);
      const update = jest.fn().mockResolvedValue({ ...atual, classificacoes: [IU, FA] });
      const { service, auditCreate } = montar({ findById, update });

      await service.update('paciente-1', { classificacoes: [IU, FA] } as never, undefined, contextoDe(Papel.ENFERMEIRO));

      const gravado = update.mock.calls[0][2];
      expect(gravado.classificacoes).toEqual([IU, FA]);
      // a etapa gravada NÃO é zerada nem tocada
      expect(gravado).not.toHaveProperty('etapaFluxo');
      expect(gravado).not.toHaveProperty('etapaFluxoDesde');

      const chamada = auditCreate.mock.calls.find((c) => c[0].event === AuditEvent.PACIENTE_CLASSIFICACAO_ALTERADA);
      expect(chamada).toBeDefined();
      expect(chamada![0].metadata).toMatchObject({
        clinicaId: 'clinica-1',
        pacienteId: 'paciente-1',
        valorAnterior: [IU],
        valorNovo: [IU, FA],
      });
    });

    it('classificação igual (mesmo conjunto, outra ordem) não gera evento', async () => {
      const atual = paciente({ classificacoes: [IU, FA] });
      const findById = jest.fn().mockResolvedValue(atual);
      const update = jest.fn().mockResolvedValue(atual);
      const { service, auditCreate } = montar({ findById, update });

      await service.update('paciente-1', { classificacoes: [FA, IU] } as never, undefined, contextoDe(Papel.SECRETARIA));

      expect(eventos(auditCreate)).not.toContain(AuditEvent.PACIENTE_CLASSIFICACAO_ALTERADA);
    });

    it('PATCH sem classificacoes não toca na classificação nem gera evento', async () => {
      const atual = paciente({ classificacoes: [FA] });
      const findById = jest.fn().mockResolvedValue(atual);
      const update = jest.fn().mockResolvedValue(atual);
      const { service, auditCreate } = montar({ findById, update });

      await service.update('paciente-1', { telefone: '11999998888' } as never, undefined, contextoDe(Papel.SECRETARIA));

      expect(eventos(auditCreate)).not.toContain(AuditEvent.PACIENTE_CLASSIFICACAO_ALTERADA);
    });

    it('passa a ser exatamente [IU] e ainda não tem etapa → entra em AGUARDANDO_ATENDIMENTO (via avancarEtapaFluxo)', async () => {
      const antes = paciente({ classificacoes: [FA] });
      const depois = paciente({ classificacoes: [IU] });
      const findById = jest.fn().mockResolvedValueOnce(antes).mockResolvedValue(depois);
      const update = jest.fn().mockResolvedValue(depois);
      const { service, auditCreate } = montar({ findById, update });

      await service.update('paciente-1', { classificacoes: [IU] } as never, undefined, contextoDe(Papel.SECRETARIA));

      const chamadaEtapa = update.mock.calls.find((c) => c[2].etapaFluxo);
      expect(chamadaEtapa![2].etapaFluxo).toBe(EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO);
      expect(eventos(auditCreate)).toEqual(expect.arrayContaining([AuditEvent.PIPELINE_STAGE_CHANGED]));
    });
  });

  describe('avancarEtapaFluxo() — ponto único de mutação', () => {
    const ctx = contextoDe(Papel.ENFERMEIRO);

    it('avança para frente e audita PIPELINE_STAGE_CHANGED (etapaAnterior/etapaNova)', async () => {
      const atual = paciente({ classificacoes: [IU], etapaFluxo: EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO });
      const update = jest.fn().mockResolvedValue(atual);
      const { service, auditCreate } = montar({ findById: jest.fn().mockResolvedValue(atual), update });

      await service.avancarEtapaFluxo('clinica-1', 'paciente-1', EtapaFluxoClinico.AVALIACAO_IU, ctx);

      expect(update).toHaveBeenCalledWith(
        'clinica-1',
        'paciente-1',
        expect.objectContaining({ etapaFluxo: EtapaFluxoClinico.AVALIACAO_IU, etapaFluxoDesde: expect.any(Date) }),
      );
      expect(auditCreate.mock.calls[0][0]).toMatchObject({
        event: AuditEvent.PIPELINE_STAGE_CHANGED,
        metadata: { etapaAnterior: EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO, etapaNova: EtapaFluxoClinico.AVALIACAO_IU },
      });
    });

    it.each([
      ['mesma etapa', EtapaFluxoClinico.AVALIACAO_IU],
      ['etapa anterior', EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO],
    ])('não regride (%s)', async (_nome, destino) => {
      const atual = paciente({ classificacoes: [IU], etapaFluxo: EtapaFluxoClinico.AVALIACAO_IU });
      const update = jest.fn();
      const { service } = montar({ findById: jest.fn().mockResolvedValue(atual), update });

      await service.avancarEtapaFluxo('clinica-1', 'paciente-1', destino, ctx);

      expect(update).not.toHaveBeenCalled();
    });

    it('paciente NÃO elegível (ex.: [IU, FA]) não é movido, mesmo tendo etapa gravada', async () => {
      const atual = paciente({ classificacoes: [IU, FA], etapaFluxo: EtapaFluxoClinico.AVALIACAO_IU });
      const update = jest.fn();
      const { service } = montar({ findById: jest.fn().mockResolvedValue(atual), update });

      await service.avancarEtapaFluxo('clinica-1', 'paciente-1', EtapaFluxoClinico.CONCLUIDO, ctx);

      expect(update).not.toHaveBeenCalled();
    });

    it('engole o erro (só loga): nunca lança', async () => {
      const { service } = montar({ findById: jest.fn().mockRejectedValue(new Error('banco fora')) });

      await expect(
        service.avancarEtapaFluxo('clinica-1', 'paciente-1', EtapaFluxoClinico.AVALIACAO_IU, ctx),
      ).resolves.toBeUndefined();
    });
  });

  describe('avancarEtapaManual()', () => {
    function cenario(etapa: EtapaFluxoClinico | undefined, classificacoes = [IU]) {
      const atual = paciente({ classificacoes, etapaFluxo: etapa });
      const depois = paciente({ classificacoes, etapaFluxo: EtapaFluxoClinico.ENTREVISTA_AGENDADA });
      const findById = jest.fn().mockResolvedValueOnce(atual).mockResolvedValue(depois);
      const update = jest.fn().mockResolvedValue(depois);
      return { ...montar({ findById, update }), update };
    }

    it.each([Papel.ADMIN, Papel.SECRETARIA, Papel.ENFERMEIRO, Papel.SUPER_ADMIN])(
      'papel %s avança APTO_AGUARDANDO_CONTATO → ENTREVISTA_AGENDADA e audita manual=true',
      async (papel) => {
        const { service, update, auditCreate } = cenario(EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO);

        await service.avancarEtapaManual('paciente-1', undefined, contextoDe(papel));

        expect(update.mock.calls[0][2].etapaFluxo).toBe(EtapaFluxoClinico.ENTREVISTA_AGENDADA);
        expect(auditCreate.mock.calls[0][0].metadata).toMatchObject({ manual: true, etapaNova: EtapaFluxoClinico.ENTREVISTA_AGENDADA });
      },
    );

    it('papel sem permissão → 403 e nada é gravado', async () => {
      const { service, update } = cenario(EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO);

      await expect(service.avancarEtapaManual('paciente-1', undefined, contextoDe(Papel.PACIENTE))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(update).not.toHaveBeenCalled();
    });

    it.each([
      EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO,
      EtapaFluxoClinico.AVALIACAO_IU,
      EtapaFluxoClinico.AGUARDANDO_CONSULTA_MEDICA,
      EtapaFluxoClinico.AGUARDANDO_ENTREGA,
      EtapaFluxoClinico.NAO_ELEGIVEL,
      EtapaFluxoClinico.CONCLUIDO,
    ])('etapa %s não permite avanço manual → 400', async (etapa) => {
      const { service, update } = cenario(etapa);

      await expect(service.avancarEtapaManual('paciente-1', undefined, contextoDe(Papel.ADMIN))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(update).not.toHaveBeenCalled();
    });

    it('paciente sem etapa ou fora da elegibilidade → 400', async () => {
      const semEtapa = cenario(undefined);
      await expect(semEtapa.service.avancarEtapaManual('paciente-1', undefined, contextoDe(Papel.ADMIN))).rejects.toBeInstanceOf(
        BadRequestException,
      );

      const naoElegivel = cenario(EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO, [IU, OT]);
      await expect(naoElegivel.service.avancarEtapaManual('paciente-1', undefined, contextoDe(Papel.ADMIN))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(naoElegivel.update).not.toHaveBeenCalled();
    });
  });
});
