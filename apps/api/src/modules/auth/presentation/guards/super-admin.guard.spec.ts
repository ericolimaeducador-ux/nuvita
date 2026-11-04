import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Papel } from '../../../../../../../packages/shared/src/auth';
import { SuperAdminGuard } from './super-admin.guard';

function context(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

/**
 * O SuperAdminController inteiro (incl. POST /super-admin/clinicas — Fase 7)
 * está sob este guard no nível de classe. "não-super-admin → 403" da Fase 7
 * é garantido aqui.
 */
describe('SuperAdminGuard', () => {
  const guard = new SuperAdminGuard();

  it('deixa passar SUPER_ADMIN', () => {
    expect(guard.canActivate(context({ papel: Papel.SUPER_ADMIN }))).toBe(true);
  });

  it('barra ADMIN com 403', () => {
    expect(() => guard.canActivate(context({ papel: Papel.ADMIN }))).toThrow(ForbiddenException);
  });

  it('barra PSICOLOGO com 403', () => {
    expect(() => guard.canActivate(context({ papel: Papel.PSICOLOGO }))).toThrow(ForbiddenException);
  });

  it('barra requisição sem usuário', () => {
    expect(() => guard.canActivate(context(undefined))).toThrow(ForbiddenException);
  });
});
