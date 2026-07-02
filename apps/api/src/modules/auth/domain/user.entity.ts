import { Modulo, Papel, resolvePermissoes } from '../../../../../../packages/shared/src/auth';

export interface User {
  id: string;
  nome: string;
  email: string;
  passwordHash: string;
  papel: Papel;
  clinicaId?: string | null;
  twoFactorSecret?: string;
  ativo: boolean;
  criadoEm: Date;
  /** Exceções por usuário sobre o padrão do papel (ver resolvePermissoes). */
  modulosConcedidos?: Modulo[];
  modulosRevogados?: Modulo[];
}

export type PublicUser = Omit<User, 'passwordHash' | 'twoFactorSecret'> & {
  /** Permissões efetivas (padrão do papel ∪ concedidas − revogadas). */
  permissoes: Modulo[];
};

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, twoFactorSecret: _twoFactorSecret, ...safeUser } = user;
  return {
    ...safeUser,
    permissoes: resolvePermissoes(user.papel, user.modulosConcedidos, user.modulosRevogados),
  };
}
