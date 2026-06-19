import { Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../auth.constants';
import { AppConfigService } from '../../../../common/security/config.service';

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [AppConfigService],
  useFactory: (configService: AppConfigService) => {
    return new Redis(configService.getConfig().redisUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
    });
  },
};
