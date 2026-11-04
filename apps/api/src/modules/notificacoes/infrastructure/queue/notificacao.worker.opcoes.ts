/**
 * Polling do worker de notificações. O Upstash cobra por comando: com os padrões do BullMQ (drainDelay 5 s,
 * stalledInterval 30 s) cada instância ligada gera dezenas de milhares de comandos por dia mesmo sem nenhum job.
 * Os padrões abaixo valem SEM variável alguma; as variáveis são opcionais e inválidas caem no padrão.
 */
export const DRAIN_DELAY_PADRAO_S = 60;
export const STALLED_INTERVAL_PADRAO_MS = 60_000;

const DRAIN_DELAY_MAX_S = 600;
// Abaixo do lockDuration do BullMQ (30 s) a checagem de travados ficaria sem sentido; acima de 10 min atrasa demais a recuperação.
const STALLED_INTERVAL_MIN_MS = 30_000;
const STALLED_INTERVAL_MAX_MS = 600_000;

function inteiroNaFaixa(bruto: string | undefined, min: number, max: number, padrao: number): number {
  if (bruto === undefined || !/^\d+$/.test(bruto.trim())) return padrao;
  const valor = Number(bruto.trim());
  return valor >= min && valor <= max ? valor : padrao;
}

export function resolverOpcoesPolling(env: Record<string, string | undefined>): {
  drainDelay: number;
  stalledInterval: number;
} {
  return {
    drainDelay: inteiroNaFaixa(env.NOTIFICACAO_WORKER_DRAIN_DELAY_S, 1, DRAIN_DELAY_MAX_S, DRAIN_DELAY_PADRAO_S),
    stalledInterval: inteiroNaFaixa(
      env.NOTIFICACAO_WORKER_STALLED_INTERVAL_MS,
      STALLED_INTERVAL_MIN_MS,
      STALLED_INTERVAL_MAX_MS,
      STALLED_INTERVAL_PADRAO_MS,
    ),
  };
}
