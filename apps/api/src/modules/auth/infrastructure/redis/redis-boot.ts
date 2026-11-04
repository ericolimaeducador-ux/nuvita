import Redis from 'ioredis';

/**
 * A API só começa a atender depois de o Redis conectar: a revogação de token (fail-closed) roda em toda requisição
 * autenticada, então uma revisão nova que ouvisse a porta antes receberia tráfego sem conseguir servi-lo.
 * Se não conectar no prazo, rejeita: o boot falha, a revisão nunca fica pronta e o Cloud Run não manda tráfego a ela.
 */
export function aguardarRedisPronto(redis: Pick<Redis, 'status' | 'once' | 'off'>, timeoutMs: number): Promise<void> {
  if (redis.status === 'ready') return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const aoFicarPronto = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      redis.off('ready', aoFicarPronto);
      reject(new Error(`Redis não ficou pronto em ${timeoutMs} ms (status: ${redis.status}).`));
    }, timeoutMs);
    redis.once('ready', aoFicarPronto);
  });
}
