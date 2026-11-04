import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowWithoutTenant } from '../../common/tenancy/tenant-required.guard';
import { RedisHealthIndicator } from './redis.health';

/**
 * Rota pública por design — é o probe do Cloud Run. Fica fora do throttling
 * global: um 429 no health check seria lido como instância doente e
 * derrubaria a revisão inteira.
 */
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @AllowWithoutTenant()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.mongoose.pingCheck('mongodb'),
      // O Redis entra aqui porque a revogação de token é consultada em toda
      // requisição autenticada: sem ele a API não serve usuário logado.
      () => this.redis.isHealthy('redis'),
    ]);
  }
}
