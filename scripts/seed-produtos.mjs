/**
 * Catálogo de produtos (coleção `produtos`) — SEM SEED, DE PROPÓSITO.
 *
 * O Nuvita antigo semeava o catálogo no boot (ProdutosService.onApplicationBootstrap) com uma lista fixa de produtos de
 * incontinência urinária. Na base nova o catálogo COMEÇA VAZIO e nenhum produto é inventado aqui: ele é preenchido
 * pelo ADMIN (tela "Catálogo de produtos" ou POST /produtos) ou por uma lista oficial fornecida depois.
 *
 * Se a lista chegar (CSV/JSON), este arquivo é o lugar de importá-la, de forma idempotente (upsert por `codigo`) e
 * em modo simulação por padrão, no mesmo estilo de scripts/migrar-etapa2-classificacao.mjs. Esqueleto (NÃO ATIVO):
 *
 *   import { MongoClient } from 'mongodb';
 *   // const produtos = JSON.parse(fs.readFileSync(process.env.LISTA_PRODUTOS, 'utf8'));
 *   // para cada item: db.collection('produtos').updateOne({ codigo }, { $set: item, $setOnInsert: { criadoEm: new Date() } }, { upsert: true })
 *
 * Observação: o banco real do Nuvita antigo JÁ tem a coleção `produtos` populada pelo seed antigo; nada aqui apaga ou altera isso.
 */
console.log('seed-produtos: nenhum seed definido (catálogo começa vazio). Veja o comentário deste arquivo.');
