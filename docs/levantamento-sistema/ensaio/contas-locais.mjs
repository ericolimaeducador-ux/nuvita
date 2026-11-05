// Cria, SOMENTE no Mongo local, as contas de demonstração sem caminho de interface (super-admin e
// paciente) para o ensaio do levantamento. Dados 100% fictícios. Admin e secretária são criados pela
// própria interface durante o ensaio (para testar a auditoria de criação de conta).
//   MONGODB_URI=mongodb://127.0.0.1:27018/nuvita-psi-manual OUT=<arquivo.json> node contas-locais.mjs
// O arquivo OUT (segredos 2FA das contas fictícias) deve ficar FORA do repositório.
import { MongoClient, ObjectId } from 'mongodb';
import { createRequire } from 'module';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const require = createRequire(import.meta.url);
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');

// TRAVA DE HOST: bloqueante, sem override (mesma lógica de scripts/seed-manual-psicologos.mjs).
function exigirMongoLocal() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('ABORTADO: defina MONGODB_URI (Mongo LOCAL).'); process.exit(1); }
  const m = uri.match(/^mongodb:\/\/(?:[^@/]*@)?([^/?]+)/);
  const hosts = m ? m[1].split(',').map((h) => h.replace(/:\d+$/, '').toLowerCase()) : [];
  if (!m || !hosts.every((h) => h === '127.0.0.1' || h === 'localhost')) {
    console.error(`ABORTADO: host não local (${hosts.join(', ') || 'URI inválida'}).`);
    process.exit(1);
  }
  return uri;
}
const uri = exigirMongoLocal();
const OUT = process.env.OUT;
if (!OUT) { console.error('ABORTADO: defina OUT (arquivo fora do repo).'); process.exit(1); }

const SENHA = 'EnsaioLocal#2026';
const client = new MongoClient(uri);
await client.connect();
const db = client.db();
const clinica = await db.collection('clinicas').findOne({ nome: 'Clínica Demonstração (Manual)' });
if (!clinica) { console.error('Rode antes scripts/seed-manual-psicologos.mjs'); process.exit(1); }
const clinicaId = clinica._id.toString();

const contas = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf-8')) : {};
async function garantir(chave, doc, comSegredo) {
  let u = await db.collection('users').findOne({ email: doc.email });
  if (!u) {
    const segredo = comSegredo ? speakeasy.generateSecret({ length: 20 }).base32 : undefined;
    u = { _id: new ObjectId(), ...doc, passwordHash: await bcrypt.hash(SENHA, 12), ativo: true, criadoEm: new Date(), ...(segredo ? { '2faSecret': segredo } : {}) };
    await db.collection('users').insertOne(u);
    console.log('✓ criado:', chave, doc.email);
  } else {
    console.log('= já existe:', chave, doc.email);
  }
  contas[chave] = { email: doc.email, senha: SENHA, segredo2fa: u['2faSecret'] ?? null, id: u._id.toString() };
}
await garantir('superAdmin', { nome: 'Super Admin Demonstração', email: 'superadmin.demo@manual.nuvita.test', papel: 'SUPER_ADMIN', deveTrocarSenha: false }, true);
await garantir('paciente', { nome: 'Paciente Login Demonstração', email: 'paciente.demo@manual.nuvita.test', papel: 'PACIENTE', clinicaId, deveTrocarSenha: false }, false);
writeFileSync(OUT, JSON.stringify({ ...contas, clinicaId }, null, 2));
await client.close();
