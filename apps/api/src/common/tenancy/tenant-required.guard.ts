import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthTokenPayload, Papel } from '../../../../../packages/shared/src/auth';
import { TenantContextService } from './tenant-context.service';

export const ALLOW_WITHOUT_TENANT_KEY = 'allowWithoutTenant';
export const AllowWithoutTenant = () => SetMetadata(ALLOW_WITHOUT_TENANT_KEY, true);

@Injectable()
export class TenantRequiredGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const allowWithoutTenant = this.reflector.getAllAndOverride<boolean>(ALLOW_WITHOUT_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (allowWithoutTenant) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthTokenPayload }>();
    if (request.user?.papel === Papel.ADMIN && !request.user.clinicaId) {
      return true;
    }

    return Boolean(this.tenantContext.getClinicaId());
  }
}
