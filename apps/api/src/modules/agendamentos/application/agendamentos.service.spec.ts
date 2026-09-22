import { Logger } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { ModalidadeAtendimento } from '../../../../../../packages/shared/src/atendimento';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CanalNotificacao, TipoNotificacao } from '../../notificacoes/domain/notificacao.entity';
import { StatusAgendamento, TipoAgendamento } from '../domain/agendamento.entity';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';
import { AgendamentosService } from './agendamentos.service';

const dto: CreateAgendamentoDto = {
  clinicaId: 'cli-1',
  pacienteId: 'pac-1',
  medicoId: 'med-1',
  modalidade: ModalidadeAtendimento.PSICOLOGIA,
  dataHoraInicio: '2026-09-15T14:00:00.000Z',
  dataHoraFim: '2026-09-15T15:00:00.000Z',
  tipo: TipoAgendamento.SESSAO_PSICOTERAPIA,
};

const agendamentoCriado = {
  id: 'ag-1',
  clinicaId: 'cli-1',
  pacienteId: 'pac-1',
  medicoId: 'med-1',
  modalidade: ModalidadeAtendimento.PSICOLOGIA,
  dataHoraInicio: new Date(dto.dataHoraInicio),
  dataHoraFim: new Date(dto.dataHoraFim),
  tipo: TipoAgendamento.SESSAO_PSICOTERAPIA,
  status: StatusAgendamento.AGENDADO,
  criadoPor: 'user-1',
  criadoEm: new Date(),
};

const ctx = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'user-1', email: 'secretaria@clinica.test', papel: Papel.SECRETARIA, clinicaId: 'cli-1', jti: 'j1', typ: 'access' as const },
};

// Fase única: fecha o gap de wiring de Categoria A (confirmacao_agendamento).
// Modelo de chamada: NotificacoesService.create() (método público — opt-out
// check, template, enfileira no BullMQ), não NotificacoesService.notificarElegibilidade()
// (que grava direto no repositório e nunca enfileira, logo nunca envia).
//
// Fase seguinte (fix/nome-medico-confirmacao-agendamento): resolve o nome do
// médico via USER_REPOSITORY (mesmo padrão já usado em ClinicasModule —
// import direto de UserMongoRepository/UserSchema, token local), pra
// preencher o campo `medico` do template, hoje sempre vazio.
function makeService(overrides: {
  agendamentos?: Record<string, jest.Mock>;
  auditLogs?: Record<string, jest.Mock>;
  pacientesService?: Record<string, jest.Mock>;
  notificacoesService?: Record<string, jest.Mock>;
  users?: Record<string, jest.Mock>;
} = {}) {
  const agendamentos = {
    create: jest.fn().mockResolvedValue(agendamentoCriado),
    ...overrides.agendamentos,
  };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined), ...overrides.auditLogs };
  const pacientesService = {
    resumoPorIds: jest.fn().mockResolvedValue(
      new Map([['pac-1', { nome: 'Paciente Teste', cpf: '11122233344', email: 'paciente@teste.com', nomeDestinatario: 'Paciente Teste', ehResponsavel: false }]]),
    ),
    ...overrides.pacientesService,
  };
  const notificacoesService = {
    create: jest.fn().mockResolvedValue(undefined),
    ...overrides.notificacoesService,
  };
  const users = {
    findById: jest.fn().mockResolvedValue({ id: 'med-1', nome: 'Dra. Ana Silva' }),
    ...overrides.users,
  };

  // 5 argumentos — a assinatura alvo, com USER_REPOSITORY injetado. Contra o
  // construtor atual (4 argumentos) isto é um erro de tipo/aridade: é o Red
  // esperado para uma mudança que introduz uma nova dependência de construtor,
  // não uma falha de asserção em runtime.
  const service = new AgendamentosService(
    agendamentos as never,
    auditLogs as never,
    pacientesService as never,
    notificacoesService as never,
    users as never,
  );

  return { service, agendamentos, auditLogs, pacientesService, notificacoesService, users };
}

