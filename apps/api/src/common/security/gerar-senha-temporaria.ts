import { randomInt } from 'node:crypto';

// Sem 0/O/1/l/I — a senha é lida e digitada por uma pessoa (repassada por
// WhatsApp no onboarding de clínica). Só letras e dígitos: nenhum símbolo que
// dependa de layout de teclado.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const TAMANHO = 20;

/**
 * Senha temporária de alta entropia para uma conta recém-criada. Sempre
 * acompanhada da trava de troca obrigatória no primeiro login
 * (feature-forced-password-change) — ver §2.5/§9 do TDD.
 */
export function gerarSenhaTemporaria(): string {
  let senha = '';
  for (let i = 0; i < TAMANHO; i++) {
    senha += ALFABETO[randomInt(ALFABETO.length)];
  }
  return senha;
}
