import { ConflictException, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { AppConfigService } from '../../../common/security/config.service';
import { DecisaoUsoIA, TipoUsoIA } from '../domain/registro-uso-ia.enum';
import { AnthropicClient } from '../infrastructure/anthropic.client';
import { IaUsoCryptoService } from '../infrastructure/crypto/ia-uso-crypto.service';
import { DecisaoUsoIaRepository } from './ports/decisao-uso-ia.repository';
import { RegistroUsoIaRepository } from './ports/registro-uso-ia.repository';
import { SugerirAbordagemDto } from './dto/sugerir-abordagem.dto';
import { GerarPrescricaoDto } from './dto/gerar-prescricao.dto';
import { IaClinicaService } from './ia-clinica.service';

const context = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: {
    sub: 'psi-1',
    email: 'psi@nuvita.test',
    papel: Papel.ENFERMEIRO,
    clinicaId: 'clinica-1',
    jti: 'jti',
    typ: 'access' as const,
  },
};

function makeService(overrides: {
  registros?: Partial<RegistroUsoIaRepository>;
  decisoes?: Partial<DecisaoUsoIaRepository>;
  auditLogs?: Partial<AuditLogRepository>;
} = {}) {
  const anthropic = {
    gerarTexto: jest.fn().mockResolvedValue('SUGESTAO DA IA'),
  } as unknown as AnthropicClient;

  const crypto = {
    encrypt: jest.fn((texto: string) => ({ cifrado: `cif:${texto.length}`, iv: 'iv', authTag: 'tag' })),
  } as unknown as IaUsoCryptoService;

  const registros = {
    create: jest.fn().mockResolvedValue({ id: 'registro-1' }),
    findByIdAndClinica: jest.fn(),
    ...overrides.registros,
  } as unknown as RegistroUsoIaRepository;

  const decisoes = {
    create: jest.fn().mockResolvedValue({
      id: 'decisao-1',
      registroUsoIaId: 'registro-1',
      usuarioId: 'psi-1',
      decisao: DecisaoUsoIA.ACEITA,
      decididoEm: new Date('2026-09-06T12:00:00.000Z'),
    }),
    existsForRegistro: jest.fn().mockResolvedValue(false),
    ...overrides.decisoes,
  } as unknown as DecisaoUsoIaRepository;

  const auditLogs = {
    create: jest.fn().mockResolvedValue(undefined),
    ...overrides.auditLogs,
  } as unknown as AuditLogRepository;

  const configService = {
    getConfig: () => ({ anthropicModel: 'claude-sonnet-5' }),
  } as unknown as AppConfigService;

  const service = new IaClinicaService(anthropic, crypto, registros, decisoes, auditLogs, configService);
  return { service, anthropic, crypto, registros, decisoes, auditLogs };
}

describe('IaClinicaService — trilha de uso de IA', () => {
  it('sugerirAbordagem cifra input e output, persiste um RegistroUsoIa e devolve o id', async () => {
    const { service, crypto, registros } = makeService();
    const dto: SugerirAbordagemDto = { motivoAtendimento: 'ansiedade' };

    const out = await service.sugerirAbordagem(dto, context);

    expect(out).toEqual({ sugestao: 'SUGESTAO DA IA', registroUsoIaId: 'registro-1' });
    expect(crypto.encrypt).toHaveBeenCalledWith(JSON.stringify(dto));
    expect(crypto.encrypt).toHaveBeenCalledWith('SUGESTAO DA IA');
    expect(registros.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicaId: 'clinica-1',
        usuarioId: 'psi-1',
        tipo: TipoUsoIA.SUGESTAO_ABORDAGEM,
        modelo: 'claude-sonnet-5',
        inputCifrado: expect.any(String),
        inputIv: expect.any(String),
        inputAuthTag: expect.any(String),
        outputCifrado: expect.any(String),
        outputIv: expect.any(String),
        outputAuthTag: expect.any(String),
      }),
    );
  });

  it('gerarPrescricao persiste com tipo PRESCRICAO_CUIDADOS e devolve prescricao + id', async () => {
    const { service, registros } = makeService();
    const dto: GerarPrescricaoDto = { contextoClinico: 'x' };

    const out = await service.gerarPrescricao(dto, context);

    expect(out).toEqual({ prescricao: 'SUGESTAO DA IA', registroUsoIaId: 'registro-1' });
    expect(registros.create).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: TipoUsoIA.PRESCRICAO_CUIDADOS }),
    );
  });

  it('grava AI_SUGGESTION_GENERATED no audit log com tipo e registroUsoIaId', async () => {
    const { service, auditLogs } = makeService();

    await service.sugerirAbordagem({ motivoAtendimento: 'ansiedade' }, context);

    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.AI_SUGGESTION_GENERATED,
        userId: 'psi-1',
        ip: '127.0.0.1',
        userAgent: 'jest',
        metadata: {
          clinicaId: 'clinica-1',
          tipo: TipoUsoIA.SUGESTAO_ABORDAGEM,
          registroUsoIaId: 'registro-1',
        },
      }),
    );
  });

  it('fail-closed: se a persistência do registro falha, não devolve a sugestão', async () => {
    const { service } = makeService({
      registros: { create: jest.fn().mockRejectedValue(new Error('mongo down')) },
    });

    await expect(
      service.sugerirAbordagem({ motivoAtendimento: 'ansiedade' }, context),
    ).rejects.toThrow('mongo down');
  });

  it('fail-closed: se o audit log falha, não devolve a sugestão', async () => {
    const { service } = makeService({
      auditLogs: { create: jest.fn().mockRejectedValue(new Error('audit down')) },
    });

    await expect(
      service.sugerirAbordagem({ motivoAtendimento: 'ansiedade' }, context),
    ).rejects.toThrow('audit down');
  });

  it('sem clinicaId no contexto: lança e não chama a IA nem persiste registro', async () => {
    const { service, anthropic, registros } = makeService();
    const semClinica = { ...context, user: { ...context.user, clinicaId: undefined } };

    await expect(
      service.sugerirAbordagem({ motivoAtendimento: 'ansiedade' }, semClinica),
    ).rejects.toThrow();

    expect(anthropic.gerarTexto).not.toHaveBeenCalled();
    expect(registros.create).not.toHaveBeenCalled();
  });
});

