import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ALLOW_WITHOUT_TENANT_KEY } from '../../../../common/tenancy/tenant-required.guard';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const allowWithoutTenant = this.reflector.getAllAndOverride<boolean>(ALLOW_WITHOUT_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (allowWithoutTenant) {
      return true;
    }

    return super.canActivate(context);
  }
}
