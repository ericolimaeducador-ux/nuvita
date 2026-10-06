import { Logger } from '@nestjs/common';
import { LoginRateLimiterService } from './login-rate-limiter.service';

/**
 * Teste de CARACTERIZAÇÃO: documenta o que o limitador faz HOJE com o Redis fora
 * do ar. Hoje é FAIL-OPEN: o login segue sem o limite e nenhum método propaga o
 * erro do Redis (já houve ETIMEDOUT/EPIPE em produção). Este teste NÃO decide se
 * fail-open é a política desejada; se a política mudar, ele deve mudar junto.
 */
function makeRedisForaDoAr() {
  const erro = () => Promise.reject(new Error('connect ETIMEDOUT'));
  return { get: jest.fn(erro), incr: jest.fn(erro), expire: jest.fn(erro), del: jest.fn(erro) };
}

const IP = '203.0.113.7';
const EMAIL = 'vitima@clinica.test';

describe('LoginRateLimiterService — Redis fora do ar (comportamento atual: fail-open)', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('assertAllowed não bloqueia nem lança quando o Redis falha (fail-open) e registra um aviso', async () => {
    const redis = makeRedisForaDoAr();
    const limiter = new LoginRateLimiterService(redis as never);

    await expect(limiter.assertAllowed(IP, EMAIL)).resolves.toBeUndefined();
    expect(redis.get).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('fail-open'));
  });

  it('muitas tentativas seguidas com o Redis fora do ar nunca são bloqueadas (sem limite efetivo)', async () => {
    const limiter = new LoginRateLimiterService(makeRedisForaDoAr() as never);

    for (let i = 0; i < 20; i++) {
      await limiter.recordFailure(IP, EMAIL);
      await expect(limiter.assertAllowed(IP, EMAIL)).resolves.toBeUndefined();
    }
  });

  it('recordFailure e clear engolem o erro do Redis (não propagam)', async () => {
    const limiter = new LoginRateLimiterService(makeRedisForaDoAr() as never);

    await expect(limiter.recordFailure(IP, EMAIL)).resolves.toBeUndefined();
    await expect(limiter.clear(IP, EMAIL)).resolves.toBeUndefined();
  });
});
