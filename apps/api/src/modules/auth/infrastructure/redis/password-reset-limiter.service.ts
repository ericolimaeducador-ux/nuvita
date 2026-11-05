import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../auth.constants';
import { PasswordResetLimiter } from '../../application/password-reset.service';

const JANELA_SEGUNDOS = 60 * 60;
const MAX_POR_CONTA = 3;
const MAX_POR_IP = 20;

/** Limite de pedidos de redefinição: por conta (anti-spam na caixa de entrada) e por IP. Fail-open se o Redis cair. */
@Injectable()
export class PasswordResetLimiterService implements PasswordResetLimiter {
  private readonly logger = new Logger(PasswordResetLimiterService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async permitirPedido(ip: string, email: string): Promise<boolean> {
    const emailHash = createHash('sha256').update(email).digest('hex');
    try {
      const [conta, porIp] = await Promise.all([
        this.contar(`auth:reset-conta:${emailHash}`),
        this.contar(`auth:reset-ip:${ip}`),
      ]);
      return conta <= MAX_POR_CONTA && porIp <= MAX_POR_IP;
    } catch (erro) {
      this.logger.warn(`Redis indisponivel no limite de redefinicao (fail-open): ${(erro as Error).message}`);
      return true;
    }
  }

  private async contar(chave: string): Promise<number> {
    const total = await this.redis.incr(chave);
    if (total === 1) await this.redis.expire(chave, JANELA_SEGUNDOS);
    return total;
  }
}
