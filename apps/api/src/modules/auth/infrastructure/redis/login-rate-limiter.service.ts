import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  REDIS_CLIENT,
} from '../../auth.constants';

@Injectable()
export class LoginRateLimiterService {
  private readonly logger = new Logger(LoginRateLimiterService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async assertAllowed(ip: string): Promise<void> {
    // Fail-open: se o Redis estiver fora, o login continua funcionando sem o
    // limite (já houve ETIMEDOUT/EPIPE em produção). O ThrottlerGuard do
    // /auth segue como camada de proteção em memória.
    let attempts: number;
    try {
      attempts = Number(await this.redis.get(this.key(ip)));
    } catch (err) {
      this.logger.warn(`Redis indisponivel no rate limiter de login (fail-open): ${(err as Error).message}`);
      return;
    }
    if (attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
      throw new HttpException('Muitas tentativas de login. Tente novamente em 15 minutos.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async recordFailure(ip: string): Promise<void> {
    try {
      const key = this.key(ip);
      await this.redis.incr(key);
      // TTL renovado a cada falha (janela deslizante): também recupera uma
      // chave que tenha ficado sem TTL se um expire anterior falhou no meio.
      await this.redis.expire(key, LOGIN_RATE_LIMIT_WINDOW_SECONDS);
    } catch (err) {
      this.logger.warn(`Redis indisponivel ao registrar falha de login: ${(err as Error).message}`);
    }
  }

  async clear(ip: string): Promise<void> {
    try {
      await this.redis.del(this.key(ip));
    } catch (err) {
      this.logger.warn(`Redis indisponivel ao limpar falhas de login: ${(err as Error).message}`);
    }
  }

  private key(ip: string): string {
    return `auth:login-failures:${ip}`;
  }
}
