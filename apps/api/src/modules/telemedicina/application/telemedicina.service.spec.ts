import { Logger } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { ModalidadeAtendimento } from '../../../../../../packages/shared/src/atendimento';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CanalNotificacao, TipoNotificacao } from '../../notificacoes/domain/notificacao.entity';
import { StatusSala } from '../domain/sala-telemedicina.entity';
import { CreateSalaDto } from './dto/create-sala.dto';
import { TelemedicinaService } from './telemedicina.service';

const dto: CreateSalaDto = {
  clinicaId: 'cli-1',
  agendamentoId: 'ag-1',
  pacienteId: 'pac-1',
  modalidade: ModalidadeAtendimento.PSICOLOGIA,
};

const salaCriada = {
  id: 'sala-1',
  clinicaId: 'cli-1',
  agendamentoId: 'ag-1',
  medicoId: 'med-1',
  modalidade: ModalidadeAtendimento.PSICOLOGIA,
  pacienteId: 'pac-1',
  status: StatusSala.AGUARDANDO,
  tokenMedico: 'token-medico-abc',
  tokenPaciente: 'token-paciente-xyz',
  expiresAt: new Date('2026-09-15T18:00:00.000Z'),
  criadoEm: new Date(),
};

const ctx = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'med-1', email: 'medico@clinica.test', papel: Papel.PSICOLOGO, clinicaId: 'cli-1', jti: 'j1', typ: 'access' as const },
};

// Fase única: fecha o gap de wiring de Categoria A (link_teleconsulta). Mesmo
// padrão do ponto 1 (confirmacao_agendamento): NotificacoesService.create()
// (método público — enfileira de verdade), efeito colateral não crítico,
// falha logada via notification_trigger_failed (fail-closed com visibilidade).
function makeService(overrides: {
  salas?: Record<string, jest.Mock>;
  eventos?: Record<string, jest.Mock>;
  sinais?: Record<string, jest.Mock>;
  auditLogs?: Record<string, jest.Mock>;
  pacientesService?: Record<string, jest.Mock>;
  notificacoesService?: Record<string, jest.Mock>;
  configService?: Record<string, jest.Mock>;
} = {}) {
  const salas = {
    create: jest.fn().mockResolvedValue(salaCriada),
    ...overrides.salas,
  };
  const eventos = { ...overrides.eventos };
  const sinais = { ...overrides.sinais };
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
  const configService = {
    getConfig: jest.fn().mockReturnValue({ corsOrigin: ['https://psi.nuvita.app.br'] }),
    ...overrides.configService,
  };

  // 7 argumentos — assinatura alvo, com PacientesService/NotificacoesService/
  // AppConfigService injetados. Contra o construtor atual (4 argumentos) isto
  // é um erro de tipo/aridade: Red esperado para uma mudança que introduz
  // novas dependências de construtor, não uma falha de asserção em runtime.
  const service = new TelemedicinaService(
    salas as never,
    eventos as never,
    sinais as never,
    auditLogs as never,
    pacientesService as never,
    notificacoesService as never,
    configService as never,
  );

  return { service, salas, eventos, sinais, auditLogs, pacientesService, notificacoesService, configService };
}

describe('TelemedicinaService.createSala — wiring de link_teleconsulta (Categoria A)', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('cria a sala e audita TELEMEDICINE_ROOM_CREATED (comportamento já existente, não deve regredir)', async () => {
    const { service, auditLogs } = makeService();

    const resultado = await service.createSala(dto, ctx);

    expect(resultado.id).toBe('sala-1');
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ event: AuditEvent.TELEMEDICINE_ROOM_CREATED }),
    );
  });

  it('aciona NotificacoesService.create() com os dados de link_teleconsulta, incluindo o token do paciente no link', async () => {
    const { service, notificacoesService } = makeService();

    await service.createSala(dto, ctx);

    expect(notificacoesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicaId: 'cli-1',
        destinatarioId: 'pac-1',
        tipo: TipoNotificacao.LINK_TELECONSULTA,
        canal: CanalNotificacao.EMAIL,
        email: 'paciente@teste.com',
        nome: 'Paciente Teste',
        link: 'https://psi.nuvita.app.br/tele/token-paciente-xyz',
      }),
      ctx,
    );
  });

  it('paciente sem e-mail cadastrado → não aciona NotificacoesService, mas a sala é criada normalmente', async () => {
    const { service, notificacoesService, salas } = makeService({
      pacientesService: {
        resumoPorIds: jest.fn().mockResolvedValue(
          new Map([['pac-1', { nome: 'Paciente Sem Email', cpf: '11122233344' }]]),
        ),
      },
    });

    const resultado = await service.createSala(dto, ctx);

    expect(resultado.id).toBe('sala-1');
    expect(salas.create).toHaveBeenCalled();
    expect(notificacoesService.create).not.toHaveBeenCalled();
  });

  it('falha em NotificacoesService.create() não derruba a criação da sala, e loga o evento estruturado notification_trigger_failed', async () => {
    const { service, notificacoesService } = makeService({
      notificacoesService: { create: jest.fn().mockRejectedValue(new Error('falha no envio')) },
    });

    const resultado = await service.createSala(dto, ctx);

    expect(resultado.id).toBe('sala-1');
    expect(notificacoesService.create).toHaveBeenCalled();

    expect(warnSpy).toHaveBeenCalled();
    const payload = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      level: 'warn',
      event: 'notification_trigger_failed',
      tipo: TipoNotificacao.LINK_TELECONSULTA,
      clinicaId: 'cli-1',
      erro: 'falha no envio',
    });
  });
});
