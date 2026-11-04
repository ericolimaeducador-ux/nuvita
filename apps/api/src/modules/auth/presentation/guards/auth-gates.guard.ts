import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { gatePendente } from '../../domain/auth-gates';
import { AuthenticatedUser } from '../../domain/authenticated-user';
import { GATE_EXEMPT_KEY } from '../decorators/gate-exempt.decorator';

/**
 * Camada de SEGURANÇA da cadeia de gates pós-login — o redirect do router no
 * frontend é só UX (§2.6/§9 do TDD). Roda encadeado DEPOIS do `JwtAuthGuard`:
 * lê `request.user` (já enriquecido por `validateAccessPayload`) e barra com
 * 403 toda rota não marcada `@GateExempt()` enquanto houver gate pendente.
 *
 * Aplicado nos mesmos controllers autenticados que já usam o
 * `TenantRequiredGuard`, mais o `super-admin`.
 */
@Injectable()
export class AuthGatesGuard implements CanActivate {
  private readonly logger = new Logger(AuthGatesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isento = this.reflector.getAllAndOverride<boolean>(GATE_EXEMPT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isento) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      // Este guard vem encadeado após o JwtAuthGuard; sem `user` a rota não é
      // autenticada por ele — nada a barrar aqui.
      return true;
    }

    if (gatePendente(user)) {
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          msg: 'Requisicao barrada: gate pos-login pendente.',
          event: 'gate_guard_rejections',
          gate: user.deveTrocarSenha === true ? 'password' : 'terms',
          userId: user.sub,
        }),
      );
      throw new ForbiddenException(
        'Ha uma acao pendente antes de usar o sistema: troca de senha ou aceite dos Termos de Uso.',
      );
    }

    return true;
  }
}
