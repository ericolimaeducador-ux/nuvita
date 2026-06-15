import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthTokenPayload } from '../../../../../packages/shared/src/auth';
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

    const request = context.switchToHttp().getRequest<{
      user?: AuthTokenPayload;
      params?: { clinicaId?: string };
    }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Usuario autenticado ausente.');
    }

    if (!user.clinicaId) {
      throw new ForbiddenException('Usuario sem clinicaId nao pode acessar rota tenantizada.');
    }

    const routeClinicaId = request.params?.clinicaId;
    if (routeClinicaId && routeClinicaId !== user.clinicaId) {
      throw new ForbiddenException('clinicaId da rota nao corresponde ao tenant do token.');
    }

    this.tenantContext.setClinicaId(user.clinicaId);
    return true;
  }
}
