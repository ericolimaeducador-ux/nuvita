import { HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';
import { RedisHealthIndicator } from './redis.health';

function redisFalso(ping: () => Promise<string>, status = 'ready'): Redis {
  return { ping, status } as unknown as Redis;
}

describe('RedisHealthIndicator', () => {
  it('reporta saudável quando o PING responde', async () => {
    const indicator = new RedisHealthIndicator(redisFalso(async () => 'PONG'));

    await expect(indicator.isHealthy('redis')).resolves.toEqual({
      redis: { status: 'up', conexao: 'ready' },
    });
  });

  it('não deixa o detalhe da conexão sobrescrever o up/down do terminus', async () => {
    // O ioredis também chama de `status` o estado do socket ('ready', 'end').
    // Se ele entrasse no data com esse nome, apagaria o campo que o terminus
    // usa para dizer se o serviço está de pé — e o /health voltaria a mentir,
    // por outro caminho.
    const indicator = new RedisHealthIndicator(redisFalso(async () => 'PONG'));
    const resultado = await indicator.isHealthy('redis');

    expect(resultado.redis.status).toBe('up');
  });

  it('lança HealthCheckError quando o Redis está fora — o caso que fazia o /health mentir', async () => {
    const indicator = new RedisHealthIndicator(
      redisFalso(async () => {
        throw new Error('ECONNREFUSED');
      }, 'end'),
    );

    await expect(indicator.isHealthy('redis')).rejects.toBeInstanceOf(HealthCheckError);
  });

  it('inclui a causa da falha no resultado', async () => {
    const indicator = new RedisHealthIndicator(
      redisFalso(async () => {
        throw new Error('ECONNREFUSED');
      }, 'end'),
    );

    await indicator.isHealthy('redis').catch((erro: HealthCheckError) => {
      expect(erro.causes).toEqual({
        redis: { status: 'down', message: 'ECONNREFUSED', conexao: 'end' },
      });
    });

    expect.assertions(1);
  });

  it('falha por timeout quando o PING fica pendurado, em vez de travar o health check', async () => {
    // Redis com socket pendurado: a promise nunca resolve. Sem o timeout
    // próprio, o /health ficaria segurando a conexão até o probe estourar.
    const indicator = new RedisHealthIndicator(redisFalso(() => new Promise<string>(() => {})));

    await expect(indicator.isHealthy('redis')).rejects.toBeInstanceOf(HealthCheckError);
  }, 10_000);
});
