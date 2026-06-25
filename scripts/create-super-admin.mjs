/**
 * Cria o PRIMEIRO usuário SUPER_ADMIN diretamente no MongoDB.
 *
 * Necessário porque o endpoint público /auth/register força papel PACIENTE e o
 * endpoint /super-admin/usuarios já exige um SUPER_ADMIN autenticado (ovo-galinha).
 * O papel SUPER_ADMIN exige 2FA, então o segredo TOTP é pré-provisionado aqui e
 * impresso ao final (base32 + otpauth URL) para cadastrar no app autenticador.
 *
 * Uso:
 *   MONGODB_URI="<uri>" SUPER_ADMIN_PASSWORD="<senha>" \
 *   [SUPER_ADMIN_NOME="Erico Araujo"] [SUPER_ADMIN_EMAIL="ericobrazil@outlook.com"] \
 *   node scripts/create-super-admin.mjs
 */
import { MongoClient } from 'mongodb';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');

const MONGODB_URI = process.env.MONGODB_URI;
const NOME = process.env.SUPER_ADMIN_NOME || 'Erico Araujo';
const EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'ericobrazil@outlook.com').toLowerCase();
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

function fail(msg) { console.error('❌ ' + msg); process.exit(1); }

if (!MONGODB_URI) fail('Defina MONGODB_URI.');
if (!PASSWORD || PASSWORD.length < 8) fail('Defina SUPER_ADMIN_PASSWORD (mín. 8 caracteres).');

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const users = db.collection('users');

  const existente = await users.findOne({ email: EMAIL });
  if (existente) {
    console.log('ℹ Usuário já existe:', EMAIL, '| papel:', existente.papel, '| id:', existente._id.toString());
    await client.close();
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, ROUNDS);
  const secret = speakeasy.generateSecret({ length: 20, name: `Nuvita (${EMAIL})` });
  const base32 = secret.base32;
  const otpauthUrl = speakeasy.otpauthURL({
    secret: base32,
    label: `Nuvita:${EMAIL}`,
    issuer: 'Nuvita',
    encoding: 'base32',
  });

  const doc = {
    nome: NOME,
    email: EMAIL,
    passwordHash,
    papel: 'SUPER_ADMIN',
    // SUPER_ADMIN é de plataforma — sem vínculo de clínica.
    '2faSecret': base32,
    ativo: true,
    criadoEm: new Date(),
  };
  const res = await users.insertOne(doc);
  await client.close();

  const codigoAgora = speakeasy.totp({ secret: base32, encoding: 'base32' });
  console.log('\n✅ SUPER_ADMIN criado!');
  console.log('  id        :', res.insertedId.toString());
  console.log('  nome      :', NOME);
  console.log('  email     :', EMAIL);
  console.log('  papel     : SUPER_ADMIN');
  console.log('\n🔐 2FA (cadastre no Google Authenticator / Authy):');
  console.log('  base32    :', base32);
  console.log('  otpauthUrl:', otpauthUrl);
  console.log('  código agora (teste):', codigoAgora);
  console.log('\n⚠ Guarde o base32 com segurança e apague este output depois.');
}

main().catch(e => fail(e.message));
