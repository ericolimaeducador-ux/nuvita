import { calcularJanelaLembrete, deveReceberLembrete, INTERVALO_JOB_MINUTOS } from './lembrete-window';

/**
 * feature-consultation-reminder-scheduler: janela de elegibilidade dos
 * lembretes automáticos. Job roda a cada INTERVALO_JOB_MINUTOS minutos;
 * para a execução em `referencia`, a janela do horizonte de H horas é
 * [referencia + H, referencia + H + INTERVALO_JOB_MINUTOS) — meia-aberta,
 * inclusiva no início, exclusiva no fim. Ver definição completa e
 * justificativa no design doc (docs/harness/features/
 * feature-consultation-reminder-scheduler.md).
 */
const REFERENCIA = new Date('2026-09-16T12:00:00.000Z');
const HORIZONTE_24H_HORAS = 24;

describe('lembrete-window — cálculo da janela', () => {
  it('janela = [referencia + horizonte, referencia + horizonte + intervalo do job)', () => {
    const janela = calcularJanelaLembrete(REFERENCIA, HORIZONTE_24H_HORAS);

    expect(janela.inicio).toEqual(new Date('2026-09-17T12:00:00.000Z'));
    expect(janela.fim).toEqual(new Date('2026-09-17T12:15:00.000Z'));
  });

  it('janelas de execuções consecutivas se encaixam sem gap nem overlap', () => {
    const janelaAtual = calcularJanelaLembrete(REFERENCIA, HORIZONTE_24H_HORAS);
    const proximaReferencia = new Date(REFERENCIA.getTime() + INTERVALO_JOB_MINUTOS * 60 * 1000);
    const proximaJanela = calcularJanelaLembrete(proximaReferencia, HORIZONTE_24H_HORAS);

    expect(proximaJanela.inicio).toEqual(janelaAtual.fim);
  });
});

describe('lembrete-window — quais agendamentos são pegos', () => {
  const janela = calcularJanelaLembrete(REFERENCIA, HORIZONTE_24H_HORAS);

  it('1. consulta exatamente na borda de ENTRADA da janela é pega', () => {
    expect(deveReceberLembrete(janela.inicio, undefined, janela)).toBe(true);
  });

  it('2. consulta exatamente na borda de SAÍDA da janela NÃO é pega (evita double-processing na próxima execução)', () => {
    expect(deveReceberLembrete(janela.fim, undefined, janela)).toBe(false);
  });

  it('3a. consulta ANTES da janela NÃO é pega', () => {
    const antes = new Date(janela.inicio.getTime() - 1);
    expect(deveReceberLembrete(antes, undefined, janela)).toBe(false);
  });

  it('3b. consulta DEPOIS da janela NÃO é pega', () => {
    const depois = new Date(janela.fim.getTime() + 1);
    expect(deveReceberLembrete(depois, undefined, janela)).toBe(false);
  });

  it('4. consulta dentro da janela mas já com o lembrete marcado como enviado NÃO é pega (idempotência é parte da decisão, não checada depois)', () => {
    const dentroDaJanela = new Date(janela.inicio.getTime() + 5 * 60 * 1000);
    const jaEnviadoEm = new Date('2026-09-10T00:00:00.000Z');

    expect(deveReceberLembrete(dentroDaJanela, jaEnviadoEm, janela)).toBe(false);
  });
});
