/**
 * Integration check of scripts/limpeza-clinicas-teste.mjs against the LOCAL Mongo (never production).
 * Not part of CI (needs the local container `nuvita-psi-mongo-27018`). Run:
 *   node scripts/lib/limpeza-clinicas-teste.integracao.mjs
 * It DROPS and recreates the database `limpeza_teste` on 127.0.0.1:27018 with fictitious data, and refuses any other target.
 * Exit 0 = every assertion held; exit 1 = at least one failed (the failed ones are listed).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient, ObjectId } from 'mongodb';

const URI = 'mongodb://127.0.0.1:27018/limpeza_teste'; // fixed on purpose: no env override, so it cannot hit Atlas
const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'limpeza-clinicas-teste.mjs');
const pasta = mkdtempSync(join(tmpdir(), 'limpeza-'));

const client = new MongoClient(URI);
await client.connect();
const db = client.db();
if (db.databaseName !== 'limpeza_teste') { console.error('Wrong database, refusing.'); process.exit(1); }
await db.dropDatabase();

const O = () => new ObjectId();
const s = (o) => o.toString();
const ins = (c, docs) => db.collection(c).insertMany(docs);
// cFantasma: a clinic that no longer exists (orphans left by an earlier cleanup).
const cA = O(), cB = O(), cG = O(), cFantasma = O();
await ins('clinicas', [{ _id: cA, nome: 'Clinica A fict' }, { _id: cB, nome: 'ZZ-TESTE Clinica B fict' }, { _id: cG, nome: 'Gerenciadora', cnpj: 'DOC-FICT' }]);
const [uA1, uA2, uB1, uB2, uSA, uG] = [O(), O(), O(), O(), O(), O()];
await ins('users', [
  { _id: uA1, papel: 'ADMIN', clinicaId: s(cA) }, { _id: uA2, papel: 'ENFERMEIRO', clinicaId: s(cA) },
  { _id: uB1, papel: 'ADMIN', clinicaId: s(cB) }, { _id: uB2, papel: 'ENFERMEIRO', clinicaId: s(cB) },
  { _id: uSA, papel: 'SUPER_ADMIN' }, { _id: uG, papel: 'ADMIN', clinicaId: s(cG) }]);
await ins('pacientes', [{ clinicaId: s(cA) }, { clinicaId: cB }, { clinicaId: s(cG) }, { clinicaId: s(cFantasma) }, { clinicaId: cFantasma }]);
await ins('agendamentos', [{ clinicaId: s(cA) }, { clinicaId: s(cA) }, { clinicaId: s(cA) }, { clinicaId: cB }, { clinicaId: cB }, { clinicaId: cB }, { clinicaId: s(cG) }]);
const [prA1, prA2, prB, prG] = [O(), O(), O(), O()];
await ins('prontuarios', [{ _id: prA1, clinicaId: s(cA) }, { _id: prA2, clinicaId: s(cA) }, { _id: prB, clinicaId: cB }, { _id: prG, clinicaId: s(cG) }]);
await ins('prontuario_addendums', [{ prontuarioId: s(prA1) }, { prontuarioId: prB }, { prontuarioId: s(prG) }]);
await ins('documentos_emitidos', [{ clinicaId: cA }, { clinicaId: cA }, { clinicaId: cB }, { clinicaId: cB }, { clinicaId: cG }, { clinicaId: cFantasma }]);
await ins('notificacoes', [{ clinicaId: s(cA) }, { clinicaId: cB }, { clinicaId: s(cG) }]);
const [sB, sG] = [O(), O()];
await ins('salas_telemedicina', [{ _id: sB, clinicaId: s(cB) }, { _id: sG, clinicaId: s(cG) }]);
await ins('sinais_telemedicina', [{ salaId: s(sB) }, { salaId: s(sG) }]);
await ins('audit_logs', [{ clinicaId: s(cA), acao: 'x' }, { clinicaId: cB, acao: 'y' }, { clinicaId: s(cG), acao: 'z' }, { acao: 'w' }, { clinicaId: s(cA), acao: 'v' }]);
await ins('inscricoes_teste', [{ n: 1 }, { n: 2 }, { n: 3 }]);

const COLS = ['clinicas', 'users', 'pacientes', 'agendamentos', 'prontuarios', 'prontuario_addendums', 'documentos_emitidos', 'notificacoes', 'salas_telemedicina', 'sinais_telemedicina', 'audit_logs', 'inscricoes_teste'];
const snap = async () => Object.fromEntries(await Promise.all(COLS.map(async (c) => [c, await db.collection(c).countDocuments()])));
const run = (lista, extra = []) => {
  const f = join(pasta, `lista-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(f, JSON.stringify(lista));
  return spawnSync('node', [SCRIPT, '--lista', f, ...extra], { env: { ...process.env, MONGODB_URI: URI }, encoding: 'utf8' });
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const falhas = [];
const confere = (nome, cond) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${nome}`); if (!cond) falhas.push(nome); };

const clin = [s(cA), s(cB)];
const usu = [uA1, uA2, uB1, uB2].map(s);
const EXEC = ['--executar', '--export-conferida'];
const antes = await snap();

let r = run({ clinicas: [], usuarios: usu });
confere('empty clinic list refused (exit 2), nothing written', r.status === 2 && eq(antes, await snap()));
r = run({ clinicas: clin, usuarios: [] });
confere('empty user list refused (exit 2), nothing written', r.status === 2 && eq(antes, await snap()));
r = run({ clinicas: clin, usuarios: [...usu.slice(0, 3), s(uSA)] }, EXEC);
confere('SUPER_ADMIN in the list refused before any write', r.status === 2 && /SUPER_ADMIN/.test(r.stderr) && eq(antes, await snap()));
r = run({ clinicas: [...clin, s(cG)], usuarios: usu }, EXEC);
confere('Gerenciadora in the list refused before any write', r.status === 2 && /Gerenciadora/.test(r.stderr) && eq(antes, await snap()));
r = run({ clinicas: clin, usuarios: usu.slice(0, 3) }, EXEC);
confere('user of a listed clinic missing from the list refused before any write', r.status === 2 && eq(antes, await snap()));

r = run({ clinicas: clin, usuarios: usu });
confere('default mode (no --executar) writes nothing', r.status === 0 && /COUNT ONLY/.test(r.stdout) && eq(antes, await snap()));
confere('count shows both forms of clinicaId', /documentos_emitidos\s+4\s+\(string 0, ObjectId 4\)/.test(r.stdout) && /agendamentos\s+6\s+\(string 3, ObjectId 3\)/.test(r.stdout));
const orfaosAntesTxt = r.stdout.split('ORPHANS BEFORE')[1] ?? '';
confere('pre-existing orphans are reported by form, before anything', /pacientes\s+2\s+\(string 1, ObjectId 1\)/.test(orfaosAntesTxt) && /documentos_emitidos\s+1\s+\(string 0, ObjectId 1\)/.test(orfaosAntesTxt));

r = run({ clinicas: clin, usuarios: usu }, ['--executar']);
confere('--executar without --export-conferida refused (exit 1), nothing written', r.status === 1 && eq(antes, await snap()));
r = run({ clinicas: clin, usuarios: usu }, ['--export-conferida']);
confere('--export-conferida without --executar writes nothing', r.status === 0 && eq(antes, await snap()));

r = run({ clinicas: clin, usuarios: usu }, EXEC);
const depois = await snap();
const esperado = { clinicas: 1, users: 2, pacientes: 3, agendamentos: 1, prontuarios: 1, prontuario_addendums: 1, documentos_emitidos: 2, notificacoes: 1, salas_telemedicina: 1, sinais_telemedicina: 1, audit_logs: 5, inscricoes_teste: 3 };
confere('execution exits 0', r.status === 0);
confere('survivors are exactly the Gerenciadora, super-admin, preserved collections and pre-existing orphans', eq(esperado, depois));
confere('Gerenciadora (with its document), SUPER_ADMIN and the Gerenciadora user are intact', !!(await db.collection('clinicas').findOne({ _id: cG, nome: 'Gerenciadora', cnpj: 'DOC-FICT' })) && !!(await db.collection('users').findOne({ _id: uSA })) && !!(await db.collection('users').findOne({ _id: uG })));
confere('listed records went to 0 (count after) and nothing was flagged', /COUNT AFTER[\s\S]*users\s+0[\s\S]*clinicas\s+0/.test(r.stdout) && !/ORPHANS CHANGED|SOMETHING REMAINS/.test(r.stderr));
const orfaosDepoisTxt = r.stdout.split('ORPHANS AFTER')[1] ?? '';
confere('orphans after equal orphans before (the deletion created none)', /pacientes\s+2\s+\(string 1, ObjectId 1\)/.test(orfaosDepoisTxt) && /documentos_emitidos\s+1\s+\(string 0, ObjectId 1\)/.test(orfaosDepoisTxt));

await client.close();
rmSync(pasta, { recursive: true, force: true });
console.log(falhas.length ? `\n${falhas.length} FAILED` : '\nall assertions held');
process.exit(falhas.length ? 1 : 0);
