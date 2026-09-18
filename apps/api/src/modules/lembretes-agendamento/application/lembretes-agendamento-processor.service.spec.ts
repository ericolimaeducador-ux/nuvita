import { CanalNotificacao, TipoNotificacao } from '../../notificacoes/domain/notificacao.entity';
import { ModalidadeAtendimento } from '../../../../../../packages/shared/src/atendimento';
import { StatusAgendamento, TipoAgendamento } from '../../agendamentos/domain/agendamento.entity';
import { calcularJanelaLembrete } from '../../agendamentos/domain/lembrete-window';
import { LembretesAgendamentoProcessorService } from './lembretes-agendamento-processor.service';

/**
 * feature-consultation-reminder-scheduler, fase 4: lógica real do handler
 * de POST /internal/processar-lembretes, substituindo o stub da fase 3.
 *
 * NÃO repete os testes de listarParaLembrete() (agendamento-mongo.repository.
 * lembrete.spec.ts) nem de calcularJanelaLembrete()/deveReceberLembrete()
 * (lembrete-window.spec.ts) — usa esses colaboradores via mock, só prova a
 * ORQUESTRAÇÃO: qual horizonte busca o quê, o que dispara em caso de sucesso/
 * falha, e a contabilização attempted/sent/deduped/failed da seção
 * Monitoring do design doc.
 *
 * CRÍTICO (item 3 do pedido): marcarLembreteEnviado() só pode ser chamado
 * DEPOIS de NotificacoesService.create() ter sucesso — nunca antes, e nunca
 * se create() falhar. Se isso for invertido por engano (marcar antes, ou
 * marcar mesmo com create() falhando), o lembrete nunca mais seria tentado
 * de novo, mesma classe de bug de sinal invertido já vista nesta feature
 * (janela de lembrete, guard OIDC).
 */
const AGORA = new Date('2026-09-18T12:00:00.000Z');

