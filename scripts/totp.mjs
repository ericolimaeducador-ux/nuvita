// Imprime o código TOTP atual do ADMIN demo (válido por ~30s).
// Uso: node scripts/totp.mjs
import speakeasy from 'speakeasy';

const base32 =
  process.env.TOTP_SECRET || 'KBIGWLTTOYUEOI2SGBLTIOTFO4ZXS4BWLMZG6JLNFYUCCQCVJ4QQ';

const code = speakeasy.totp({ secret: base32, encoding: 'base32' });
const restante = 30 - (Math.floor(Date.now() / 1000) % 30);
console.log(`Código 2FA: ${code}  (expira em ${restante}s)`);
