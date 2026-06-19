import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TenantContextService } from './tenant-context.service';
import { TenantMiddleware } from './tenant.middleware';
import { TenantRequiredGuard } from './tenant-required.guard';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [TenantContextService, TenantMiddleware, TenantRequiredGuard],
  exports: [TenantContextService, TenantMiddleware, TenantRequiredGuard],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
