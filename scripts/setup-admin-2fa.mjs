// Cria um ADMIN com 2FA na clínica demo, gera um código TOTP e valida o login.
// Uso: node scripts/setup-admin-2fa.mjs
import speakeasy from 'speakeasy';

const API = 'http://localhost:3000';
const CLINICA_ID = process.env.CLINICA_ID || '6a3301636632591912f45670';
const email = process.env.ADMIN_EMAIL || 'admin2@demo.com';
const password = process.env.ADMIN_PASSWORD || 'SenhaForte123';

async function post(path, body, cookie) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, headers: res.headers };
}

const reg = await post('/auth/register', {
  nome: 'Administrador Demo',
  email,
  password,
  papel: 'ADMIN',
  clinicaId: CLINICA_ID,
});

if (reg.status !== 201 && reg.status !== 200) {
  console.error('Falha no register:', reg.status, JSON.stringify(reg.json));
  process.exit(1);
}

const setup = reg.json.twoFactorSetup;
if (!setup?.base32) {
  console.error('register não retornou twoFactorSetup. Resposta:', JSON.stringify(reg.json));
  process.exit(1);
}

const base32 = setup.base32;
const otpauthUrl = setup.otpauthUrl;

// Gera o código TOTP atual a partir do segredo
const totpCode = speakeasy.totp({ secret: base32, encoding: 'base32' });

const login = await post('/auth/login', { email, password, totpCode });

console.log(JSON.stringify({
  registerStatus: reg.status,
  loginStatus: login.status,
  loginOk: login.status === 201 || login.status === 200,
  email,
  password,
  base32,
  otpauthUrl,
  codigoTesteAgora: totpCode,
  user: login.json?.user,
}, null, 2));
