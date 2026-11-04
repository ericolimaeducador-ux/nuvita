import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuthController } from './auth.controller';
import { AuthGatesGuard } from './guards/auth-gates.guard';

/**
 * Trava de regressão do deadlock: os endpoints que RESOLVEM os gates
 * pós-login (e o logout) precisam continuar alcançáveis por um usuário COM
 * gate pendente. Se alguém remover `@GateExempt()` de `aceitar-termos`, todo
 * PSICOLOGO fica travado — não consegue aceitar os termos porque aceitar
 * está barrado pelo gate de termos. Ver §2.6/§9 do TDD.
 *
 * Testa o AuthGatesGuard REAL contra os handlers REAIS do controller.
 */
function ctxFor(handler: unknown, user: unknown): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => AuthController,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const base = {
  sub: 'u1',
  email: 'psi@nuvita.test',
  papel: Papel.PSICOLOGO,
  jti: 'j',
  typ: 'access' as const,
  deveTrocarSenha: false,
  termosAceitos: null,
};

describe('AuthController — endpoints isentos do gate (Fase 5)', () => {
  const guard = new AuthGatesGuard(new Reflector());

  it('PSICOLOGO com termos pendentes CONSEGUE POST /auth/aceitar-termos', () => {
    expect(
      guard.canActivate(ctxFor(AuthController.prototype.aceitarTermos, base)),
    ).toBe(true);
  });

  it('usuário com deveTrocarSenha CONSEGUE POST /auth/logout', () => {
    expect(
      guard.canActivate(ctxFor(AuthController.prototype.logout, { ...base, deveTrocarSenha: true })),
    ).toBe(true);
  });

  it('usuário com deveTrocarSenha CONSEGUE POST /auth/trocar-senha-obrigatoria', () => {
    expect(
      guard.canActivate(
        ctxFor(AuthController.prototype.trocarSenhaObrigatoria, { ...base, deveTrocarSenha: true }),
      ),
    ).toBe(true);
  });

  it('sanidade: um handler NÃO isento (login) barraria um usuário com gate — prova que o guard está de fato ativo', () => {
    // login não tem @GateExempt(); com um user gated no request seria barrado.
    // (na prática login não tem request.user, mas aqui isolamos o efeito do decorator)
    expect(() =>
      guard.canActivate(ctxFor(AuthController.prototype.login, { ...base, deveTrocarSenha: true })),
    ).toThrow();
  });
});
