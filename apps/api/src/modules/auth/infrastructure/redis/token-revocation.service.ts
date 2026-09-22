import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../auth.constants';

@Injectable()
export class TokenRevocationService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.key(jti), '1', 'EX', ttlSeconds);
  }

  async isRevoked(jti: string): Promise<boolean> {
    return (await this.redis.exists(this.key(jti))) === 1;
  }

  /**
   * Derruba TODAS as sessões de um usuário (ex.: após trocar a senha) sem
   * precisar saber os jti's individuais: grava uma marca d'água com o
   * timestamp atual — qualquer token emitido antes dela passa a ser
   * considerado revogado (ver isAllRevokedSince).
   */
  async revokeAllForUser(userId: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.watermarkKey(userId), Date.now().toString(), 'EX', ttlSeconds);
  }

  async isAllRevokedSince(userId: string, issuedAtMs: number): Promise<boolean> {
    const watermark = await this.redis.get(this.watermarkKey(userId));
    if (!watermark) return false;
    return issuedAtMs < Number(watermark);
  }

  private key(jti: string): string {
    return `auth:revoked-token:${jti}`;
  }

  private watermarkKey(userId: string): string {
    return `auth:tokens-invalid-before:${userId}`;
  }
}
