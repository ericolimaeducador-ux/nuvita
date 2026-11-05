import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { AvaliacaoIUService } from '../../avaliacao-iu/application/avaliacao-iu.service';
import { NotificacoesService } from '../../notificacoes/application/notificacoes.service';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { PacienteRepository } from '../../pacientes/application/ports/paciente.repository';
import { ClassificacaoArea, Paciente } from '../../pacientes/domain/paciente.entity';
import { FollowUp, StatusElegibilidade } from '../domain/followup.entity';
import { FollowUpRepository } from './ports/followup.repository';
import { FollowUpAuditContext, FollowUpService } from './followup.service';
import { CreateFollowUpDto } from './dto/create-followup.dto';

const PACIENTE_ID = '65f000000000000000000001';

const contexto: FollowUpAuditContext = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'enf-1', email: 'enf@nuvita.test', papel: Papel.ENFERMEIRO, clinicaId: 'clinica-1', jti: 'jti', typ: 'access' as const },
};

function dto(status: StatusElegibilidade, over: Partial<CreateFollowUpDto> = {}): CreateFollowUpDto {
  return { pacienteId: PACIENTE_ID, dataFollowup: '2026-02-01', statusElegibilidade: status, observacoes: 'texto clínico sigiloso', ...over };
}

function followup(status: StatusElegibilidade): FollowUp {
  return {
    id: 'f1', clinicaId: 'clinica-1', pacienteId: PACIENTE_ID, enfermeiroId: 'enf-1', dataFollowup: new Date(),
    statusElegibilidade: status, observacoes: 'x', criadoEm: new Date(), atualizadoEm: new Date(),
  };
}

function montar(
  repo: Partial<Record<keyof FollowUpRepository, jest.Mock>>,
  existe = true,
  pertenceAoPaciente = jest.fn().mockResolvedValue(true),
) {
  const auditCreate = jest.fn().mockResolvedValue(undefined);
  const notificarElegibilidade = jest.fn().mockResolvedValue(undefined);
  const pacientes = {
    resumoPorIds: jest.fn().mockResolvedValue(existe ? new Map([[PACIENTE_ID, { nome: 'Maria' }]]) : new Map()),
    avancarEtapaFluxo: jest.fn().mockResolvedValue(undefined),
    estaNoFluxoClinico: jest.fn().mockResolvedValue(true),
  };
  const service = new FollowUpService(
    repo as unknown as FollowUpRepository,
    { create: auditCreate } as unknown as AuditLogRepository,
    { notificarElegibilidade } as unknown as NotificacoesService,
    pacientes as unknown as PacientesService,
    { pertenceAoPaciente } as unknown as AvaliacaoIUService,
  );
  return { service, auditCreate, notificarElegibilidade, pacientes, pertenceAoPaciente };
}

