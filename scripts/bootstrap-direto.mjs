/**
 * Bootstrap direto via MongoDB — contorna incompatibilidade ts-node/Node 24.
 * Cria clínica + admin com estrutura idêntica ao schema NestJS.
 * Uso: node scripts/bootstrap-direto.mjs
 */
import { MongoClient, ObjectId } from 'mongodb';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bcrypt = require('bcrypt');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nuvita';
const ADMIN_EMAIL = 'admin@nuvita.demo';
const ADMIN_PASS  = 'SenhaForte123';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✓ Conectado ao MongoDB');
  const db = client.db();

  // Verifica se já existe
  const adminExistente = await db.collection('users').findOne({ email: ADMIN_EMAIL });
  if (adminExistente) {
    const clinica = await db.collection('clinicas').findOne({ _id: new ObjectId(adminExistente.clinicaId) });
    console.log('ℹ Admin já existe. clinicaId:', adminExistente.clinicaId);
    console.log('ℹ Clínica:', clinica?.nome ?? '(não encontrada)');
    await client.close();
    return;
  }

  const agora = new Date();
  const clinicaId = new ObjectId();

  // Cria clínica (campos idênticos ao ClinicaMongo schema)
  await db.collection('clinicas').insertOne({
    _id: clinicaId,
    nome: 'Clinica Nuvita Demo',
    cnpj: '12345678000199',
    plano: 'profissional',
    configuracoes: {
      fusoHorario: 'America/Sao_Paulo',
      duracaoConsultaPadrao: 30,
    },
    ativo: true,
    criadoEm: agora,
  });
  console.log('✓ Clínica criada  id:', clinicaId.toString());

  // Hash bcrypt com 12 rounds (igual ao padrão da API)
  const passwordHash = await bcrypt.hash(ADMIN_PASS, 12);

  // Cria admin (campos idênticos ao UserMongo schema)
  const adminId = new ObjectId();
  await db.collection('users').insertOne({
    _id: adminId,
    nome: 'Admin Demo',
    email: ADMIN_EMAIL,
    passwordHash,
    papel: 'ADMIN',
    clinicaId: clinicaId.toString(),
    ativo: true,
    criadoEm: agora,
  });
  console.log('✓ Admin criado    id:', adminId.toString());

  await client.close();

  console.log('\n✅ Bootstrap concluído!');
  console.log('  clinicaId :', clinicaId.toString());
  console.log('  Login     :', ADMIN_EMAIL, '/', ADMIN_PASS);
}

main().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
