import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthTokenPayload, Papel } from '../../../../../packages/shared/src/auth';
import { TenantContextService } from './tenant-context.service';

export const ALLOW_WITHOUT_TENANT_KEY = 'allowWithoutTenant';
export const AllowWithoutTenant = () => SetMetadata(ALLOW_WITHOUT_TENANT_KEY, true);

/** Header pelo qual o SUPER_ADMIN (papel de plataforma, sem clínica no token) informa a clínica que está operando. */
export const CLINICA_ATIVA_HEADER = 'x-clinica-id';

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

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
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Usuario autenticado ausente.');
    }

    if (!user.clinicaId) {
      // SUPER_ADMIN não tem clínica no token: assume a clínica escolhida no
      // seletor do frontend (header). A mutação vale só para esta request e
      // faz resolveTenantClinicaId/serviços enxergarem o tenant assumido;
      // a auditoria continua registrando o userId real do SUPER_ADMIN.
      const clinicaAtiva = request.headers?.[CLINICA_ATIVA_HEADER];
      if (
        user.papel === Papel.SUPER_ADMIN &&
        typeof clinicaAtiva === 'string' &&
        OBJECT_ID_RE.test(clinicaAtiva)
      ) {
        user.clinicaId = clinicaAtiva;
      } else if (user.papel === Papel.SUPER_ADMIN) {
        throw new ForbiddenException('Selecione uma clinica para acessar esta area.');
      } else {
        throw new ForbiddenException('Usuario sem clinicaId nao pode acessar rota tenantizada.');
      }
    }

    const routeClinicaId = request.params?.clinicaId;
    if (routeClinicaId && routeClinicaId !== user.clinicaId) {
      throw new ForbiddenException('clinicaId da rota nao corresponde ao tenant do token.');
    }

    this.tenantContext.setClinicaId(user.clinicaId);
    return true;
  }
}
