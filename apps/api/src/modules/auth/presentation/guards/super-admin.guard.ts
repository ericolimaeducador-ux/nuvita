import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../../packages/shared/src/auth';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthTokenPayload }>();
    const user = request.user;

    if (user?.papel !== Papel.SUPER_ADMIN) {
      throw new ForbiddenException('Acesso permitido apenas para SUPER_ADMIN.');
    }

    return true;
  }
}
