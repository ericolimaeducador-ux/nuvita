import { REDIS_OPTIONS } from './redis.provider';

// Timeouts curtos e explícitos: o Redis lento não pode segurar a requisição por dezenas de segundos.
describe('REDIS_OPTIONS', () => {
  it('connectTimeout e commandTimeout explícitos e curtos', () => {
    expect(REDIS_OPTIONS.connectTimeout).toBe(5_000);
    expect(REDIS_OPTIONS.commandTimeout).toBe(2_000);
    expect(REDIS_OPTIONS.maxRetriesPerRequest).toBe(2);
    expect(REDIS_OPTIONS.lazyConnect).toBe(false);
  });
  it('retryStrategy: backoff limitado (teto de 1 s) e NUNCA desiste (devolver null deixaria o cliente morto até reiniciar)', () => {
    const retry = REDIS_OPTIONS.retryStrategy as (times: number) => number | null;
    expect(retry(1)).toBe(100);
    expect(retry(5)).toBe(500);
    for (const n of [10, 100, 10_000]) expect(retry(n)).toBe(1_000);
  });
});