describe('IaClinicaService — registro de decisão de uso de IA', () => {
  const registro = {
    id: 'registro-1',
    clinicaId: 'clinica-1',
    usuarioId: 'psi-1',
    tipo: TipoUsoIA.SUGESTAO_ABORDAGEM,
    modelo: 'claude-sonnet-5',
    inputCifrado: 'x',
    inputIv: 'x',
    inputAuthTag: 'x',
    outputCifrado: 'x',
    outputIv: 'x',
    outputAuthTag: 'x',
    criadoEm: new Date('2026-09-06T10:00:00.000Z'),
  };

  it('registra a decisão do mesmo usuário que gerou e grava o audit log', async () => {
    const { service, decisoes, auditLogs } = makeService({
      registros: { findByIdAndClinica: jest.fn().mockResolvedValue(registro) },
    });

    await service.registrarDecisao('registro-1', DecisaoUsoIA.ACEITA, context);

    expect(decisoes.create).toHaveBeenCalledWith({
      registroUsoIaId: 'registro-1',
      usuarioId: 'psi-1',
      clinicaId: 'clinica-1',
      decisao: DecisaoUsoIA.ACEITA,
    });
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.AI_SUGGESTION_DECISION_RECORDED,
        userId: 'psi-1',
        ip: '127.0.0.1',
        userAgent: 'jest',
        metadata: {
          clinicaId: 'clinica-1',
          registroUsoIaId: 'registro-1',
          decisao: DecisaoUsoIA.ACEITA,
        },
      }),
    );
  });

  it('registro inexistente (ou de outra clínica) → NotFoundException, não cria decisão', async () => {
    const { service, decisoes } = makeService({
      registros: { findByIdAndClinica: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      service.registrarDecisao('nao-existe', DecisaoUsoIA.ACEITA, context),
    ).rejects.toThrow(NotFoundException);
    expect(decisoes.create).not.toHaveBeenCalled();
  });

  it('decisão por usuário diferente do que gerou → ForbiddenException, não cria decisão', async () => {
    const { service, decisoes } = makeService({
      registros: {
        findByIdAndClinica: jest.fn().mockResolvedValue({ ...registro, usuarioId: 'outro-psi' }),
      },
    });

    await expect(
      service.registrarDecisao('registro-1', DecisaoUsoIA.ACEITA, context),
    ).rejects.toThrow(ForbiddenException);
    expect(decisoes.create).not.toHaveBeenCalled();
  });

  it('já existe decisão para o registro → ConflictException, não cria outra', async () => {
    const { service, decisoes } = makeService({
      registros: { findByIdAndClinica: jest.fn().mockResolvedValue(registro) },
      decisoes: { existsForRegistro: jest.fn().mockResolvedValue(true) },
    });

    await expect(
      service.registrarDecisao('registro-1', DecisaoUsoIA.ACEITA, context),
    ).rejects.toThrow(ConflictException);
    expect(decisoes.create).not.toHaveBeenCalled();
  });

  it('corrida no índice único: create lança duplicate key → ConflictException', async () => {
    const err = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    const { service } = makeService({
      registros: { findByIdAndClinica: jest.fn().mockResolvedValue(registro) },
      decisoes: {
        existsForRegistro: jest.fn().mockResolvedValue(false),
        create: jest.fn().mockRejectedValue(err),
      },
    });

    await expect(
      service.registrarDecisao('registro-1', DecisaoUsoIA.ACEITA, context),
    ).rejects.toThrow(ConflictException);
  });

  it('sem clinicaId no contexto → lança e não toca em nada', async () => {
    const { service, registros, decisoes } = makeService();
    const semClinica = { ...context, user: { ...context.user, clinicaId: undefined } };

    await expect(
      service.registrarDecisao('registro-1', DecisaoUsoIA.ACEITA, semClinica),
    ).rejects.toThrow();
    expect(registros.findByIdAndClinica).not.toHaveBeenCalled();
    expect(decisoes.create).not.toHaveBeenCalled();
  });
});

