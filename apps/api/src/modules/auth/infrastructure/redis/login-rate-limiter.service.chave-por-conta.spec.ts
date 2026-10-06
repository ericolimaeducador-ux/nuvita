import { HttpException } from '@nestjs/common';
import { LOGIN_RATE_LIMIT_MAX_ATTEMPTS } from '../../auth.constants';
import { LoginRateLimiterService } from './login-rate-limiter.service';

/**
 * NGS1 #3 (contorno por login bem-sucedido): o contador de falhas é por
 * (ip, hash(email)). clear() zera só o par que logou, nunca o IP inteiro.
 *
 * Os métodos hoje recebem só `ip`; o alvo recebe `(ip, email)`. A tipagem abaixo
 * descreve o alvo para o Red falhar por ASSERÇÃO e não por erro de compilação.
 */
interface LimiterPorConta {
  assertAllowed(ip: string, email: string): Promise<void>;
  recordFailure(ip: string, email: string): Promise<void>;
  clear(ip: string, email: string): Promise<void>;
}

/** Redis falso em memória (get / incr / expire / del), sem TTL real. */
function makeRedis() {
  const store = new Map<string, number>();
  return {
    store,
    get: jest.fn(async (key: string) => (store.has(key) ? String(store.get(key)) : null)),
    incr: jest.fn(async (key: string) => {
      store.set(key, (store.get(key) ?? 0) + 1);
      return store.get(key)!;
    }),
    expire: jest.fn(async () => 1),
    del: jest.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
  };
}

function makeLimiter() {
  const redis = makeRedis();
  const limiter = new LoginRateLimiterService(redis as never) as unknown as LimiterPorConta;
  return { limiter, redis };
}

const IP = '203.0.113.7';
const A = 'vitima@clinica.test';
const B = 'atacante@clinica.test';

async function falhar(limiter: LimiterPorConta, ip: string, email: string, vezes: number) {
  for (let i = 0; i < vezes; i++) await limiter.recordFailure(ip, email);
}

describe('LoginRateLimiterService — contador por (ip, conta) (NGS1 #3)', () => {
  it('clear() de uma conta NÃO apaga o contador de outra conta no mesmo IP', async () => {
    const { limiter } = makeLimiter();
    await falhar(limiter, IP, A, LOGIN_RATE_LIMIT_MAX_ATTEMPTS);

    await limiter.clear(IP, B);

    await expect(limiter.assertAllowed(IP, A)).rejects.toBeInstanceOf(HttpException);
  });

  it('contorno: 4 falhas contra A, acerto da própria conta B no mesmo IP, 5ª falha contra A bloqueia', async () => {
    const { limiter } = makeLimiter();
    await falhar(limiter, IP, A, LOGIN_RATE_LIMIT_MAX_ATTEMPTS - 1);

    await limiter.assertAllowed(IP, B);
    await limiter.clear(IP, B); // login bem-sucedido do atacante na própria conta
    await limiter.recordFailure(IP, A); // 5ª falha contra A

    await expect(limiter.assertAllowed(IP, A)).rejects.toBeInstanceOf(HttpException);
  });

  it('falhas de contas diferentes no mesmo IP (NAT) contam em contadores separados', async () => {
    const { limiter } = makeLimiter();

    await falhar(limiter, IP, A, LOGIN_RATE_LIMIT_MAX_ATTEMPTS);

    await expect(limiter.assertAllowed(IP, A)).rejects.toBeInstanceOf(HttpException);
    await expect(limiter.assertAllowed(IP, B)).resolves.toBeUndefined();
  });

  it('o mesmo e-mail em IPs diferentes também conta separado (a chave é o par)', async () => {
    const { limiter } = makeLimiter();

    await falhar(limiter, IP, A, LOGIN_RATE_LIMIT_MAX_ATTEMPTS);

    await expect(limiter.assertAllowed('198.51.100.9', A)).resolves.toBeUndefined();
  });

  it('as chaves no Redis não contêm o e-mail em claro (hash) e normalizam maiúsculas/espaços', async () => {
    const { limiter, redis } = makeLimiter();

    await limiter.recordFailure(IP, '  Vitima@Clinica.Test ');
    await limiter.recordFailure(IP, A);

    const chaves = [...redis.store.keys()];
    expect(chaves).toHaveLength(1); // mesma conta, normalizada
    expect(chaves[0].toLowerCase()).not.toContain('vitima');
    expect(chaves[0]).not.toContain('@');
    expect(redis.store.get(chaves[0])).toBe(2);
  });
});
