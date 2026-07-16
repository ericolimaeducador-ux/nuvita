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

  it('rejects SUPER_ADMIN without a selected clinic', () => {
    const request = { user: { sub: 'sa', papel: Papel.SUPER_ADMIN }, headers: {} };

    expect(() => guard.canActivate(contextWithRequest(request))).toThrow(ForbiddenException);
  });

  it('lets SUPER_ADMIN assume a clinic via x-clinica-id header', () => {
    const clinicaId = '6a4d54c060fe4d45ab23b331';
    const request = {
      user: { sub: 'sa', papel: Papel.SUPER_ADMIN } as { sub: string; papel: Papel; clinicaId?: string },
      headers: { 'x-clinica-id': clinicaId },
    };

    expect(guard.canActivate(contextWithRequest(request))).toBe(true);
    expect(request.user.clinicaId).toBe(clinicaId);
    expect(tenantContext.getClinicaId()).toBe(clinicaId);
  });

  it('rejects a malformed x-clinica-id header', () => {
    const request = {
      user: { sub: 'sa', papel: Papel.SUPER_ADMIN },
      headers: { 'x-clinica-id': 'nao-e-objectid; drop tudo' },
    };

    expect(() => guard.canActivate(contextWithRequest(request))).toThrow(ForbiddenException);
  });

  it('does not let other roles assume a clinic via header', () => {
    const request = {
      user: { sub: 'u1', papel: Papel.MEDICO },
      headers: { 'x-clinica-id': '6a4d54c060fe4d45ab23b331' },
    };

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
