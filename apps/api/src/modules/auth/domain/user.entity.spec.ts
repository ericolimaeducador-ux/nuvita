import { toPublicUser, User } from './user.entity';
import { Papel } from '../../../../../../packages/shared/src/auth';

const baseUser: User = {
  id: 'u1',
  nome: 'Fulana de Tal',
  email: 'fulana@example.com',
  passwordHash: 'hash-bcrypt',
  papel: Papel.PSICOLOGO,
  clinicaId: 'c1',
  twoFactorSecret: 'BASE32SECRET',
  ativo: true,
  criadoEm: new Date('2026-09-10T00:00:00.000Z'),
  deveTrocarSenha: false,
};

describe('toPublicUser — campos dos auth gates (Fase 1)', () => {
  it('carrega deveTrocarSenha e termosAceitos na projeção', () => {
    const termos = { versao: '1.0', dataAceite: new Date('2026-09-10T12:00:00.000Z') };
    const pub = toPublicUser({ ...baseUser, deveTrocarSenha: true, termosAceitos: termos });

    expect(pub.deveTrocarSenha).toBe(true);
    expect(pub.termosAceitos).toEqual(termos);
  });

  it('representa "sem troca forçada" como false e "termos não aceitos" como null/ausente', () => {
    const pub = toPublicUser({ ...baseUser, deveTrocarSenha: false, termosAceitos: null });

    expect(pub.deveTrocarSenha).toBe(false);
    expect(pub.termosAceitos ?? null).toBeNull();
  });

  it('continua removendo passwordHash e twoFactorSecret', () => {
    const pub = toPublicUser(baseUser) as Record<string, unknown>;

    expect(pub.passwordHash).toBeUndefined();
    expect(pub.twoFactorSecret).toBeUndefined();
  });
});
