/**
 * Seed idempotente de DUAS sondas Cure Dextra (Convatec, ponta reta) na coleção `produtos`.
 * NÃO FOI EXECUTADO contra nenhum banco ao ser criado.
 *
 * Formato: igual ao dos produtos existentes (codigo [inteiro, único], nome, tipo, sexo, embalagem, projeto, french,
 * descricaoTecnica, ativo, criadoEm, atualizadoEm). Só nome, calibre, código (+ campos obrigatórios do catálogo);
 * NENHUM dado regulatório (ANVISA, esterilização, RT, fabricante) nem ficha técnica é armazenado.
 *
 * Valores confirmados pelo Erico: projeto "Sigma"; sexo "universal" (a ficha não traz comprimento, a sonda serve
 * ambos os sexos); tipo "Cure Dextra"; embalagem "caixa_90" (90 unidades por caixa); código = ICC (510795 / 510796).
 * Fora do seed (só aqui): SAP 1735396 (igual nas duas), EAN 815947021243 / 815947021250, SIMPRO 0000352731 / 0000352732.
 *
 * COMPRIMENTO: a ficha não informa. `comprimentoCm` fica AUSENTE; o Erico preenche depois pela tela do catálogo.
 *
 * Idempotente: procura por `codigo`; se já existe, NÃO altera nada. Por padrão roda em SIMULAÇÃO (dry-run).
 *
 * Como rodar (banco de ENSAIO; nunca o real sem backup):
 *   MONGODB_URI="<uri>" node scripts/seed-sondas-cure-dextra.mjs            # simulação
 *   MONGODB_URI="<uri>" node scripts/seed-sondas-cure-dextra.mjs --apply    # grava
 * Opcional: MONGODB_DB="<nome do banco>" se a URI não trouxer o nome do banco.
 */
import { MongoClient } from 'mongodb';

const SONDAS = [
  { codigo: 510795, french: 12 },
  { codigo: 510796, french: 14 },
].map(({ codigo, french }) => ({
  codigo,
  nome: `Cure Dextra Universal ${french}Fr Caixa 90`,
  tipo: 'Cure Dextra',
  sexo: 'universal',
  embalagem: 'caixa_90',
  projeto: 'Sigma',
  french,
  descricaoTecnica: `Sonda Cure Dextra, ponta reta, calibre ${french} Fr`,
}));

const apply = process.argv.includes('--apply');
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Defina MONGODB_URI (banco de ENSAIO).');
  process.exit(1);
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const col = client.db(process.env.MONGODB_DB || undefined).collection('produtos');
  console.log(apply ? 'MODO: GRAVAR (--apply)' : 'MODO: simulação (use --apply para gravar)');
  for (const s of SONDAS) {
    const existe = await col.findOne({ codigo: s.codigo }, { projection: { _id: 1, nome: 1 } });
    if (existe) {
      console.log(`= codigo ${s.codigo}: já existe ("${existe.nome}") — nada a fazer`);
      continue;
    }
    if (!apply) {
      console.log(`+ codigo ${s.codigo}: seria criado ("${s.nome}")`);
      continue;
    }
    const agora = new Date();
    await col.insertOne({ ...s, ativo: true, criadoEm: agora, atualizadoEm: agora });
    console.log(`+ codigo ${s.codigo}: criado ("${s.nome}")`);
  }
} finally {
  await client.close();
}
