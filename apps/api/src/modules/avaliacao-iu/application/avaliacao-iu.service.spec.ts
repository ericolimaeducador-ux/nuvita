import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { PacienteRepository } from '../../pacientes/application/ports/paciente.repository';
import { ClassificacaoArea, Paciente } from '../../pacientes/domain/paciente.entity';
import { AvaliacaoIU, Destreza, LocalAtendimento, PerfilCliente } from '../domain/avaliacao-iu.entity';
import { AvaliacaoAuditContext, AvaliacaoIUService } from './avaliacao-iu.service';
import { AvaliacaoIURepository } from './ports/avaliacao-iu.repository';
import { CreateAvaliacaoIUDto } from './dto/create-avaliacao-iu.dto';
import { UpdateAvaliacaoIUDto } from './dto/update-avaliacao-iu.dto';

const PACIENTE_ID = '65f000000000000000000001';

const contexto: AvaliacaoAuditContext = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: {
    sub: 'enf-1', email: 'enf@nuvita.test', papel: Papel.ENFERMEIRO, clinicaId: 'clinica-1', jti: 'jti', typ: 'access' as const,
    nome: 'Enf. Ana', registroProfissional: 'COREN-123',
  },
};

function dto(over: Partial<CreateAvaliacaoIUDto> = {}): CreateAvaliacaoIUDto {
  return {
    pacienteId: PACIENTE_ID, dataAtendimento: '2026-03-01', local: LocalAtendimento.RESIDENCIA, motivoIU: 'motivo sigiloso',
    perfilCliente: PerfilCliente.ATIVO, destreza: Destreza.PRESERVADA, dntui: false, tiposIU: [], miccaoEspontanea: true,
    realizaCateterismo: false, emTratamento: false, autorizaPesquisa: false, aceitaInformacoes: false, ...over,
  };
}

function avaliacao(over: Partial<AvaliacaoIU> = {}): AvaliacaoIU {
  return {
    id: 'a1', clinicaId: 'clinica-1', pacienteId: PACIENTE_ID, enfermeiroId: 'enf-1', dataAtendimento: new Date(),
    local: LocalAtendimento.RESIDENCIA, motivoIU: 'x', perfilCliente: PerfilCliente.ATIVO, destreza: Destreza.PRESERVADA,
    dntui: false, tiposIU: [], miccaoEspontanea: true, realizaCateterismo: false, emTratamento: false,
    autorizaPesquisa: false, aceitaInformacoes: false, criadoEm: new Date(), atualizadoEm: new Date(), ...over,
  };
}