describe('AgendamentosService.create — wiring de confirmacao_agendamento (Categoria A)', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('cria o agendamento e audita APPOINTMENT_CREATED (comportamento já existente, não deve regredir)', async () => {
    const { service, auditLogs } = makeService();

    const resultado = await service.create(dto, ctx);

    expect(resultado.id).toBe('ag-1');
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ event: AuditEvent.APPOINTMENT_CREATED }),
    );
  });

  it('aciona NotificacoesService.create() com os dados de confirmacao_agendamento', async () => {
    const { service, notificacoesService } = makeService();

    await service.create(dto, ctx);

    expect(notificacoesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicaId: 'cli-1',
        destinatarioId: 'pac-1',
        tipo: TipoNotificacao.CONFIRMACAO_AGENDAMENTO,
        canal: CanalNotificacao.EMAIL,
        email: 'paciente@teste.com',
        nome: 'Paciente Teste',
      }),
      ctx,
    );
  });

  it('paciente menor com responsável legal cadastrado → notifica o responsável, não o paciente (Fase 2: responsável legal)', async () => {
    const { service, notificacoesService } = makeService({
      pacientesService: {
        resumoPorIds: jest.fn().mockResolvedValue(
          new Map([['pac-1', {
            nome: 'Joaquinzinho',
            cpf: '11122233344',
            email: 'mae@teste.com',
            nomeDestinatario: 'Maria (mãe)',
            ehResponsavel: true,
          }]]),
        ),
      },
    });

    await service.create(dto, ctx);

    // Payload da notificação de confirmação de agendamento aponta pro contato do
    // responsável, não do paciente — sem gastar cota de e-mail real (NotificacoesService é mock).
    expect(notificacoesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: TipoNotificacao.CONFIRMACAO_AGENDAMENTO,
        canal: CanalNotificacao.EMAIL,
        email: 'mae@teste.com',
        nome: 'Maria (mãe)',
        nomePaciente: 'Joaquinzinho',
        paraResponsavel: true,
      }),
      ctx,
    );
  });

  it('paciente sem e-mail cadastrado → não aciona NotificacoesService, mas o agendamento é criado normalmente', async () => {
    const { service, notificacoesService, agendamentos } = makeService({
      pacientesService: {
        resumoPorIds: jest.fn().mockResolvedValue(
          new Map([['pac-1', { nome: 'Paciente Sem Email', cpf: '11122233344' }]]),
        ),
      },
    });

    const resultado = await service.create(dto, ctx);

    expect(resultado.id).toBe('ag-1');
    expect(agendamentos.create).toHaveBeenCalled();
    expect(notificacoesService.create).not.toHaveBeenCalled();
  });

  it('falha em NotificacoesService.create() não derruba a criação do agendamento (notificação é efeito colateral, não crítico), e loga o evento estruturado notification_trigger_failed', async () => {
    const { service, notificacoesService } = makeService({
      notificacoesService: { create: jest.fn().mockRejectedValue(new Error('falha no envio')) },
    });

    const resultado = await service.create(dto, ctx);

    expect(resultado.id).toBe('ag-1');
    expect(notificacoesService.create).toHaveBeenCalled();

    // Fail-closed com visibilidade (mesmo padrão de feature-ai-usage-audit-trail):
    // uma falha não crítica nunca é engolida em silêncio total.
    expect(warnSpy).toHaveBeenCalled();
    const payload = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      level: 'warn',
      event: 'notification_trigger_failed',
      tipo: TipoNotificacao.CONFIRMACAO_AGENDAMENTO,
      clinicaId: 'cli-1',
      agendamentoId: 'ag-1',
      erro: 'falha no envio',
    });
  });

  it('resolve o nome do médico via USER_REPOSITORY.findById() e inclui no campo medico do template (hoje o campo fica sempre vazio)', async () => {
    const { service, notificacoesService, users } = makeService();

    await service.create(dto, ctx);

    expect(users.findById).toHaveBeenCalledWith('med-1');
    expect(notificacoesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ medico: 'Dra. Ana Silva' }),
      ctx,
    );
  });

  it('médico não encontrado (medicoId inválido/removido) → campo medico fica vazio, mas não bloqueia o agendamento nem a notificação', async () => {
    const { service, notificacoesService } = makeService({
      users: { findById: jest.fn().mockResolvedValue(null) },
    });

    const resultado = await service.create(dto, ctx);

    expect(resultado.id).toBe('ag-1');
    expect(notificacoesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ medico: undefined }),
      ctx,
    );
  });

  it('falha ao buscar o nome do médico não bloqueia o agendamento nem a notificação, e loga o evento estruturado notification_data_enrichment_failed', async () => {
    const { service, notificacoesService } = makeService({
      users: { findById: jest.fn().mockRejectedValue(new Error('mongo down')) },
    });

    const resultado = await service.create(dto, ctx);

    expect(resultado.id).toBe('ag-1');
    expect(notificacoesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ medico: undefined }),
      ctx,
    );

    const chamada = warnSpy.mock.calls.find((call) =>
      (call[0] as string).includes('notification_data_enrichment_failed'),
    );
    expect(chamada).toBeDefined();
    const payload = JSON.parse(chamada![0] as string);
    expect(payload).toMatchObject({
      level: 'warn',
      event: 'notification_data_enrichment_failed',
      campo: 'medico',
      medicoId: 'med-1',
      erro: 'mongo down',
    });
  });
});
