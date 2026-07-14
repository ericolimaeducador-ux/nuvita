/**
 * Migração pontual (2026-07-13): backfill de `status`, `criadoPorId` e
 * `criadoPorPapel` em laudos_medicos criados antes do fluxo de rascunho
 * enfermeiro → revisão médica (esses campos passaram a ser obrigatórios no
 * schema, mas documentos antigos não os têm).
 *
 * Regra: laudos já assinados viram status=ASSINADO; os demais viram
 * status=RASCUNHO (não havia estado intermediário antes). Como antes só o
 * médico criava o laudo, `criadoPorId` é preenchido com o `medicoId` do
 * próprio documento e `criadoPorPapel` com 'MEDICO'.
 *
 * Uso: MONGODB_URI="<uri>" node scripts/migrate-laudo-medico-status.mjs
 * Idempotente — só toca documentos sem o campo `status`.
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('Defina MONGODB_URI.'); process.exit(1); }

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const laudos = db.collection('laudos_medicos');

  const semStatus = await laudos.countDocuments({ status: { $exists: false } });
  console.log(`Laudos sem "status": ${semStatus}`);

  if (semStatus > 0) {
    const assinados = await laudos.updateMany(
      { status: { $exists: false }, assinado: { $exists: true } },
      [{ $set: { status: 'ASSINADO', criadoPorId: '$medicoId', criadoPorPapel: 'MEDICO' } }],
    );
    console.log(`Marcados como ASSINADO: ${assinados.modifiedCount}`);

    const rascunhos = await laudos.updateMany(
      { status: { $exists: false } },
      [{ $set: { status: 'RASCUNHO', criadoPorId: '$medicoId', criadoPorPapel: 'MEDICO' } }],
    );
    console.log(`Marcados como RASCUNHO: ${rascunhos.modifiedCount}`);
  }

  const restantes = await laudos.countDocuments({ status: { $exists: false } });
  console.log(`Restantes sem "status" após migração: ${restantes}`);

  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