function montar(repo: Partial<Record<keyof AvaliacaoIURepository, jest.Mock>>, existe = true) {
  const auditCreate = jest.fn().mockResolvedValue(undefined);
  const pacientes = {
    resumoPorIds: jest.fn().mockResolvedValue(existe ? new Map([[PACIENTE_ID, { nome: 'Maria' }]]) : new Map()),
    avancarEtapaFluxo: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AvaliacaoIUService(
    repo as unknown as AvaliacaoIURepository,
    { create: auditCreate } as unknown as AuditLogRepository,
    pacientes as unknown as PacientesService,
  );
  return { service, auditCreate, pacientes };
}

describe('AvaliacaoIUService.create — gatilho do fluxo clínico', () => {
  it('create → tenta levar o paciente para AVALIACAO_IU, com ip/user-agent reais', async () => {
    const { service, pacientes } = montar({ create: jest.fn().mockResolvedValue(avaliacao()) });

    await service.create(dto(), contexto);

    expect(pacientes.avancarEtapaFluxo).toHaveBeenCalledWith(
      'clinica-1', PACIENTE_ID, EtapaFluxoClinico.AVALIACAO_IU,
      { ip: '127.0.0.1', userAgent: 'jest', user: contexto.user },
    );
  });

  it('grava com a clínica do token, o enfermeiro, o nome e o COREN do perfil quando não vêm no payload', async () => {
    const create = jest.fn().mockResolvedValue(avaliacao());
    const { service } = montar({ create });

    await service.create(dto({ clinicaId: 'clinica-1' }), contexto);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ clinicaId: 'clinica-1', enfermeiroId: 'enf-1', enfermeiroNome: 'Enf. Ana', coren: 'COREN-123' }),
    );
    expect(create.mock.calls[0][0].dataAtendimento).toBeInstanceOf(Date);
  });

  it('paciente de outra clínica → 404; nada gravado, nada avançado', async () => {
    const create = jest.fn();
    const { service, pacientes } = montar({ create }, false);

    await expect(service.create(dto(), contexto)).rejects.toBeInstanceOf(NotFoundException);
    expect(create).not.toHaveBeenCalled();
    expect(pacientes.avancarEtapaFluxo).not.toHaveBeenCalled();
  });

  it('audita AVALIACAO_IU_CREATED só com ids (sem o conteúdo clínico da ficha)', async () => {
    const { service, auditCreate } = montar({ create: jest.fn().mockResolvedValue(avaliacao()) });

    await service.create(dto(), contexto);

    const chamada = auditCreate.mock.calls[0][0];
    expect(chamada.event).toBe(AuditEvent.AVALIACAO_IU_CREATED);
    expect(chamada.metadata).toEqual({ clinicaId: 'clinica-1', avaliacaoId: 'a1', pacienteId: PACIENTE_ID });
    expect(JSON.stringify(chamada.metadata)).not.toMatch(/sigiloso/);
  });

  describe('com o PacientesService real (elegibilidade ao fluxo)', () => {
    function comPacienteReal(paciente: Paciente) {
      const updatePaciente = jest.fn().mockResolvedValue(paciente);
      const pacienteRepo = {
        findById: jest.fn().mockResolvedValue(paciente),
        findManyByIds: jest.fn().mockResolvedValue([paciente]),
        update: updatePaciente,
      } as unknown as PacienteRepository;
      const pacientesService = new PacientesService(pacienteRepo, { create: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogRepository);
      const service = new AvaliacaoIUService(
        { create: jest.fn().mockResolvedValue(avaliacao()) } as unknown as AvaliacaoIURepository,
        { create: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogRepository,
        pacientesService,
      );
      return { service, updatePaciente };
    }

    const base: Paciente = {
      id: PACIENTE_ID, clinicaId: 'clinica-1', nome: 'Maria', ativo: true, criadoEm: new Date(), atualizadoEm: new Date(),
    };

    it('paciente elegível ([IU]) em AGUARDANDO_ATENDIMENTO vai para AVALIACAO_IU', async () => {
      const { service, updatePaciente } = comPacienteReal({
        ...base, classificacoes: [ClassificacaoArea.IU], etapaFluxo: EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO,
      });

      await service.create(dto(), contexto);

      expect(updatePaciente).toHaveBeenCalledWith(
        'clinica-1', PACIENTE_ID, expect.objectContaining({ etapaFluxo: EtapaFluxoClinico.AVALIACAO_IU }),
      );
    });

    it.each([
      ['[FA]', [ClassificacaoArea.FA], EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO],
      ['[IU, FA] com etapa gravada', [ClassificacaoArea.IU, ClassificacaoArea.FA], EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO],
      ['[OT] sem etapa', [ClassificacaoArea.OT], undefined],
    ])('paciente fora do fluxo %s: a avaliação é registrada, mas a etapa NÃO muda', async (_nome, classificacoes, etapaFluxo) => {
      const { service, updatePaciente } = comPacienteReal({ ...base, classificacoes, etapaFluxo });

      const resultado = await service.create(dto(), contexto);

      expect(resultado.id).toBe('a1');
      expect(updatePaciente).not.toHaveBeenCalled();
    });
  });
});

describe('AvaliacaoIUService — pertenceAoPaciente (validação de referência)', () => {
  it('true só quando a avaliação existe NA CLÍNICA e é do paciente informado', async () => {
    const findById = jest.fn()
      .mockResolvedValueOnce(avaliacao())
      .mockResolvedValueOnce(avaliacao({ pacienteId: 'outro-paciente' }))
      .mockResolvedValueOnce(null);
    const { service } = montar({ findById });

    await expect(service.pertenceAoPaciente('clinica-1', 'a1', PACIENTE_ID)).resolves.toBe(true);
    await expect(service.pertenceAoPaciente('clinica-1', 'a1', PACIENTE_ID)).resolves.toBe(false);
    await expect(service.pertenceAoPaciente('clinica-1', 'a1', PACIENTE_ID)).resolves.toBe(false);
    expect(findById).toHaveBeenCalledWith('clinica-1', 'a1');
  });
});

