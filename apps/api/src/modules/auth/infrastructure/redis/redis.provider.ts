import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../auth.constants';

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return new Redis(configService.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
    });
  },
};
