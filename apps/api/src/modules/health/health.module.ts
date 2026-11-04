import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../auth/auth.module';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';

// AuthModule entra só para reaproveitar o REDIS_CLIENT já configurado — abrir
// uma segunda conexão só para o health check testaria um cliente que não é o
// que a aplicação usa de verdade.
@Module({
  imports: [TerminusModule, AuthModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule {}
