import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../packages/shared/src/auth';

/**
 * Resolve o tenant de forma segura: o clinicaId do TOKEN é sempre a fonte da
 * verdade. Um clinicaId vindo de query/body só é aceito se for igual ao do
 * token — nunca como override (evita acesso cross-tenant por usuários de
 * outra clínica, inclusive ADMIN).
 */
export function resolveTenantClinicaId(
  user: AuthTokenPayload,
  requestedClinicaId?: string,
): string {
  if (user.clinicaId) {
    if (requestedClinicaId && requestedClinicaId !== user.clinicaId) {
      throw new ForbiddenException('clinicaId informado nao corresponde ao tenant do usuario.');
    }
    return user.clinicaId;
  }

  throw new BadRequestException('clinicaId e obrigatorio para esta operacao.');
}
