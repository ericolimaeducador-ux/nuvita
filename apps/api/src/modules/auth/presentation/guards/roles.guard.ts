import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthTokenPayload, Papel } from '../../../../../../../packages/shared/src/auth';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Papel[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // NEGAÇÃO POR PADRÃO: rota sem papel declarado (@Roles) é negada para todos, inclusive SUPER_ADMIN.
    // Esquecer a declaração vira 403 (e teste vermelho em authorization-matrix.spec.ts), nunca acesso aberto.
    if (!requiredRoles?.length) {
      throw new ForbiddenException('Acesso negado: rota sem papel declarado.');
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthTokenPayload }>();
    const user = request.user;

    // SUPER_ADMIN é o dono da plataforma: acesso total (resolvePermissoes já
    // lhe dá TODOS_MODULOS), sem depender de constar em cada lista @Roles.
    if (user?.papel === Papel.SUPER_ADMIN) {
      return true;
    }

    if (!user || !requiredRoles.includes(user.papel)) {
      throw new ForbiddenException('Acesso negado para este papel.');
    }

    return true;
  }
}
