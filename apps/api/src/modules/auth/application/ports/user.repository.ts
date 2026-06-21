import { Papel } from '../../../../../../../packages/shared/src/auth';
import { User } from '../../domain/user.entity';

export interface CreateUserInput {
  nome: string;
  email: string;
  passwordHash: string;
  papel: Papel;
  clinicaId?: string | null;
  twoFactorSecret?: string;
}

export interface UpdateUserInput {
  nome?: string;
  papel?: Papel;
  clinicaId?: string | null;
  ativo?: boolean;
  passwordHash?: string;
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
}
