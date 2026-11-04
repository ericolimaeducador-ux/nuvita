import { Modulo, Papel } from '../../../../../../../packages/shared/src/auth';
import { TermosAceitos, User } from '../../domain/user.entity';

export interface CreateUserInput {
  nome: string;
  email: string;
  passwordHash: string;
  papel: Papel;
  clinicaId?: string | null;
  twoFactorSecret?: string;
  registroProfissional?: string;
  /** COREN do enfermeiro, informado na criação da conta (fonte única do carimbo no prontuário). */
  coren?: string;
  /** true = troca de senha obrigatória no 1º login (feature-forced-password-change). */
  deveTrocarSenha?: boolean;
  /** Herdado da clínica (teste beta). */
  faseTeste?: boolean;
}

export interface UpdateUserInput {
  nome?: string;
  email?: string;
  papel?: Papel;
  clinicaId?: string | null;
  ativo?: boolean;
  passwordHash?: string;
  twoFactorSecret?: string;
  registroProfissional?: string;
  coren?: string;
  modulosConcedidos?: Modulo[];
  modulosRevogados?: Modulo[];
  deveTrocarSenha?: boolean;
  termosAceitos?: TermosAceitos | null;
  /** Herdado da clínica (teste beta). */
  faseTeste?: boolean;
  /** Revogação de sessão na troca de senha (feature-session-revocation-on-password-change). */
  tokensValidosApartirDe?: Date | null;
}

export interface UserFilters {
  papel?: Papel;
  clinicaId?: string;
  ativo?: boolean;
  search?: string;
}

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithSecrets(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAll(filters: UserFilters, skip: number, limit: number): Promise<User[]>;
  count(filters: UserFilters): Promise<number>;
  update(id: string, input: UpdateUserInput): Promise<User | null>;
  /** Guarda o HASH do token de redefinição (um por conta; novo pedido substitui o anterior). */
  salvarResetSenha(id: string, tokenHash: string, expiraEm: Date): Promise<void>;
  /**
   * Atômico e de uso único: casa hash + validade + conta ativa, troca a senha, apaga o token e
   * derruba as sessões. Não toca no 2FA. Devolve a conta, ou null se o token não vale.
   */
  redefinirSenhaComToken(tokenHash: string, passwordHash: string, agora: Date): Promise<User | null>;
  /** Propaga a marcação de fase de teste da clínica a todos os usuários dela. Devolve quantos mudaram. */
  definirFaseTesteDaClinica(clinicaId: string, faseTeste: boolean): Promise<number>;
}
