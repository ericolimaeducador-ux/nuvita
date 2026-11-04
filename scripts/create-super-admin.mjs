/**
 * Cria o PRIMEIRO usuário SUPER_ADMIN diretamente no MongoDB.
 *
 * Necessário porque o endpoint público /auth/register força papel PACIENTE e o
 * endpoint /super-admin/usuarios já exige um SUPER_ADMIN autenticado (ovo-galinha).
 * O papel SUPER_ADMIN exige 2FA, então o segredo TOTP é pré-provisionado aqui e
 * impresso ao final (base32 + otpauth URL) para cadastrar no app autenticador.
 *
 * Uso:
 *   MONGODB_URI="<uri>" \
 *   EXPECTED_DB_NAME="<nome-do-banco>" EXPECTED_DB_HOST="<host-do-cluster>" \
 *   SUPER_ADMIN_PASSWORD="<senha>" \
 *   [SUPER_ADMIN_NOME="Erico Araujo"] [SUPER_ADMIN_EMAIL="ericobrazil@outlook.com"] \
 *   node scripts/create-super-admin.mjs
 *
 * Trava anti-banco-errado (obrigatória, sem default):
 *   EXPECTED_DB_NAME  nome do banco que o script PODE tocar. Comparado com
 *                     db.databaseName real logo depois de conectar.
 *   EXPECTED_DB_HOST  host (ou seed list) esperado na MONGODB_URI. Comparado
 *                     com o host extraído da própria string de conexão.
 *   Se qualquer um faltar ou não bater, o script aborta ANTES de ler ou
 *   escrever qualquer coisa.
 *
 *   node scripts/create-super-admin.mjs --help   # imprime o uso completo
 */
import { MongoClient } from 'mongodb';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');

const USAGE = `
create-super-admin.mjs — cria o PRIMEIRO usuário SUPER_ADMIN direto no MongoDB.

Env vars obrigatórias:
  MONGODB_URI           string de conexão do banco alvo
  EXPECTED_DB_NAME      nome do banco que o script PODE tocar (trava, sem default)
  EXPECTED_DB_HOST      host esperado na MONGODB_URI (trava, sem default)
  SUPER_ADMIN_PASSWORD  senha inicial do SUPER_ADMIN (mín. 8 caracteres)

Env vars opcionais:
  SUPER_ADMIN_NOME      default "Erico Araujo"
  SUPER_ADMIN_EMAIL     default "ericobrazil@outlook.com"
  BCRYPT_ROUNDS         default 12

A trava compara EXPECTED_DB_NAME/EXPECTED_DB_HOST com o banco e o host reais
logo após conectar. Se algum faltar ou divergir, aborta sem ler nem escrever.

Exemplo:
  MONGODB_URI="mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/nuvita_psi" \\
  EXPECTED_DB_NAME="nuvita_psi" EXPECTED_DB_HOST="cluster0.xxxx.mongodb.net" \\
  SUPER_ADMIN_PASSWORD="..." \\
  node scripts/create-super-admin.mjs
`;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(USAGE.trim());
  process.exit(0);
}

const MONGODB_URI = process.env.MONGODB_URI;
const EXPECTED_DB_NAME = process.env.EXPECTED_DB_NAME;
const EXPECTED_DB_HOST = process.env.EXPECTED_DB_HOST;
const NOME = process.env.SUPER_ADMIN_NOME || 'Erico Araujo';
const EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'ericobrazil@outlook.com').toLowerCase();
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

function fail(msg) { console.error('❌ ' + msg); process.exit(1); }

if (!MONGODB_URI) fail('Defina MONGODB_URI.');
if (!EXPECTED_DB_NAME || !EXPECTED_DB_HOST) {
  fail(
    'Defina EXPECTED_DB_NAME e EXPECTED_DB_HOST explicitamente (trava anti-banco-errado, sem default).\n' +
    'Rode com --help para ver o uso completo.',
  );
}
if (!PASSWORD || PASSWORD.length < 8) fail('Defina SUPER_ADMIN_PASSWORD (mín. 8 caracteres).');

/**
 * Extrai o host (ou seed list separada por vírgula) de uma MONGODB_URI, sem
 * depender de internals do driver: remove o esquema, descarta as credenciais
 * antes do "@" e corta no primeiro "/" ou "?".
 */
function hostDaUri(uri) {
  const semEsquema = uri.replace(/^mongodb(\+srv)?:\/\//i, '');
  const semCreds = semEsquema.includes('@') ? semEsquema.slice(semEsquema.indexOf('@') + 1) : semEsquema;
  return semCreds.split(/[/?]/)[0].toLowerCase();
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  // Trava anti-banco-errado: confere ANTES de qualquer leitura/escrita.
  const dbReal = db.databaseName;
  const hostReal = hostDaUri(MONGODB_URI);
  const hostConfere =
    hostReal === EXPECTED_DB_HOST.toLowerCase() ||
    hostReal.split(',').includes(EXPECTED_DB_HOST.toLowerCase());
  if (dbReal !== EXPECTED_DB_NAME || !hostConfere) {
    await client.close();
    fail(
      'Trava de segurança: o destino não confere com o esperado.\n' +
      `  banco esperado : ${EXPECTED_DB_NAME}\n` +
      `  banco real     : ${dbReal}\n` +
      `  host esperado  : ${EXPECTED_DB_HOST}\n` +
      `  host real      : ${hostReal}\n` +
      'Abortado sem ler nem escrever nada.',
    );
  }

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