describe('IaClinicaService — observabilidade (Fase 10)', () => {
  const registro = {
    id: 'registro-1',
    clinicaId: 'clinica-1',
    usuarioId: 'psi-1',
    tipo: TipoUsoIA.SUGESTAO_ABORDAGEM,
    modelo: 'claude-sonnet-5',
    inputCifrado: 'x',
    inputIv: 'x',
    inputAuthTag: 'x',
    outputCifrado: 'x',
    outputIv: 'x',
    outputAuthTag: 'x',
    criadoEm: new Date('2026-09-06T10:00:00.000Z'),
  };

  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('fail-closed: loga evento estruturado ai_usage_persist_failure quando a persistência do registro falha', async () => {
    const { service } = makeService({
      registros: { create: jest.fn().mockRejectedValue(new Error('mongo down')) },
    });

    await expect(
      service.sugerirAbordagem({ motivoAtendimento: 'ansiedade' }, context),
    ).rejects.toThrow('mongo down');

    expect(errorSpy).toHaveBeenCalled();
    const payload = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      level: 'error',
      event: 'ai_usage_persist_failure',
      stage: 'persist_registro',
      clinicaId: 'clinica-1',
      usuarioId: 'psi-1',
    });
  });

  it('fail-closed: loga ai_usage_persist_failure com stage audit_log quando o audit log da geração falha', async () => {
    const { service } = makeService({
      auditLogs: { create: jest.fn().mockRejectedValue(new Error('audit down')) },
    });

    await expect(
      service.sugerirAbordagem({ motivoAtendimento: 'ansiedade' }, context),
    ).rejects.toThrow('audit down');

    expect(errorSpy).toHaveBeenCalled();
    const payload = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      level: 'error',
      event: 'ai_usage_persist_failure',
      stage: 'audit_log',
    });
  });

  const casosDecisaoRejeitada: Array<{
    caso: string;
    status: number;
    overrides: Parameters<typeof makeService>[0];
  }> = [
    {
      caso: 'registro inexistente → 404',
      status: 404,
      overrides: { registros: { findByIdAndClinica: jest.fn().mockResolvedValue(null) } },
    },
    {
      caso: 'usuário diferente do gerador → 403',
      status: 403,
      overrides: {
        registros: {
          findByIdAndClinica: jest.fn().mockResolvedValue({ ...registro, usuarioId: 'outro-psi' }),
        },
      },
    },
    {
      caso: 'decisão já registrada → 409',
      status: 409,
      overrides: {
        registros: { findByIdAndClinica: jest.fn().mockResolvedValue(registro) },
        decisoes: { existsForRegistro: jest.fn().mockResolvedValue(true) },
      },
    },
  ];

  it.each(casosDecisaoRejeitada)(
    'decisão rejeitada ($caso) loga ai_decision_endpoint_error com o status',
    async ({ status, overrides }) => {
      const { service } = makeService(overrides);

      await expect(
        service.registrarDecisao('registro-1', DecisaoUsoIA.ACEITA, context),
      ).rejects.toThrow();

      expect(warnSpy).toHaveBeenCalled();
      const payload = JSON.parse(warnSpy.mock.calls[0][0] as string);
      expect(payload).toMatchObject({
        level: 'warn',
        event: 'ai_decision_endpoint_error',
        status,
        registroUsoIaId: 'registro-1',
        clinicaId: 'clinica-1',
        usuarioId: 'psi-1',
      });
    },
  );

  it('corrida no índice único (E11000) também loga ai_decision_endpoint_error status 409', async () => {
    const err = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    const { service } = makeService({
      registros: { findByIdAndClinica: jest.fn().mockResolvedValue(registro) },
      decisoes: {
        existsForRegistro: jest.fn().mockResolvedValue(false),
        create: jest.fn().mockRejectedValue(err),
      },
    });

    await expect(
      service.registrarDecisao('registro-1', DecisaoUsoIA.ACEITA, context),
    ).rejects.toThrow(ConflictException);

    expect(warnSpy).toHaveBeenCalled();
    const payload = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({ event: 'ai_decision_endpoint_error', status: 409 });
  });

  it('decisão bem-sucedida não emite evento de erro/observabilidade de falha', async () => {
    const { service } = makeService({
      registros: { findByIdAndClinica: jest.fn().mockResolvedValue(registro) },
    });

    await service.registrarDecisao('registro-1', DecisaoUsoIA.ACEITA, context);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
