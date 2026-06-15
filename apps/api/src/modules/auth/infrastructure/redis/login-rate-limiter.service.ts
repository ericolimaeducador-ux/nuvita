import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import {
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  REDIS_CLIENT,
} from '../../auth.constants';

@Injectable()
export class LoginRateLimiterService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async assertAllowed(ip: string): Promise<void> {
    const attempts = Number(await this.redis.get(this.key(ip)));
    if (attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
      throw new HttpException('Muitas tentativas de login. Tente novamente em 15 minutos.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async recordFailure(ip: string): Promise<void> {
    const key = this.key(ip);
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      await this.redis.expire(key, LOGIN_RATE_LIMIT_WINDOW_SECONDS);
    }
  }

  async clear(ip: string): Promise<void> {
    await this.redis.del(this.key(ip));
  }

  private key(ip: string): string {
    return `auth:login-failures:${ip}`;
  }
}
