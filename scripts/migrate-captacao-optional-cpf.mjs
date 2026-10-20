/**
 * Update the unique CPF index for capture records with optional CPF.
 * Keep duplicate CPF protection when CPF is provided.
 * Uso: MONGODB_URI="<uri>" node scripts/migrate-captacao-optional-cpf.mjs
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('Defina MONGODB_URI.'); process.exit(1); }

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const captacoes = client.db().collection('capitacao_paciente');
    const indexes = await captacoes.indexes();
    const indiceCpf = indexes.find((index) => index.key?.cpfHash === 1);

    if (indiceCpf && indiceCpf.partialFilterExpression?.cpfHash?.$type !== 'string') {
      await captacoes.dropIndex(indiceCpf.name);
      console.log(`Old index "${indiceCpf.name}" removed.`);
    }

    await captacoes.createIndex(
      { cpfHash: 1 },
      {
        name: 'cpfHash_1',
        unique: true,
        partialFilterExpression: { status: 'pendente', cpfHash: { $type: 'string' } },
      },
    );
    console.log('Capture CPF index updated.');
  } finally {
    await client.close();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