describe('FollowUpService.create — gatilhos do fluxo clínico', () => {
  it('ELEGIVEL → notifica a elegibilidade e avança para APTO_AGUARDANDO_CONTATO', async () => {
    const { service, pacientes, notificarElegibilidade } = montar({ create: jest.fn().mockResolvedValue(followup(StatusElegibilidade.ELEGIVEL)) });

    await service.create(dto(StatusElegibilidade.ELEGIVEL), contexto);

    expect(notificarElegibilidade).toHaveBeenCalledWith('clinica-1', PACIENTE_ID, 'Maria');
    expect(pacientes.avancarEtapaFluxo).toHaveBeenCalledWith(
      'clinica-1', PACIENTE_ID, EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO,
      { ip: '127.0.0.1', userAgent: 'jest', user: contexto.user },
    );
  });

  it('avaliacaoIuId do paciente/clínica é aceito e validado contra a avaliação', async () => {
    const create = jest.fn().mockResolvedValue(followup(StatusElegibilidade.EM_AVALIACAO));
    const { service, pertenceAoPaciente } = montar({ create });

    await service.create(dto(StatusElegibilidade.EM_AVALIACAO, { avaliacaoIuId: '65f0000000000000000000aa' }), contexto);

    expect(pertenceAoPaciente).toHaveBeenCalledWith('clinica-1', '65f0000000000000000000aa', PACIENTE_ID);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ avaliacaoIuId: '65f0000000000000000000aa' }));
  });

  it('avaliacaoIuId que não existe, é de outra clínica ou de outro paciente → 404; nada gravado, notificado nem avançado', async () => {
    const create = jest.fn();
    const { service, pacientes, notificarElegibilidade, auditCreate } = montar({ create }, true, jest.fn().mockResolvedValue(false));

    await expect(
      service.create(dto(StatusElegibilidade.ELEGIVEL, { avaliacaoIuId: '65f0000000000000000000aa' }), contexto),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(create).not.toHaveBeenCalled();
    expect(pacientes.avancarEtapaFluxo).not.toHaveBeenCalled();
    expect(notificarElegibilidade).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('sem avaliacaoIuId não consulta a avaliação', async () => {
    const { service, pertenceAoPaciente } = montar({ create: jest.fn().mockResolvedValue(followup(StatusElegibilidade.EM_AVALIACAO)) });
    await service.create(dto(StatusElegibilidade.EM_AVALIACAO), contexto);
    expect(pertenceAoPaciente).not.toHaveBeenCalled();
  });

  it('ELEGIVEL de paciente fora do fluxo → follow-up registrado, SEM notificação (a etapa fica a cargo do avanço)', async () => {
    const create = jest.fn().mockResolvedValue(followup(StatusElegibilidade.ELEGIVEL));
    const { service, pacientes, notificarElegibilidade } = montar({ create });
    pacientes.estaNoFluxoClinico.mockResolvedValue(false);

    const resultado = await service.create(dto(StatusElegibilidade.ELEGIVEL), contexto);

    expect(resultado.id).toBe('f1');
    expect(create).toHaveBeenCalled();
    expect(notificarElegibilidade).not.toHaveBeenCalled();
    expect(pacientes.avancarEtapaFluxo).toHaveBeenCalledWith('clinica-1', PACIENTE_ID, EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO, expect.anything());
  });

  it('NAO_ELEGIVEL → avança para NAO_ELEGIVEL e NÃO notifica', async () => {
    const { service, pacientes, notificarElegibilidade } = montar({ create: jest.fn().mockResolvedValue(followup(StatusElegibilidade.NAO_ELEGIVEL)) });

    await service.create(dto(StatusElegibilidade.NAO_ELEGIVEL), contexto);

    expect(pacientes.avancarEtapaFluxo).toHaveBeenCalledWith('clinica-1', PACIENTE_ID, EtapaFluxoClinico.NAO_ELEGIVEL, expect.anything());
    expect(notificarElegibilidade).not.toHaveBeenCalled();
  });

  it('EM_AVALIACAO → registra, mas não mexe na etapa nem notifica', async () => {
    const { service, pacientes, notificarElegibilidade } = montar({ create: jest.fn().mockResolvedValue(followup(StatusElegibilidade.EM_AVALIACAO)) });

    await service.create(dto(StatusElegibilidade.EM_AVALIACAO), contexto);

    expect(pacientes.avancarEtapaFluxo).not.toHaveBeenCalled();
    expect(notificarElegibilidade).not.toHaveBeenCalled();
  });

  it('paciente de outra clínica → 404; nada é gravado, notificado nem avançado', async () => {
    const create = jest.fn();
    const { service, pacientes, notificarElegibilidade } = montar({ create }, false);

    await expect(service.create(dto(StatusElegibilidade.ELEGIVEL), contexto)).rejects.toBeInstanceOf(NotFoundException);
    expect(create).not.toHaveBeenCalled();
    expect(pacientes.avancarEtapaFluxo).not.toHaveBeenCalled();
    expect(notificarElegibilidade).not.toHaveBeenCalled();
  });

  it('audita FOLLOWUP_CREATED só com ids e status (sem as observações clínicas)', async () => {
    const { service, auditCreate } = montar({ create: jest.fn().mockResolvedValue(followup(StatusElegibilidade.ELEGIVEL)) });

    await service.create(dto(StatusElegibilidade.ELEGIVEL), contexto);

    const chamada = auditCreate.mock.calls[0][0];
    expect(chamada.event).toBe(AuditEvent.FOLLOWUP_CREATED);
    expect(chamada.metadata).toMatchObject({ followupId: 'f1', pacienteId: PACIENTE_ID, statusElegibilidade: 'elegivel' });
    expect(JSON.stringify(chamada.metadata)).not.toMatch(/sigiloso/);
  });

  describe('com o PacientesService real (elegibilidade ao fluxo)', () => {
    function comPacienteReal(paciente: Paciente, status: StatusElegibilidade) {
      const updatePaciente = jest.fn().mockResolvedValue(paciente);
      const pacienteRepo = {
        findById: jest.fn().mockResolvedValue(paciente),
        findManyByIds: jest.fn().mockResolvedValue([paciente]),
        update: updatePaciente,
      } as unknown as PacienteRepository;
      const pacientesService = new PacientesService(pacienteRepo, { create: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogRepository);
      const notificarElegibilidade = jest.fn().mockResolvedValue(undefined);
      const service = new FollowUpService(
        { create: jest.fn().mockResolvedValue(followup(status)) } as unknown as FollowUpRepository,
        { create: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogRepository,
        { notificarElegibilidade } as unknown as NotificacoesService,
        pacientesService,
        { pertenceAoPaciente: jest.fn().mockResolvedValue(true) } as unknown as AvaliacaoIUService,
      );
      return { service, updatePaciente, notificarElegibilidade };
    }

    const base: Paciente = {
      id: PACIENTE_ID, clinicaId: 'clinica-1', nome: 'Maria', ativo: true, criadoEm: new Date(), atualizadoEm: new Date(),
    };

    it('paciente elegível ([IU]) em AVALIACAO_IU: ELEGIVEL → APTO_AGUARDANDO_CONTATO', async () => {
      const { service, updatePaciente, notificarElegibilidade } = comPacienteReal(
        { ...base, classificacoes: [ClassificacaoArea.IU], etapaFluxo: EtapaFluxoClinico.AVALIACAO_IU },
        StatusElegibilidade.ELEGIVEL,
      );

      await service.create(dto(StatusElegibilidade.ELEGIVEL), contexto);

      expect(notificarElegibilidade).toHaveBeenCalledWith('clinica-1', PACIENTE_ID, 'Maria');
      expect(updatePaciente).toHaveBeenCalledWith(
        'clinica-1', PACIENTE_ID, expect.objectContaining({ etapaFluxo: EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO }),
      );
    });

    it('paciente elegível ([IU]) em AVALIACAO_IU: NAO_ELEGIVEL → NAO_ELEGIVEL', async () => {
      const { service, updatePaciente } = comPacienteReal(
        { ...base, classificacoes: [ClassificacaoArea.IU], etapaFluxo: EtapaFluxoClinico.AVALIACAO_IU },
        StatusElegibilidade.NAO_ELEGIVEL,
      );

      await service.create(dto(StatusElegibilidade.NAO_ELEGIVEL), contexto);

      expect(updatePaciente).toHaveBeenCalledWith(
        'clinica-1', PACIENTE_ID, expect.objectContaining({ etapaFluxo: EtapaFluxoClinico.NAO_ELEGIVEL }),
      );
    });

    it.each([
      ['[FA]', [ClassificacaoArea.FA], EtapaFluxoClinico.AVALIACAO_IU],
      ['[IU, FA] com etapa gravada', [ClassificacaoArea.IU, ClassificacaoArea.FA], EtapaFluxoClinico.AVALIACAO_IU],
      ['[OT] sem etapa', [ClassificacaoArea.OT], undefined],
    ])('paciente fora do fluxo %s: o follow-up é registrado, mas a etapa NÃO muda e NÃO há notificação', async (_nome, classificacoes, etapaFluxo) => {
      for (const status of [StatusElegibilidade.ELEGIVEL, StatusElegibilidade.NAO_ELEGIVEL]) {
        const { service, updatePaciente, notificarElegibilidade } = comPacienteReal({ ...base, classificacoes, etapaFluxo }, status);

        const resultado = await service.create(dto(status), contexto);

        expect(resultado.statusElegibilidade).toBe(status);
        expect(updatePaciente).not.toHaveBeenCalled();
        expect(notificarElegibilidade).not.toHaveBeenCalled();
      }
    });
  });
});

describe('FollowUpService — leitura e exclusão', () => {
  it('excluir é lógico, audita FOLLOWUP_DELETED e dá 404 quando não existe', async () => {
    const softDelete = jest.fn().mockResolvedValueOnce(followup(StatusElegibilidade.ELEGIVEL)).mockResolvedValueOnce(null);
    const { service, auditCreate } = montar({ softDelete });

    await service.excluir('f1', undefined, contexto);
    expect(softDelete).toHaveBeenCalledWith('clinica-1', 'f1', 'enf-1');
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({ event: AuditEvent.FOLLOWUP_DELETED }));
    await expect(service.excluir('f1', undefined, contexto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findOne → 404 quando não existe na clínica; listagem exige pacienteId', async () => {
    const { service } = montar({ findById: jest.fn().mockResolvedValue(null) });

    await expect(service.findOne('f1', undefined, contexto.user)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.listByPaciente('', undefined, contexto.user)).rejects.toThrow();
  });

  it('resumo conta por status na clínica do token', async () => {
    const countByStatus = jest.fn().mockImplementation((_c, s) => Promise.resolve({ em_avaliacao: 1, elegivel: 2, nao_elegivel: 3 }[s as string]));
    const { service } = montar({ countByStatus });

    await expect(service.resumo(undefined, contexto.user)).resolves.toEqual({ emAvaliacao: 1, elegivel: 2, naoElegivel: 3 });
    expect(countByStatus).toHaveBeenCalledWith('clinica-1', StatusElegibilidade.ELEGIVEL);
  });
});

describe('CreateFollowUpDto', () => {
  const opcoes = { whitelist: true, forbidNonWhitelisted: true };
  const erros = async (dados: Record<string, unknown>) =>
    (await validate(plainToInstance(CreateFollowUpDto, { ...dto(StatusElegibilidade.ELEGIVEL), ...dados }), opcoes)).map((e) => e.property);

  it('válido é aceito (inclusive proximoFollowup vazio do input de data)', async () => {
    expect(await erros({})).toEqual([]);
    expect(await erros({ proximoFollowup: '' })).toEqual([]);
  });

  it.each([
    ['pacienteId que não é ObjectId', { pacienteId: 'abc' }, 'pacienteId'],
    ['avaliacaoIuId que não é ObjectId', { avaliacaoIuId: 'abc' }, 'avaliacaoIuId'],
    ['status fora do enum', { statusElegibilidade: 'talvez' }, 'statusElegibilidade'],
    ['observações vazias', { observacoes: '' }, 'observacoes'],
    ['data inválida', { dataFollowup: 'ontem' }, 'dataFollowup'],
    ['campo desconhecido', { enfermeiroId: 'x' }, 'enfermeiroId'],
  ])('%s: recusado', async (_nome, over, campo) => {
    expect(await erros(over)).toContain(campo);
  });
});
