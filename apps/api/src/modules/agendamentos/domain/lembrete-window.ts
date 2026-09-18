/**
 * Janela de elegibilidade dos lembretes automáticos de consulta
 * (feature-consultation-reminder-scheduler).
 *
 * O job roda a cada INTERVALO_JOB_MINUTOS minutos (Cloud Scheduler). Para o
 * horizonte de H horas, a execução em `referencia` é responsável pela janela
 * meia-aberta [referencia + H, referencia + H + INTERVALO_JOB_MINUTOS) —
 * inclusiva no início, exclusiva no fim.
 *
 * Por quê essa direção: a próxima execução acontece em
 * `referencia + INTERVALO_JOB_MINUTOS`, cuja janela começa em
 * `referencia + H + INTERVALO_JOB_MINUTOS` — exatamente o fim (exclusivo)
 * desta janela. Isso garante tiling perfeito do eixo do tempo: toda consulta
 * cai em exatamente uma janela de execução (sem gap, sem overlap). O
 * desempate na borda (`>=` no início, `<` no fim) segue a mesma convenção de
 * $gte já usada em dataHoraInicio no resto do módulo (list(), listBloqueios()
 * em agendamento-mongo.repository.ts).
 */
export const INTERVALO_JOB_MINUTOS = 15;

export interface JanelaLembrete {
  inicio: Date;
  fim: Date;
}

export function calcularJanelaLembrete(referencia: Date, horizonteHoras: number): JanelaLembrete {
  const horizonteMs = horizonteHoras * 60 * 60 * 1000;
  const intervaloMs = INTERVALO_JOB_MINUTOS * 60 * 1000;
  const inicio = new Date(referencia.getTime() + horizonteMs);
  const fim = new Date(inicio.getTime() + intervaloMs);
  return { inicio, fim };
}

/**
 * Decide se um agendamento deve ser incluído no lembrete desta janela.
 * Idempotência é parte da decisão, não uma checagem posterior: um
 * agendamento já marcado (lembreteEnviadoEm presente) nunca é incluído,
 * mesmo que caia dentro da janela.
 */
export function deveReceberLembrete(dataHoraInicio: Date, lembreteEnviadoEm: Date | undefined, janela: JanelaLembrete): boolean {
  if (lembreteEnviadoEm !== undefined) return false;
  return dataHoraInicio.getTime() >= janela.inicio.getTime() && dataHoraInicio.getTime() < janela.fim.getTime();
}
