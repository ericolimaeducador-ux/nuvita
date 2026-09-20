import { Logger } from '@nestjs/common';
import { ModalidadeAtendimento } from '../../../../../../packages/shared/src/atendimento';
import { StatusAgendamento, TipoAgendamento } from '../../agendamentos/domain/agendamento.entity';
import { LembretesAgendamentoProcessorService } from './lembretes-agendamento-processor.service';

/**
 * feature-consultation-reminder-scheduler, seção Monitoring do design doc:
 * cada execução de processar() emite UM log estruturado `reminder_run_summary`
 * com attempted/sent/deduped/failed — os mesmos 4 contadores devolvidos no
 * corpo HTTP (fonte única, sem recalcular). Sem esse log, o Cloud Logging
 * não guarda os números de nenhuma execução (o Scheduler não registra o
 * corpo da resposta).
 *
 * Arquivo novo: os testes existentes de processar() não são tocados.
 */
const AGORA = new Date('2026-09-18T12:00:00.000Z');

function agendamento(id: string) {
  return {
    id,
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
  };
}

function makeService(overrides: {
  agendamentos?: Record<string, jest.Mock>;
  notificacoesService?: Record<string, jest.Mock>;
} = {}) {
  const agendamentos = {
    listarParaLembrete: jest.fn().mockResolvedValue([]),
    marcarLembreteEnviado: jest.fn().mockResolvedValue(true),
    ...overrides.agendamentos,
  };
  const pacientesService = {
    resumoPorIds: jest.fn().mockResolvedValue(new Map([['pac-1', { nome: 'Fulana', email: 'fulana@nuvita.test' }]])),
  };
  const notificacoesService = {
    create: jest.fn().mockResolvedValue(undefined),
    ...overrides.notificacoesService,
  };
  const users = { findById: jest.fn().mockResolvedValue({ id: 'med-1', nome: 'Dr. Fulano' }) };

  return new LembretesAgendamentoProcessorService(
    agendamentos as never,
    pacientesService as never,
    notificacoesService as never,
    users as never,
  );
}

function resumos(logSpy: jest.SpyInstance): Array<Record<string, unknown>> {
  return logSpy.mock.calls
    .map(([mensagem]) => {
      try {
        return JSON.parse(String(mensagem)) as Record<string, unknown>;
      } catch {
        return undefined;
      }
    })
    .filter((entrada): entrada is Record<string, unknown> => entrada?.event === 'reminder_run_summary');
}

describe('LembretesAgendamentoProcessorService.processar() — log reminder_run_summary', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(AGORA);
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    jest.useRealTimers();
  });

  it('1. execução sem nenhum agendamento devido emite o resumo com os 4 contadores em zero', async () => {
    const service = makeService();

    await service.processar();

    expect(resumos(logSpy)).toEqual([
      { event: 'reminder_run_summary', attempted: 0, sent: 0, deduped: 0, failed: 0 },
    ]);
  });

  it('2. execução com contadores não-zero emite o resumo com exatamente esses valores (1 sent, 1 deduped, 1 failed)', async () => {
    const service = makeService({
      agendamentos: {
        listarParaLembrete: jest.fn((campo: string) =>
          Promise.resolve(campo === 'lembrete24hEnviadoEm' ? [agendamento('ag-a'), agendamento('ag-b')] : [agendamento('ag-c')]),
        ),
        marcarLembreteEnviado: jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
      },
      notificacoesService: {
        create: jest
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('falha no provedor')),
      },
    });

    await service.processar();

    expect(resumos(logSpy)).toEqual([
      { event: 'reminder_run_summary', attempted: 3, sent: 1, deduped: 1, failed: 1 },
    ]);
  });

  it('3. o log é emitido uma única vez por execução e espelha o corpo devolvido (fonte única)', async () => {
    const service = makeService({
      agendamentos: {
        listarParaLembrete: jest.fn((campo: string) =>
          Promise.resolve(campo === 'lembrete1hEnviadoEm' ? [agendamento('ag-1')] : []),
        ),
      },
    });

    const corpo = await service.processar();

    const emitidos = resumos(logSpy);
    expect(emitidos).toHaveLength(1);
    expect(emitidos[0]).toEqual({ event: 'reminder_run_summary', ...corpo });
  });
});
