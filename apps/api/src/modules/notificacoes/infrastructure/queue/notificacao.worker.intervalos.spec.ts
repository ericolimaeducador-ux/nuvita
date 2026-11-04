import { NotificacaoWorker } from './notificacao.worker';
import {
  DRAIN_DELAY_PADRAO_S,
  STALLED_INTERVAL_PADRAO_MS,
  resolverOpcoesPolling,
} from './notificacao.worker.opcoes';

const workerCtor = jest.fn();
jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation((...args: unknown[]) => {
    workerCtor(...args);
    return { close: jest.fn() };
  }),
}));
jest.mock('ioredis', () => ({ __esModule: true, default: jest.fn().mockImplementation(() => ({})) }));

// Redis ocioso (Upstash cobra por comando): o worker espera 60 s com a fila vazia e checa travados a cada 60 s.
// Um job novo acorda o worker na hora (marker do BullMQ), então o intervalo não atrasa envios.

describe('padrões do polling do worker de notificações', () => {
  it('constantes: drainDelay 60 s e stalledInterval 60000 ms', () => {
    expect(DRAIN_DELAY_PADRAO_S).toBe(60);
    expect(STALLED_INTERVAL_PADRAO_MS).toBe(60_000);
  });

  it('sem nenhuma variável de ambiente, vale o padrão', () => {
    expect(resolverOpcoesPolling({})).toEqual({ drainDelay: 60, stalledInterval: 60_000 });
  });

  it('variáveis opcionais sobrescrevem o padrão', () => {
    expect(
      resolverOpcoesPolling({ NOTIFICACAO_WORKER_DRAIN_DELAY_S: '120', NOTIFICACAO_WORKER_STALLED_INTERVAL_MS: '90000' }),
    ).toEqual({ drainDelay: 120, stalledInterval: 90_000 });
  });

  it.each(['abc', '', '0', '-5', '1.5', '601', 'NaN', ' '])('drainDelay inválido (%j) cai no padrão', (valor) => {
    expect(resolverOpcoesPolling({ NOTIFICACAO_WORKER_DRAIN_DELAY_S: valor }).drainDelay).toBe(60);
  });

  it.each(['abc', '', '0', '-1', '29999', '600001', '60000.5'])('stalledInterval inválido (%j) cai no padrão', (valor) => {
    expect(resolverOpcoesPolling({ NOTIFICACAO_WORKER_STALLED_INTERVAL_MS: valor }).stalledInterval).toBe(60_000);
  });
});

// Comportamento aceito: espaços ao redor de um número válido são removidos (trim) e o valor vale; não é erro.
describe('valores com espaços ao redor', () => {
  it('"  60  " para drainDelay vale 60 (trim)', () => {
    expect(resolverOpcoesPolling({ NOTIFICACAO_WORKER_DRAIN_DELAY_S: '  60  ' }).drainDelay).toBe(60);
  });

  it('"  120  " para drainDelay vale 120 (trim)', () => {
    expect(resolverOpcoesPolling({ NOTIFICACAO_WORKER_DRAIN_DELAY_S: '  120  ' }).drainDelay).toBe(120);
  });

  it('"  60000  " para stalledInterval vale 60000 (trim)', () => {
    expect(resolverOpcoesPolling({ NOTIFICACAO_WORKER_STALLED_INTERVAL_MS: '  60000  ' }).stalledInterval).toBe(60_000);
  });

  it('"  90000  " para stalledInterval vale 90000 (trim)', () => {
    expect(resolverOpcoesPolling({ NOTIFICACAO_WORKER_STALLED_INTERVAL_MS: '  90000  ' }).stalledInterval).toBe(90_000);
  });

  it('só espaços cai no padrão nos dois campos', () => {
    expect(
      resolverOpcoesPolling({ NOTIFICACAO_WORKER_DRAIN_DELAY_S: '   ', NOTIFICACAO_WORKER_STALLED_INTERVAL_MS: '   ' }),
    ).toEqual({ drainDelay: 60, stalledInterval: 60_000 });
  });

  it('espaços ao redor de valor fora da faixa continuam caindo no padrão', () => {
    expect(
      resolverOpcoesPolling({ NOTIFICACAO_WORKER_DRAIN_DELAY_S: ' 601 ', NOTIFICACAO_WORKER_STALLED_INTERVAL_MS: ' 29999 ' }),
    ).toEqual({ drainDelay: 60, stalledInterval: 60_000 });
  });
});

describe('NotificacaoWorker — opções passadas ao BullMQ Worker', () => {
  const criar = () =>
    new NotificacaoWorker(
      { getConfig: () => ({ redisUrl: 'redis://x' }) } as never,
      {} as never,
      {} as never,
      {} as never,
    );

  beforeEach(() => {
    workerCtor.mockClear();
    delete process.env.NOTIFICACAO_WORKER_DRAIN_DELAY_S;
    delete process.env.NOTIFICACAO_WORKER_STALLED_INTERVAL_MS;
  });

  it('cria o Worker com drainDelay 60 e stalledInterval 60000 sem nenhuma variável nova', () => {
    criar().onModuleInit();

    const opcoes = workerCtor.mock.calls[0][2];
    expect(opcoes.drainDelay).toBe(60);
    expect(opcoes.stalledInterval).toBe(60_000);
  });

  it('override por variável de ambiente chega ao Worker', () => {
    process.env.NOTIFICACAO_WORKER_DRAIN_DELAY_S = '120';

    criar().onModuleInit();

    expect(workerCtor.mock.calls[0][2].drainDelay).toBe(120);
    expect(workerCtor.mock.calls[0][2].stalledInterval).toBe(60_000);
  });

  it('valor inválido na variável cai no padrão', () => {
    process.env.NOTIFICACAO_WORKER_DRAIN_DELAY_S = 'abc';

    criar().onModuleInit();

    expect(workerCtor.mock.calls[0][2].drainDelay).toBe(60);
  });
});
