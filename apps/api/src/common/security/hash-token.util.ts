import { createHash } from 'crypto';

/**
 * Hash de token/código de recuperação para guardar em banco — nunca o valor
 * puro. Token de reset já tem 256 bits de entropia (gerado por randomBytes),
 * então SHA-256 simples basta; não precisa de chave HMAC como o cpfHash
 * (que hasheia um valor de baixa entropia, o CPF).
 */
export function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
