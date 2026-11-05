import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../auth/auth.constants';

/** Teto de espera do PING. Ver comentário em `isHealthy`. */
const PING_TIMEOUT_MS = 2_000;

/**
 * Indicador de saúde do Redis.
 *
 * Por que isso é crítico e não um detalhe: `AuthService.validateAccessToken`
 * consulta `TokenRevocationService.isRevoked` a CADA requisição autenticada, e
 * esse serviço é fail-closed (sem try/catch, de propósito — na dúvida, nega).
 * Ou seja: Redis fora => toda a API fica inutilizável para usuário logado.
 * Enquanto o /health olhava só o Mongo, ele respondia 200 nesse cenário e o
 * Cloud Run mantinha o tráfego numa instância que não servia ninguém.
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // O PING corre contra um timeout próprio: com o socket pendurado o
      // ioredis pode não rejeitar a tempo, e um health check que trava é tão
      // ruim quanto um que mente — o Cloud Run trata timeout de probe como
      // falha, mas só depois de segurar a conexão.
      await Promise.race([
        this.redis.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`PING excedeu ${PING_TIMEOUT_MS}ms`)), PING_TIMEOUT_MS).unref(),
        ),
      ]);

      // A chave é `conexao` e não `status`: o getStatus do terminus já devolve
      // um `status: 'up' | 'down'`, e um `status` nosso no data sobrescreveria
      // exatamente o campo que diz se o serviço está de pé.
      return this.getStatus(key, true, { conexao: this.redis.status });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HealthCheckError(
        'Redis indisponível',
        this.getStatus(key, false, { message, conexao: this.redis.status }),
      );
    }
  }
}
