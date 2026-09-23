import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../modules/auth/auth.constants';

/**
 * Rate limiter Redis genérico (chave + limite + janela), fail-open igual ao
 * LoginRateLimiterService — não reaproveita aquele porque é específico do
 * login (chave fixa `auth:login-failures:*`); este aqui serve pra qualquer
 * fluxo novo (recuperação de senha/login) sem arriscar regressão no login.
 */
@Injectable()
export class RedisRateLimiterService {
  private readonly logger = new Logger(RedisRateLimiterService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async assertAllowed(key: string, max: number, windowSeconds: number): Promise<void> {
    let attempts: number;
    try {
      attempts = Number(await this.redis.get(key));
    } catch (err) {
      this.logger.warn(`Redis indisponivel no rate limiter (fail-open): ${(err as Error).message}`);
      return;
    }
    if (attempts >= max) {
      throw new HttpException('Muitas tentativas. Tente novamente mais tarde.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async recordAttempt(key: string, windowSeconds: number): Promise<void> {
    try {
      await this.redis.incr(key);
      await this.redis.expire(key, windowSeconds);
    } catch (err) {
      this.logger.warn(`Redis indisponivel ao registrar tentativa: ${(err as Error).message}`);
    }
  }
}
