import { Provider } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { REDIS_CLIENT } from '../../auth.constants';
import { AppConfigService } from '../../../../common/security/config.service';

/**
 * Timeouts curtos e explícitos (os padrões do ioredis seriam 10 s de conexão e nenhum de comando): um Redis lento
 * não pode segurar a requisição por dezenas de segundos. commandTimeout = 2 s, o mesmo do PING do /health.
 * retryStrategy: backoff com teto de 1 s e que NUNCA desiste: devolver null deixaria o cliente morto até reiniciar a instância.
 */
export const REDIS_OPTIONS: RedisOptions = {
  lazyConnect: false,
  maxRetriesPerRequest: 2,
  connectTimeout: 5_000,
  commandTimeout: 2_000,
  retryStrategy: (times: number) => Math.min(times * 100, 1_000),
};

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [AppConfigService],
  useFactory: (configService: AppConfigService) => {
    return new Redis(configService.getConfig().redisUrl, REDIS_OPTIONS);
  },
};
