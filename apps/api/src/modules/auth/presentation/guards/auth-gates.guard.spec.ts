import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Papel } from '../../../../../../../packages/shared/src/auth';
import { TERMOS_DE_USO_VERSAO_ATUAL } from '../../../../../../../packages/shared/src/termos';
import { AuthGatesGuard } from './auth-gates.guard';

function context(request: unknown): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function makeGuard(isento: boolean) {
  return new AuthGatesGuard({
    getAllAndOverride: jest.fn().mockReturnValue(isento),
  } as unknown as Reflector);
}

const gatedUser = {
  sub: 'u1',
  email: 'psi@nuvita.test',
  papel: Papel.PSICOLOGO,
  jti: 'j',
  typ: 'access' as const,
  deveTrocarSenha: false,
  termosAceitos: null,
};

const clearUser = {
  ...gatedUser,
  termosAceitos: { versao: TERMOS_DE_USO_VERSAO_ATUAL, dataAceite: new Date() },
};

describe('AuthGatesGuard (Fase 2b)', () => {
  it('barra com 403 quando há gate pendente e o handler não é isento', () => {
    const guard = makeGuard(false);
    expect(() => guard.canActivate(context({ user: gatedUser }))).toThrow(ForbiddenException);
  });

  it('deixa passar quando o handler é @GateExempt(), mesmo com gate pendente', () => {
    const guard = makeGuard(true);
    expect(guard.canActivate(context({ user: gatedUser }))).toBe(true);
  });

  it('deixa passar quando nenhum gate está pendente', () => {
    const guard = makeGuard(false);
    expect(guard.canActivate(context({ user: clearUser }))).toBe(true);
  });

  it('deixa passar quando não há request.user (guard encadeado após o auth; rota não autenticada)', () => {
    const guard = makeGuard(false);
    expect(guard.canActivate(context({}))).toBe(true);
  });

  it('barra PSICOLOGO com termo defasado', () => {
    const guard = makeGuard(false);
    const staleUser = { ...gatedUser, termosAceitos: { versao: '0.9', dataAceite: new Date() } };
    expect(() => guard.canActivate(context({ user: staleUser }))).toThrow(ForbiddenException);
  });
});