function agendamento(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ag-1',
    clinicaId: 'cli-1',
    pacienteId: 'pac-1',
    medicoId: 'med-1',
    modalidade: ModalidadeAtendimento.PSICOLOGIA,
    dataHoraInicio: new Date('2026-09-19T12:00:00.000Z'),
    dataHoraFim: new Date('2026-09-19T13:00:00.000Z'),
    tipo: TipoAgendamento.SESSAO_PSICOTERAPIA,
    status: StatusAgendamento.AGENDADO,
    criadoPor: 'secretaria-1',
    criadoEm: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makePacientesMap(id: string, nome = 'Fulana', email = 'fulana@nuvita.test') {
  return new Map([[id, { nome, email }]]);
}

function makeService(overrides: {
  agendamentos?: Record<string, jest.Mock>;
  pacientesService?: Record<string, jest.Mock>;
  notificacoesService?: Record<string, jest.Mock>;
  users?: Record<string, jest.Mock>;
} = {}) {
  const agendamentos = {
    listarParaLembrete: jest.fn().mockResolvedValue([]),
    marcarLembreteEnviado: jest.fn().mockResolvedValue(true),
    ...overrides.agendamentos,
  };
  const pacientesService = {
    resumoPorIds: jest.fn().mockResolvedValue(makePacientesMap('pac-1')),
    ...overrides.pacientesService,
  };
  const notificacoesService = {
    create: jest.fn().mockResolvedValue(undefined),
    ...overrides.notificacoesService,
  };
  const users = {
    findById: jest.fn().mockResolvedValue({ id: 'med-1', nome: 'Dr. Fulano' }),
    ...overrides.users,
  };

  const service = new LembretesAgendamentoProcessorService(
    agendamentos as never,
    pacientesService as never,
    notificacoesService as never,
    users as never,
  );

  return { service, agendamentos, pacientesService, notificacoesService, users };
}

describe('LembretesAgendamentoProcessorService.processar()', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(AGORA);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('1. chama listarParaLembrete() com o campo e a janela certos para CADA horizonte (24h e 1h)', async () => {
    const { service, agendamentos } = makeService();

    await service.processar();

    const janela24h = calcularJanelaLembrete(AGORA, 24);
    const janela1h = calcularJanelaLembrete(AGORA, 1);

    expect(agendamentos.listarParaLembrete).toHaveBeenCalledWith('lembrete24hEnviadoEm', janela24h);
    expect(agendamentos.listarParaLembrete).toHaveBeenCalledWith('lembrete1hEnviadoEm', janela1h);
    expect(agendamentos.listarParaLembrete).toHaveBeenCalledTimes(2);
  });

  it('2. chama NotificacoesService.create() com o TIPO certo por horizonte (LEMBRETE_CONSULTA_24H / _1H)', async () => {
    const ag24h = agendamento({ id: 'ag-24h' });
    const ag1h = agendamento({ id: 'ag-1h' });

    const { service, notificacoesService } = makeService({
      agendamentos: {
        listarParaLembrete: jest.fn((campo: string) =>
          Promise.resolve(campo === 'lembrete24hEnviadoEm' ? [ag24h] : [ag1h]),
        ),
        marcarLembreteEnviado: jest.fn().mockResolvedValue(true),
      },
    });

    await service.processar();

    expect(notificacoesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: TipoNotificacao.LEMBRETE_CONSULTA_24H, destinatarioId: 'pac-1', canal: CanalNotificacao.EMAIL }),
      expect.anything(),
    );
    expect(notificacoesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: TipoNotificacao.LEMBRETE_CONSULTA_1H, destinatarioId: 'pac-1', canal: CanalNotificacao.EMAIL }),
      expect.anything(),
    );
  });

  it('3. [CRÍTICO] create() falha → lembrete[X]EnviadoEm NÃO é marcado (permite retry na próxima execução)', async () => {
    const ag = agendamento({ id: 'ag-falha' });

    const { service, agendamentos, notificacoesService } = makeService({
      agendamentos: {
        listarParaLembrete: jest.fn((campo: string) => Promise.resolve(campo === 'lembrete24hEnviadoEm' ? [ag] : [])),
        marcarLembreteEnviado: jest.fn().mockResolvedValue(true),
      },
      notificacoesService: {
        create: jest.fn().mockRejectedValue(new Error('falha ao enfileirar notificacao')),
      },
    });

    const resultado = await service.processar();

    expect(notificacoesService.create).toHaveBeenCalled();
    expect(agendamentos.marcarLembreteEnviado).not.toHaveBeenCalled();
    expect(resultado.failed).toBe(1);
    expect(resultado.sent).toBe(0);
  });

  it('4. contabiliza attempted/sent/deduped/failed corretamente', async () => {
    const agSucesso = agendamento({ id: 'ag-sucesso' });
    const agColisao = agendamento({ id: 'ag-colisao', pacienteId: 'pac-2' });
    const agFalha = agendamento({ id: 'ag-falha', pacienteId: 'pac-3' });

    const { service, pacientesService } = makeService({
      agendamentos: {
        listarParaLembrete: jest
          .fn()
          .mockResolvedValueOnce([agSucesso, agColisao, agFalha])
          .mockResolvedValueOnce([]),
        marcarLembreteEnviado: jest
          .fn()
          .mockImplementation((_clinicaId: string, id: string) => Promise.resolve(id !== 'ag-colisao')),
      },
      notificacoesService: {
        create: jest.fn((dto: { destinatarioId: string }) =>
          dto.destinatarioId === 'pac-3' ? Promise.reject(new Error('falhou')) : Promise.resolve(undefined),
        ),
      },
    });
    pacientesService.resumoPorIds.mockImplementation((_clinicaId: string, ids: string[]) => {
      const map = new Map<string, { nome: string; email: string }>();
      for (const id of ids) map.set(id, { nome: 'Paciente', email: `${id}@nuvita.test` });
      return Promise.resolve(map);
    });

    const resultado = await service.processar();

    expect(resultado).toEqual({ attempted: 3, sent: 1, deduped: 1, failed: 1 });
  });

  it('5. falha em UM agendamento não interrompe o processamento dos demais', async () => {
    const agFalha = agendamento({ id: 'ag-primeiro-falha', pacienteId: 'pac-1' });
    const agOk = agendamento({ id: 'ag-segundo-ok', pacienteId: 'pac-2' });

    const { service, notificacoesService, agendamentos } = makeService({
      agendamentos: {
        listarParaLembrete: jest.fn().mockResolvedValueOnce([agFalha, agOk]).mockResolvedValueOnce([]),
        marcarLembreteEnviado: jest.fn().mockResolvedValue(true),
      },
      notificacoesService: {
        create: jest.fn((dto: { destinatarioId: string }) =>
          dto.destinatarioId === 'pac-1' ? Promise.reject(new Error('falhou')) : Promise.resolve(undefined),
        ),
      },
      pacientesService: {
        resumoPorIds: jest.fn((_clinicaId: string, ids: string[]) => {
          const map = new Map<string, { nome: string; email: string }>();
          for (const id of ids) map.set(id, { nome: 'Paciente', email: `${id}@nuvita.test` });
          return Promise.resolve(map);
        }),
      },
    });

    const resultado = await service.processar();

    // Os dois agendamentos foram tentados apesar do primeiro ter falhado.
    expect(notificacoesService.create).toHaveBeenCalledTimes(2);
    expect(agendamentos.marcarLembreteEnviado).toHaveBeenCalledTimes(1);
    expect(agendamentos.marcarLembreteEnviado).toHaveBeenCalledWith('cli-1', 'ag-segundo-ok', 'lembrete24hEnviadoEm', expect.any(Date));
    expect(resultado).toEqual({ attempted: 2, sent: 1, deduped: 0, failed: 1 });
  });
});
