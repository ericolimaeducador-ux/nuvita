/**
 * Migração pontual (2026-07-13): remove o índice TTL de salas_telemedicina.expiresAt.
 * Esse índice fazia o MongoDB apagar a sala automaticamente 4h após a criação
 * (SALA_TTL_HORAS), independente do atendimento ter sido concluído. Isso órfã
 * os eventos em eventos_telemedicina (coleção permanente): o registro do
 * atendimento (entrou/saiu/duração) fica salvo mas inacessível pela API, já
 * que ela busca a sala antes de listar os eventos.
 *
 * expiresAt continua existindo no documento e continua controlando só a
 * validade do link de acesso (checado em telemedicina.service.ts) — só o
 * índice TTL que apaga o documento é removido.
 *
 * Uso: MONGODB_URI="<uri>" node scripts/migrate-remove-sala-telemedicina-ttl.mjs
 * Idempotente — pode rodar de novo sem efeito se o índice já foi removido.
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('Defina MONGODB_URI.'); process.exit(1); }

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const salas = db.collection('salas_telemedicina');

  const indexesAntes = await salas.indexes();
  console.log('ANTES — índices em salas_telemedicina:', indexesAntes.map((i) => i.name));

  const ttlIndex = indexesAntes.find((i) => i.expireAfterSeconds !== undefined);
  if (!ttlIndex) {
    console.log('Nenhum índice TTL encontrado — nada a fazer.');
  } else {
    await salas.dropIndex(ttlIndex.name);
    console.log(`Índice TTL "${ttlIndex.name}" removido.`);
  }

  const indexesDepois = await salas.indexes();
  console.log('DEPOIS — índices em salas_telemedicina:', indexesDepois.map((i) => i.name));

  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
