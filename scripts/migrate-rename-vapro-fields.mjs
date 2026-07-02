/**
 * Migração pontual (2026-07-02): renomeia campos que referenciavam a marca
 * VaPro/Hollister no schema, removendo o vínculo com a marca do software.
 * O catálogo de produtos (nomes reais de catéteres) NÃO é afetado — só os
 * campos internos usados pelo formulário/questionário de avaliação de IU.
 *
 *   pacientes.programaVaPro                    -> pacientes.programaIU
 *   prontuarios.fichaVaPro                     -> prontuarios.fichaAvaliacaoIU
 *   prontuarios.fichaVaPro.cateterVaProIndicado -> fichaAvaliacaoIU.cateterIndicado
 *
 * Uso: MONGODB_URI="<uri>" node scripts/migrate-rename-vapro-fields.mjs
 * Idempotente — pode rodar de novo sem efeito se os campos já foram renomeados.
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('Defina MONGODB_URI.'); process.exit(1); }

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const pacientes = db.collection('pacientes');
  const prontuarios = db.collection('prontuarios');

  const beforePac = await pacientes.countDocuments({ programaVaPro: { $exists: true } });
  const beforeFicha = await prontuarios.countDocuments({ fichaVaPro: { $exists: true } });
  const beforeCateter = await prontuarios.countDocuments({ 'fichaVaPro.cateterVaProIndicado': { $exists: true } });
  console.log('ANTES — pacientes.programaVaPro:', beforePac, '| prontuarios.fichaVaPro:', beforeFicha, '| fichaVaPro.cateterVaProIndicado:', beforeCateter);

  // Nested primeiro (enquanto ainda está sob a chave antiga fichaVaPro).
  const r1 = await prontuarios.updateMany(
    { 'fichaVaPro.cateterVaProIndicado': { $exists: true } },
    { $rename: { 'fichaVaPro.cateterVaProIndicado': 'fichaVaPro.cateterIndicado' } },
  );
  const r2 = await prontuarios.updateMany(
    { fichaVaPro: { $exists: true } },
    { $rename: { fichaVaPro: 'fichaAvaliacaoIU' } },
  );
  const r3 = await pacientes.updateMany(
    { programaVaPro: { $exists: true } },
    { $rename: { programaVaPro: 'programaIU' } },
  );
  console.log('renomeados — cateterIndicado:', r1.modifiedCount, '| fichaAvaliacaoIU:', r2.modifiedCount, '| programaIU:', r3.modifiedCount);

  const afterPacOld = await pacientes.countDocuments({ programaVaPro: { $exists: true } });
  const afterPacNew = await pacientes.countDocuments({ programaIU: { $exists: true } });
  const afterFichaOld = await prontuarios.countDocuments({ fichaVaPro: { $exists: true } });
  const afterFichaNew = await prontuarios.countDocuments({ fichaAvaliacaoIU: { $exists: true } });
  const afterCateterOld = await prontuarios.countDocuments({ 'fichaAvaliacaoIU.cateterVaProIndicado': { $exists: true } });
  const afterCateterNew = await prontuarios.countDocuments({ 'fichaAvaliacaoIU.cateterIndicado': { $exists: true } });

  console.log('DEPOIS — pacientes: programaVaPro(deve ser 0)=', afterPacOld, ' programaIU=', afterPacNew);
  console.log('DEPOIS — prontuarios: fichaVaPro(deve ser 0)=', afterFichaOld, ' fichaAvaliacaoIU=', afterFichaNew);
  console.log('DEPOIS — cateterVaProIndicado(deve ser 0)=', afterCateterOld, ' cateterIndicado=', afterCateterNew);

  const ok = afterPacOld === 0 && afterFichaOld === 0 && afterCateterOld === 0
    && afterPacNew === beforePac && afterFichaNew === beforeFicha && afterCateterNew === beforeCateter;
  console.log(ok ? 'OK: migracao consistente.' : 'ATENCAO: contagens nao batem, revisar!');

  await client.close();
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1); });
