import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { ROLES_KEY } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { ClinicasController } from './clinicas.controller';

/**
 * Rotas da logo da clínica (feature-logo-clinica). Contratos novos assumidos:
 *   POST   /clinicas/:clinicaId/logo/upload-url   -> ClinicasController.solicitarUploadLogo
 *   POST   /clinicas/:clinicaId/logo/confirmar    -> ClinicasController.confirmarLogo
 *   DELETE /clinicas/:clinicaId/logo              -> ClinicasController.removerLogo
 * Sem auth nega; só ADMIN e SUPER_ADMIN (o isolamento ADMIN x outra clínica é do serviço).
 */
const ROTAS = [
  { handler: 'solicitarUploadLogo', metodo: 1, path: ':clinicaId/logo/upload-url' }, // POST
  { handler: 'confirmarLogo', metodo: 1, path: ':clinicaId/logo/confirmar' }, // POST
  { handler: 'removerLogo', metodo: 3, path: ':clinicaId/logo' }, // DELETE
];

const proto = ClinicasController.prototype as unknown as Record<string, () => unknown>;
const userDe = (papel: Papel) => ({ sub: 'u1', email: 'u@x.test', papel, clinicaId: 'cli-A', jti: 'j', typ: 'access' as const });

describe.each(ROTAS)('rota da logo: $handler', ({ handler, metodo, path }) => {
  it('existe, com o verbo e o caminho certos', () => {
    expect(proto[handler]).toBeDefined();
    expect(Reflect.getMetadata(METHOD_METADATA, proto[handler])).toBe(metodo);
    expect(Reflect.getMetadata(PATH_METADATA, proto[handler])).toBe(path);
  });

  it('exige autenticação (JwtAuthGuard + AuthGatesGuard + RolesGuard)', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, proto[handler]) as unknown[];
    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, AuthGatesGuard, RolesGuard]));
  });

  it('papéis liberados: ADMIN e SUPER_ADMIN, e só eles', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, proto[handler]) as Papel[];
    expect([...roles].sort()).toEqual([Papel.ADMIN, Papel.SUPER_ADMIN].sort());
  });

  describe('RolesGuard real', () => {
    const guard = new RolesGuard(new Reflector());
    const ctx = (papel: Papel) =>
      ({
        getHandler: () => proto[handler],
        getClass: () => ClinicasController,
        switchToHttp: () => ({ getRequest: () => ({ user: userDe(papel) }) }),
      }) as never;

    it.each([Papel.ADMIN, Papel.SUPER_ADMIN])('libera %s', (papel) => {
      expect(guard.canActivate(ctx(papel))).toBe(true);
    });

    it.each([Papel.ENFERMEIRO, Papel.SECRETARIA, Papel.PACIENTE])('nega %s', (papel) => {
      expect(() => guard.canActivate(ctx(papel))).toThrow(ForbiddenException);
    });
  });
});
