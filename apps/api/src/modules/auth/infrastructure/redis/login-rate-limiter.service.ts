import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import {
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  REDIS_CLIENT,
} from '../../auth.constants';

/**
 * Contador de falhas de login por (ip, conta). A chave usa o SHA-256 do e-mail
 * normalizado (trim + minúsculas): o e-mail nunca vai em claro ao Redis (LGPD).
 * Assim um NAT não é bloqueado inteiro por uma conta, e o acerto de uma conta
 * (clear) não apaga o histórico de falhas das outras no mesmo IP.
 */
@Injectable()
export class LoginRateLimiterService {
  private readonly logger = new Logger(LoginRateLimiterService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async assertAllowed(ip: string, email: string): Promise<void> {
    // Fail-open: se o Redis estiver fora, o login continua funcionando sem o
    // limite (já houve ETIMEDOUT/EPIPE em produção). O ThrottlerGuard do
    // /auth segue como camada de proteção em memória.
    let attempts: number;
    try {
      attempts = Number(await this.redis.get(this.key(ip, email)));
    } catch (err) {
      this.logger.warn(`Redis indisponivel no rate limiter de login (fail-open): ${(err as Error).message}`);
      return;
    }
    if (attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
      throw new HttpException('Muitas tentativas de login. Tente novamente em 15 minutos.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async recordFailure(ip: string, email: string): Promise<void> {
    try {
      const key = this.key(ip, email);
      await this.redis.incr(key);
      // TTL renovado a cada falha (janela deslizante): também recupera uma
      // chave que tenha ficado sem TTL se um expire anterior falhou no meio.
      await this.redis.expire(key, LOGIN_RATE_LIMIT_WINDOW_SECONDS);
    } catch (err) {
      this.logger.warn(`Redis indisponivel ao registrar falha de login: ${(err as Error).message}`);
    }
  }

  async clear(ip: string, email: string): Promise<void> {
    try {
      await this.redis.del(this.key(ip, email));
    } catch (err) {
      this.logger.warn(`Redis indisponivel ao limpar falhas de login: ${(err as Error).message}`);
    }
  }

  private key(ip: string, email: string): string {
    const emailHash = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
    return `auth:login-failures:${ip}:${emailHash}`;
  }
}
