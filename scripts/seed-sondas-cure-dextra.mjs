/**
 * Seed idempotente de DUAS sondas Cure Dextra (Convatec, ponta reta) na coleção `produtos`.
 * NÃO FOI EXECUTADO contra nenhum banco ao ser criado.
 *
 * Formato: igual ao dos produtos existentes (campos: codigo [número, único], nome, tipo, sexo, embalagem, projeto,
 * french, comprimentoCm, descricaoTecnica, ativo, criadoEm, atualizadoEm). Só nome, calibre, comprimento e código;
 * NENHUM dado regulatório (ANVISA, esterilização, RT, fabricante) nem ficha técnica é armazenado.
 *
 * CÓDIGO (a confirmar pelo Erico): os produtos existentes usam `codigo` numérico e único do catálogo do fabricante
 * (ex.: 72082 VaPro, 4714598 ACTICOAT). Aqui foi usado o código ICC (510795 / 510796): é numérico, único por produto
 * e vem do catálogo do fabricante. O SAP (1735396) é o MESMO nas duas sondas, então não serve como chave única.
 * Os demais códigos disponíveis ficam só neste comentário (não são gravados): 12 Fr = SAP 1735396, EAN 815947021243,
 * SIMPRO 0000352731; 14 Fr = SAP 1735396, EAN 815947021250, SIMPRO 0000352732.
 *
 * COMPRIMENTO: a ficha não informa. `comprimentoCm` NÃO é gravado (campo ausente). PREENCHER depois, pela tela do
 * catálogo (editar produto) — não invente.
 *
 * Campos que a ficha não trouxe e foram preenchidos com o valor neutro do catálogo (revisar): sexo = universal,
 * embalagem = standard, projeto = ALPHA (mesmo das demais linhas de sondas).
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
  nome: `Sonda Cure Dextra ${french}Fr Ponta Reta`,
  tipo: 'cateter_cure_dextra',
  sexo: 'universal',
  embalagem: 'standard',
  projeto: 'ALPHA',
  french,
  descricaoTecnica: `Sonda Cure Dextra (Convatec), ponta reta, ${french}Fr, caixa com 90 unidades.`,
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
