// Imprime o código TOTP atual a partir de um segredo base32 (válido por ~30s).
// Uso: TOTP_SECRET=<segredo base32> node scripts/totp.mjs
// O segredo NUNCA fica no script: ele precisa vir da variável de ambiente.
import speakeasy from 'speakeasy';

const base32 = process.env.TOTP_SECRET;

if (!base32) {
  console.error('Erro: defina a variável de ambiente TOTP_SECRET com o segredo base32 do usuário.');
  console.error('Exemplo: TOTP_SECRET=<segredo> node scripts/totp.mjs');
  process.exit(1);
}

const code = speakeasy.totp({ secret: base32, encoding: 'base32' });
const restante = 30 - (Math.floor(Date.now() / 1000) % 30);
console.log(`Código 2FA: ${code}  (expira em ${restante}s)`);
