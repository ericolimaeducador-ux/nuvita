import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';

/**
 * Fase 2b (feature-session-revocation-on-password-change): AuthTokenPayload
 * ganha iat?: number. O claim já é emitido em runtime por todo JWT assinado
 * (jwtService.signAsync não usa noTimestamp) — só faltava a tipagem. Teste
 * de tipo: sem `iat` na interface, este objeto literal falha a checagem de
 * propriedade excedente do TypeScript (ts-jest faz type-check por padrão).
 */
describe('AuthTokenPayload — iat (Fase 2b)', () => {
  it('aceita iat como number opcional', () => {
    const payload: AuthTokenPayload = {
      sub: 'user-1',
      email: 'user1@example.com',
      papel: Papel.PSICOLOGO,
      jti: 'jti-1',
      typ: 'access',
      iat: 1700000000,
    };

    expect(payload.iat).toBe(1700000000);
  });
});
