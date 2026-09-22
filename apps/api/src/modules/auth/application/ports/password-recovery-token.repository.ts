import { PasswordRecoveryToken, PasswordRecoveryTokenTipo } from '../../domain/password-recovery-token.entity';

export interface CreatePasswordRecoveryTokenInput {
  userId: string;
  tipo: PasswordRecoveryTokenTipo;
  tokenHash: string;
  expiresAt: Date;
}

export interface PasswordRecoveryTokenRepository {
  create(input: CreatePasswordRecoveryTokenInput): Promise<PasswordRecoveryToken>;
  findByTokenHash(tokenHash: string): Promise<PasswordRecoveryToken | null>;
  /** Único token pendente (não consumido, não expirado) de um tipo para um usuário. */
  findActiveByUser(userId: string, tipo: PasswordRecoveryTokenTipo): Promise<PasswordRecoveryToken | null>;
  incrementAttempts(id: string): Promise<PasswordRecoveryToken | null>;
  consume(id: string): Promise<void>;
  deleteAllForUser(userId: string, tipo?: PasswordRecoveryTokenTipo): Promise<void>;
}
