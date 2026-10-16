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
  crp?: string;
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
  /** Propaga a marcação de fase de teste da clínica a todos os usuários dela. Devolve quantos mudaram. */
  definirFaseTesteDaClinica(clinicaId: string, faseTeste: boolean): Promise<number>;
}
