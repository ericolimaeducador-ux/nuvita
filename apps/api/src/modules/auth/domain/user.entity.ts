import { Modulo, Papel, resolvePermissoes } from '../../../../../../packages/shared/src/auth';

/** Aceite dos Termos de Uso do profissional (feature-terms-of-service-acceptance). */
export interface TermosAceitos {
  versao: string;
  dataAceite: Date;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  passwordHash: string;
  papel: Papel;
  clinicaId?: string | null;
  twoFactorSecret?: string;
  /** Registro do conselho profissional: CRM (médico), COREN (enfermeiro). */
  registroProfissional?: string;
  /**
   * COREN do enfermeiro (assinatura dos documentos clínicos). Preenchido uma vez pelo próprio
   * profissional; depois só o super-admin corrige. Sem unique. Ausente = ainda não informado.
   */
  coren?: string;
  ativo: boolean;
  criadoEm: Date;
  /** Troca de senha obrigatória no próximo login (feature-forced-password-change). Ausente = false. */
  deveTrocarSenha: boolean;
  /** Aceite dos Termos de Uso (feature-terms-of-service-acceptance). null/ausente = não aceito. */
  termosAceitos?: TermosAceitos | null;
  /**
   * Cópia da marcação `faseTeste` da clínica (teste beta): enquanto true, o termo
   * exigido no aceite é o Termo de Teste, não os Termos de Uso. Mantida em sincronia
   * pelo cadastro de usuários e pela edição da clínica (super-admin). Ausente = false.
   */
  faseTeste?: boolean;
  /** Exceções por usuário sobre o padrão do papel (ver resolvePermissoes). */
  modulosConcedidos?: Modulo[];
  modulosRevogados?: Modulo[];
  /**
   * Revogação de sessão na troca de senha (feature-session-revocation-on-password-change).
   * Ausente/null = nenhuma troca de senha jamais invalidou sessões deste usuário —
   * NUNCA tratar ausência como rejeição.
   */
  tokensValidosApartirDe?: Date | null;
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
