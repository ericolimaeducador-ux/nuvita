import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../auth.constants';

@Injectable()
export class TokenRevocationService {
  private readonly logger = new Logger(TokenRevocationService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // Fail-closed de propósito (na dúvida, nega), mas como 503 com mensagem clara, não como 500 genérico.
  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(this.key(jti), '1', 'EX', ttlSeconds);
    } catch (err) {
      throw this.indisponivel(err);
    }
  }

  async isRevoked(jti: string): Promise<boolean> {
    try {
      return (await this.redis.exists(this.key(jti))) === 1;
    } catch (err) {
      throw this.indisponivel(err);
    }
  }

  private indisponivel(err: unknown): ServiceUnavailableException {
    this.logger.error(`Redis indisponivel na revogacao de token (fail-closed, 503): ${(err as Error).message}`);
    return new ServiceUnavailableException('Serviço temporariamente indisponível, tente novamente');
  }

  private key(jti: string): string {
    return `auth:revoked-token:${jti}`;
  }
}
