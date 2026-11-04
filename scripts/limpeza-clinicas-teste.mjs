/**
 * Second cleanup of the test clinics (production test of 2026-10-28). Erico runs it; the agent never does.
 *
 *   Count only (default, changes nothing):
 *     node scripts/limpeza-clinicas-teste.mjs --lista <file.json>
 *   Delete (only after the checked export, see docs/runbooks/segunda-limpeza-clinicas-teste.md):
 *     node scripts/limpeza-clinicas-teste.mjs --lista <file.json> --executar --export-conferida
 *
 * <file.json> = {"clinicas": ["<24-hex id>", ...], "usuarios": ["<24-hex id>", ...]}  (ids only: no e-mail, no document).
 * The connection string comes ONLY from the environment variable MONGODB_URI, set by Erico in his own terminal.
 * If the Atlas SRV lookup fails on Windows, set DNS_SERVERS="8.8.8.8,1.1.1.1".
 *
 * Refuses: empty list, any SUPER_ADMIN, the "Gerenciadora" clinic, a user of a listed clinic that is not on the list.
 * Never touches: audit_logs, inscricoes_teste, the super-admin, the Gerenciadora clinic.
 * `clinicaId` is counted and deleted in BOTH forms (string and ObjectId).
 */
import dns from 'node:dns';
import { readFileSync } from 'node:fs';
import { MongoClient, ObjectId } from 'mongodb';
import { COLECOES_POR_CLINICA, lerLista, validarLista } from './lib/limpeza-guardas.mjs';

if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(','));

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('Set MONGODB_URI in your own terminal.'); process.exit(1); }
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };
const executar = process.argv.includes('--executar');
if (executar && !process.argv.includes('--export-conferida')) {
  console.error('--executar requires --export-conferida (the checked export of step 1-2 of the runbook).');
  process.exit(1);
}
const arquivo = arg('--lista');
if (!arquivo) { console.error('Pass --lista <file.json>.'); process.exit(1); }

const lista = lerLista(JSON.parse(readFileSync(arquivo, 'utf8')));
if (lista.erros.length) { console.error('REFUSED:\n- ' + lista.erros.join('\n- ')); process.exit(2); }

const idsTexto = (xs) => xs.flatMap((x) => [String(x), x]);
const dois = (ids) => [...ids, ...ids.map((i) => new ObjectId(i))];
const porClinica = (ids) => ({ clinicaId: { $in: dois(ids) } });
const porId = (ids) => ({ _id: { $in: ids.map((i) => new ObjectId(i)) } });

async function contar(db, ids) {
  const r = {};
  for (const nome of COLECOES_POR_CLINICA) {
    const col = db.collection(nome);
    const [comoString, comoObjectId] = await Promise.all([
      col.countDocuments({ clinicaId: { $in: lista.clinicas } }),
      col.countDocuments({ clinicaId: { $in: lista.clinicas.map((i) => new ObjectId(i)) } }),
    ]);
    r[nome] = { string: comoString, objectId: comoObjectId, total: comoString + comoObjectId };
  }
  // After the deletion the parents are gone: reuse the ids captured BEFORE, so leftover grandchildren are still found.
  const prontuarios = ids?.prontuarios ?? (await db.collection('prontuarios').find(porClinica(lista.clinicas), { projection: { _id: 1 } }).toArray()).map((d) => d._id);
  const salas = ids?.salas ?? (await db.collection('salas_telemedicina').find(porClinica(lista.clinicas), { projection: { _id: 1 } }).toArray()).map((d) => d._id);
  r.prontuario_addendums = { total: await db.collection('prontuario_addendums').countDocuments({ prontuarioId: { $in: idsTexto(prontuarios) } }) };
  r.sinais_telemedicina = { total: await db.collection('sinais_telemedicina').countDocuments({ salaId: { $in: idsTexto(salas) } }) };
  r.users = { total: await db.collection('users').countDocuments(porId(lista.usuarios)) };
  r.clinicas = { total: await db.collection('clinicas').countDocuments(porId(lista.clinicas)) };
  r._ids = { prontuarios, salas };
  return r;
}

/**
 * Orphans: documents whose `clinicaId` points to a clinic that does not exist (any form), counted per form.
 * Run before and after: the deletion must not CREATE orphans (the "after" number must equal the "before" number).
 * Orphans that already existed (e.g. from the first cleanup) are reported, never deleted by this script.
 */
