import { Provider } from '@nestjs/common';
import { ConnectionOptions, Queue } from 'bullmq';
import Redis from 'ioredis';
import { NOTIFICACAO_QUEUE, NOTIFICATION_QUEUE_NAME } from '../../notificacoes.constants';
import { AppConfigService } from '../../../../common/security/config.service';

export const notificacaoQueueProvider: Provider = {
  provide: NOTIFICACAO_QUEUE,
  inject: [AppConfigService],
  useFactory: (configService: AppConfigService) => {
    return new Queue(NOTIFICATION_QUEUE_NAME, {
      connection: new Redis(configService.getConfig().redisUrl, {
        maxRetriesPerRequest: null,
      }) as unknown as ConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60_000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  },
};
