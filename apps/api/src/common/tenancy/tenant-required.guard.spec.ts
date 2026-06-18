import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Papel } from '../../../../../packages/shared/src/auth';
import { TenantContextService } from './tenant-context.service';
import { TenantRequiredGuard } from './tenant-required.guard';

function contextWithRequest(request: unknown): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('TenantRequiredGuard', () => {
  let tenantContext: TenantContextService;
  let guard: TenantRequiredGuard;

  beforeEach(() => {
    tenantContext = new TenantContextService();
    guard = new TenantRequiredGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector,
      tenantContext,
    );
  });

  it('rejects requests without an authenticated user', () => {
    expect(() => guard.canActivate(contextWithRequest({}))).toThrow(UnauthorizedException);
  });

  it('rejects users without clinicaId', () => {
    const request = { user: { sub: 'u1', papel: Papel.ADMIN } };

    expect(() => guard.canActivate(contextWithRequest(request))).toThrow(ForbiddenException);
  });

  it('rejects route clinicaId mismatches', () => {
    const request = {
      user: { sub: 'u1', papel: Papel.ADMIN, clinicaId: 'clinica-a' },
      params: { clinicaId: 'clinica-b' },
    };

    expect(() => guard.canActivate(contextWithRequest(request))).toThrow(ForbiddenException);
  });

  it('stores the authenticated tenant in request context', () => {
    const request = {
      user: { sub: 'u1', papel: Papel.ADMIN, clinicaId: 'clinica-a' },
      params: { clinicaId: 'clinica-a' },
    };

    expect(guard.canActivate(contextWithRequest(request))).toBe(true);
    expect(tenantContext.getClinicaId()).toBe('clinica-a');
  });
});
