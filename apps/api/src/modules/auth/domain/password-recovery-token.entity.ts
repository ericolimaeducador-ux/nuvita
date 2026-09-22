export type PasswordRecoveryTokenTipo = 'reset' | 'login-otp';

export interface PasswordRecoveryToken {
  id: string;
  userId: string;
  tipo: PasswordRecoveryTokenTipo;
  tokenHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt?: Date;
}
