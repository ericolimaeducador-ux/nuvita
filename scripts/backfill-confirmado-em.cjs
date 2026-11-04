/**
 * Backfill de `confirmadoEm` nos documentos existentes (opção C do HeadObject no confirmUpload).
 *
 * Para cada documento ATIVO sem o campo `confirmadoEm` (legado):
 *   - objeto existe no bucket (HeadObject) e tamanho bate → confirmadoEm = criadoEm do documento
 *   - objeto NÃO existe                                   → soft-delete (fantasma)
 *   - objeto existe mas o tamanho diverge                 → nada (reportado para análise manual)
 *   - HeadObject falhou (R2 indisponível)                 → nada (reportado); rode de novo
 *
 * DRY-RUN POR PADRÃO: só loga o que faria. Para gravar é preciso passar --apply explicitamente.
 * Idempotente: documentos que já têm o campo são ignorados.
 *
 * Uso (nunca é executado automaticamente):
 *   MONGODB_URI=... DOCUMENT_STORAGE_BUCKET=... DOCUMENT_STORAGE_ENDPOINT=... \
 *   DOCUMENT_STORAGE_ACCESS_KEY_ID=... DOCUMENT_STORAGE_SECRET_ACCESS_KEY=... \
 *   node scripts/backfill-confirmado-em.cjs            # dry-run
 *   node scripts/backfill-confirmado-em.cjs --apply    # grava
 */

const EXCLUIDO_POR = 'system:backfill-confirmado-em';

/**
 * Núcleo puro (testável): recebe as dependências por parâmetro.
 * @param {{
 *   documentos: AsyncIterable<{ _id: unknown, url: string, tamanho: number, criadoEm: Date }>,
 *   headObject: (url: string) => Promise<{ tamanho: number } | undefined>,
 *   confirmar: (id: unknown, quando: Date) => Promise<void>,
 *   softDelete: (id: unknown, quando: Date, por: string) => Promise<void>,
 *   apply: boolean,
 *   log: (msg: string) => void,
 *   agora?: Date,
 * }} deps
 */
async function backfill({ documentos, headObject, confirmar, softDelete, apply, log, agora = new Date() }) {
  const resumo = { confirmar: 0, softDelete: 0, divergente: 0, erro: 0 };
  const modo = apply ? 'APPLY' : 'DRY-RUN';

  for await (const doc of documentos) {
    let head;
    try {
      head = await headObject(doc.url);
    } catch (error) {
      resumo.erro += 1;
      log(`[${modo}] ${doc._id}: HeadObject falhou (${error.message}) — nada feito`);
      continue;
    }

    if (!head) {
      resumo.softDelete += 1;
      log(`[${modo}] ${doc._id}: objeto ausente → soft-delete`);
      if (apply) await softDelete(doc._id, agora, EXCLUIDO_POR);
    } else if (head.tamanho !== doc.tamanho) {
      resumo.divergente += 1;
      log(`[${modo}] ${doc._id}: tamanho diverge (bucket=${head.tamanho}, banco=${doc.tamanho}) — nada feito, revisar`);
    } else {
      resumo.confirmar += 1;
      log(`[${modo}] ${doc._id}: objeto ok → confirmadoEm = criadoEm`);
      if (apply) await confirmar(doc._id, doc.criadoEm);
    }
  }

  log(`[${modo}] resumo: ${JSON.stringify(resumo)}`);
  return resumo;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const obrigatorias = [
    'MONGODB_URI',
    'DOCUMENT_STORAGE_BUCKET',
    'DOCUMENT_STORAGE_ENDPOINT',
    'DOCUMENT_STORAGE_ACCESS_KEY_ID',
    'DOCUMENT_STORAGE_SECRET_ACCESS_KEY',
  ];
  const faltando = obrigatorias.filter((n) => !process.env[n]);
  if (faltando.length) {
    console.error(`Defina: ${faltando.join(', ')}`);
    process.exit(1);
  }

  const { MongoClient } = require('mongodb');
  const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
  const bucket = process.env.DOCUMENT_STORAGE_BUCKET;
  const s3 = new S3Client({
    region: process.env.DOCUMENT_STORAGE_REGION || 'auto',
    endpoint: process.env.DOCUMENT_STORAGE_ENDPOINT,
    forcePathStyle: process.env.DOCUMENT_STORAGE_FORCE_PATH_STYLE !== 'false',
    credentials: {
      accessKeyId: process.env.DOCUMENT_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.DOCUMENT_STORAGE_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  const headObject = async (url) => {
    const prefix = `s3://${bucket}/`;
    if (!url.startsWith(prefix)) throw new Error('URL de documento fora do bucket configurado');
    try {
      const r = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: url.slice(prefix.length) }));
      return { tamanho: r.ContentLength ?? 0 };
    } catch (error) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) return undefined;
      throw error;
    }
  };

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  try {
    const col = client.db().collection('documentos');
    console.log(apply ? 'Modo APPLY: vai gravar.' : 'Modo DRY-RUN: nada será gravado (use --apply para gravar).');
    await backfill({
      documentos: col.find({ confirmadoEm: { $exists: false }, excluidoEm: { $exists: false } }),
      headObject,
      confirmar: (id, quando) => col.updateOne({ _id: id }, { $set: { confirmadoEm: quando } }).then(() => undefined),
      softDelete: (id, quando, por) =>
        col.updateOne({ _id: id }, { $set: { excluidoEm: quando, excluidoPor: por } }).then(() => undefined),
      apply,
      log: (m) => console.log(m),
    });
  } finally {
    await client.close();
  }
}

module.exports = { backfill, EXCLUIDO_POR };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