describe('AvaliacaoIUService — leitura, edição e exclusão', () => {
  it('findOne audita AVALIACAO_IU_VIEWED e dá 404 quando não existe na clínica', async () => {
    const findById = jest.fn().mockResolvedValueOnce(avaliacao()).mockResolvedValueOnce(null);
    const { service, auditCreate } = montar({ findById });

    await service.findOne('a1', undefined, contexto);
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({ event: AuditEvent.AVALIACAO_IU_VIEWED }));
    await expect(service.findOne('a1', undefined, contexto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update audita só os NOMES dos campos e faz backfill do nome do autor', async () => {
    const update = jest.fn().mockResolvedValue(avaliacao({ coren: 'X' }));
    const { service, auditCreate } = montar({ findById: jest.fn().mockResolvedValue(avaliacao()), update });

    await service.update('a1', { coren: 'COREN-999' }, undefined, contexto);

    expect(update).toHaveBeenCalledWith('clinica-1', 'a1', expect.objectContaining({ coren: 'COREN-999', enfermeiroNome: 'Enf. Ana' }));
    const meta = auditCreate.mock.calls[0][0].metadata;
    expect(auditCreate.mock.calls[0][0].event).toBe(AuditEvent.AVALIACAO_IU_UPDATED);
    expect(meta.campos).toEqual(expect.arrayContaining(['coren']));
    expect(JSON.stringify(meta)).not.toMatch(/COREN-999/);
  });

  it('update de ficha inexistente → 404', async () => {
    const { service } = montar({ findById: jest.fn().mockResolvedValue(null) });
    await expect(service.update('a1', { coren: 'x' }, undefined, contexto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('excluir é lógico, audita AVALIACAO_IU_DELETED e dá 404 quando não existe', async () => {
    const softDelete = jest.fn().mockResolvedValueOnce(avaliacao()).mockResolvedValueOnce(null);
    const { service, auditCreate } = montar({ softDelete });

    await service.excluir('a1', undefined, contexto);
    expect(softDelete).toHaveBeenCalledWith('clinica-1', 'a1', 'enf-1');
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({ event: AuditEvent.AVALIACAO_IU_DELETED }));
    await expect(service.excluir('a1', undefined, contexto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('"minhas" é só do enfermeiro', async () => {
    const listByEnfermeiro = jest.fn().mockResolvedValue([]);
    const { service } = montar({ listByEnfermeiro });

    await expect(service.listMinha({ ...contexto.user, papel: Papel.ADMIN })).rejects.toBeInstanceOf(ForbiddenException);
    await service.listMinha(contexto.user);
    expect(listByEnfermeiro).toHaveBeenCalledWith('clinica-1', 'enf-1');
  });

  it('listagem exige pacienteId e usa a clínica do token', async () => {
    const listByPaciente = jest.fn().mockResolvedValue([]);
    const { service } = montar({ listByPaciente });

    await expect(service.listByPaciente('', undefined, contexto.user)).rejects.toThrow();
    await service.listByPaciente(PACIENTE_ID, undefined, contexto.user);
    expect(listByPaciente).toHaveBeenCalledWith('clinica-1', PACIENTE_ID);
  });
});

describe('DTOs da avaliação de IU', () => {
  const opcoes = { whitelist: true, forbidNonWhitelisted: true };
  const base = { ...dto() } as Record<string, unknown>;
  const errosCriar = async (over: Record<string, unknown>) =>
    (await validate(plainToInstance(CreateAvaliacaoIUDto, { ...base, ...over }), opcoes)).map((e) => e.property);

  it('válido é aceito (inclusive com produto indicado)', async () => {
    expect(await errosCriar({})).toEqual([]);
    expect(await errosCriar({ produtoIndicado: { codigo: 72082, sexo: 'feminino', french: 8 } })).toEqual([]);
    expect(await errosCriar({ produtoIndicado: { codigo: 510795, sexo: 'universal', french: 12 } })).toEqual([]);
    expect(await errosCriar({ produtoIndicado: { codigo: 4714598, sexo: 'masculino', french: 0 } })).toEqual([]);
  });

  it.each([
    ['pacienteId que não é ObjectId', { pacienteId: 'abc' }, 'pacienteId'],
    ['local fora do enum', { local: 'lua' }, 'local'],
    ['produto indicado malformado', { produtoIndicado: { codigo: 'x', sexo: 'outro', french: -1 } }, 'produtoIndicado'],
    ['campo desconhecido', { enfermeiroId: 'x' }, 'enfermeiroId'],
  ])('%s: recusado', async (_nome, over, campo) => {
    expect(await errosCriar(over)).toContain(campo);
  });

  it('a edição não troca o paciente da ficha', async () => {
    const erros = (await validate(plainToInstance(UpdateAvaliacaoIUDto, { pacienteId: PACIENTE_ID }), opcoes)).map((e) => e.property);
    expect(erros).toContain('pacienteId');
  });
});
