import { Papel } from '../../../../../../packages/shared/src/auth';

export interface User {
  id: string;
  nome: string;
  email: string;
  passwordHash: string;
  papel: Papel;
  clinicaId?: string;
  twoFactorSecret?: string;
  ativo: boolean;
  criadoEm: Date;
}

export type PublicUser = Omit<User, 'passwordHash' | 'twoFactorSecret'>;

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, twoFactorSecret: _twoFactorSecret, ...safeUser } = user;
  return safeUser;
}