async function contarOrfaos(db) {
  const existentes = (await db.collection('clinicas').find({}, { projection: { _id: 1 } }).toArray()).map((c) => c._id);
  const aceitos = [...existentes.map(String), ...existentes];
  const o = {};
  for (const nome of [...COLECOES_POR_CLINICA, 'users']) {
    const col = db.collection(nome);
    const fora = { $exists: true, $nin: aceitos };
    const [s, oid] = await Promise.all([
      col.countDocuments({ clinicaId: { ...fora, $type: 'string' } }),
      col.countDocuments({ clinicaId: { ...fora, $type: 'objectId' } }),
    ]);
    o[nome] = { string: s, objectId: oid, total: s + oid };
  }
  return o;
}
const mostrarOrfaos = (titulo, o) => {
  console.log(`
== ${titulo} ==`);
  const com = Object.entries(o).filter(([, v]) => v.total > 0);
  if (!com.length) console.log('none');
  for (const [k, v] of com) console.log(`${k.padEnd(26)} ${String(v.total).padStart(5)}   (string ${v.string}, ObjectId ${v.objectId})`);
};

const mostrar = (titulo, r) => {
  console.log(`\n== ${titulo} ==`);
  for (const [k, v] of Object.entries(r)) if (k !== '_ids') console.log(`${k.padEnd(26)} ${String(v.total).padStart(5)}${v.string !== undefined ? `   (string ${v.string}, ObjectId ${v.objectId})` : ''}`);
};

const client = new MongoClient(uri);
await client.connect();
const db = client.db();
console.log(`Connected to database: ${db.databaseName}${executar ? '  [EXECUTE]' : '  [COUNT ONLY]'}`);
try {
  // Guards: read only ids, roles, clinic ids and the clinic name. No e-mail, no document is projected.
  const encontrados = {
    clinicas: await db.collection('clinicas').find(porId(lista.clinicas), { projection: { _id: 1, nome: 1 } }).toArray(),
    usuarios: await db.collection('users').find(porId(lista.usuarios), { projection: { _id: 1, papel: 1, clinicaId: 1 } }).toArray(),
    usuariosDasClinicas: await db.collection('users').find(porClinica(lista.clinicas), { projection: { _id: 1, papel: 1 } }).toArray(),
  };
  const erros = validarLista(lista, encontrados);
  if (erros.length) { console.error('REFUSED:\n- ' + erros.join('\n- ')); process.exitCode = 2; }
  else {
    const antes = await contar(db);
    mostrar('COUNT BEFORE', antes);
    const orfaosAntes = await contarOrfaos(db);
    mostrarOrfaos('ORPHANS BEFORE (clinicaId pointing to a clinic that does not exist)', orfaosAntes);
    if (!executar) { console.log('\nCount only: nothing was changed.'); }
    else {
      // Children first, parents last: grandchildren, clinic-scoped collections, users, then the clinics.
      await db.collection('prontuario_addendums').deleteMany({ prontuarioId: { $in: idsTexto(antes._ids.prontuarios) } });
      await db.collection('sinais_telemedicina').deleteMany({ salaId: { $in: idsTexto(antes._ids.salas) } });
      for (const nome of COLECOES_POR_CLINICA) await db.collection(nome).deleteMany(porClinica(lista.clinicas));
      await db.collection('users').deleteMany(porId(lista.usuarios));
      await db.collection('clinicas').deleteMany(porId(lista.clinicas));
      const depois = await contar(db, antes._ids);
      mostrar('COUNT AFTER', depois);
      const sobrou = Object.entries(depois).filter(([k, v]) => k !== '_ids' && v.total !== 0);
      const orfaosDepois = await contarOrfaos(db);
      mostrarOrfaos('ORPHANS AFTER', orfaosDepois);
      const criados = Object.keys(orfaosDepois).filter((k) => orfaosDepois[k].string !== orfaosAntes[k].string || orfaosDepois[k].objectId !== orfaosAntes[k].objectId);
      if (criados.length) { console.error('\nORPHANS CHANGED in: ' + criados.join(', ')); process.exitCode = 3; }
      if (sobrou.length) { console.error('\nSOMETHING REMAINS: ' + sobrou.map(([k]) => k).join(', ')); process.exitCode = 3; }
      else if (!criados.length) console.log('\nAll listed records are gone. audit_logs and inscricoes_teste were not touched.');
    }
  }
} finally {
  await client.close();
}
