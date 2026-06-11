import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { NOTIFICACAO_QUEUE, NOTIFICATION_QUEUE_NAME } from '../../notificacoes.constants';

export const notificacaoQueueProvider: Provider = {
  provide: NOTIFICACAO_QUEUE,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return new Queue(NOTIFICATION_QUEUE_NAME, {
      connection: new Redis(configService.getOrThrow<string>('REDIS_URL'), {
        maxRetriesPerRequest: null,
      }),
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
