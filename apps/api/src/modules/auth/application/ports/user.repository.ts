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

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithSecrets(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}
