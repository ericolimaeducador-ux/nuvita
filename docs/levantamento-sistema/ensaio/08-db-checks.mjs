// Consultas de apoio ao ensaio, SOMENTE no Mongo local (trava de host). Uso: node 08-db-checks.mjs <tema>
import { MongoClient } from 'mongodb';
const uri = process.env.MONGODB_URI ?? '';
if (!/^mongodb:\/\/(?:[^@/]*@)?(127\.0\.0\.1|localhost)(:\d+)?\//i.test(uri)) { console.error('ABORTADO: MONGODB_URI não é local'); process.exit(1); }
const c = new MongoClient(uri); await c.connect(); const db = c.db();
const tema = process.argv[2];
if (tema === 'tele') {
  const n = await db.collection('notificacoes').find().sort({ _id: -1 }).limit(5).toArray();
  for (const x of n) console.log('notificacao', x.tipo, x.status, x.canal, '| link com /tele/ no documento:', /tele\//.test(JSON.stringify(x)));
  const s = await db.collection('salas_telemedicina').find().toArray();
  console.log('salas:', s.length, '| tokens (UUID de 36 chars) em texto puro no banco:', s.every((x) => typeof x.tokenPaciente === 'string' && x.tokenPaciente.length === 36));
}
if (tema === 'ia') {
  for (const col of ['registros_uso_ia', 'decisoes_uso_ia']) {
    const docs = await db.collection(col).find().toArray();
    console.log(col, docs.length, docs[0] ? 'campos: ' + Object.keys(docs[0]).join(',') : '');
  }
}
if (tema === 'audit') {
  const ev = await db.collection('audit_logs').aggregate([{ $group: { _id: '$event', n: { $sum: 1 } } }, { $sort: { n: -1 } }]).toArray();
  console.log(ev.map((e) => `${e._id}:${e.n}`).join('\n'));
}
if (tema === 'pac') {
  const ps = await db.collection('pacientes').find().toArray();
  for (const p of ps) {
    console.log('paciente', p.nome.slice(0, 22).padEnd(24), '| cpf cifrado:', typeof p.cpf === 'string' && !/^\d{3}\.?\d{3}/.test(p.cpf), '| consentimentoLGPD:', JSON.stringify(p.consentimentoLGPD ?? null), '| responsavelLegal:', p.responsavelLegal ? 'sim(' + Object.keys(p.responsavelLegal).join(',') + ')' : 'nao', '| autorizacao:', JSON.stringify(p.autorizacaoResponsavel ?? null));
  }
  const ev = await db.collection('audit_logs').find({ event: { $in: ['PATIENT_GUARDIAN_AUTHORIZATION_SET', 'TERMS_ACCEPTED', 'PATIENT_CREATED', 'PATIENT_EXPORTED', 'MEDICAL_RECORD_SIGNED', 'TICKET_OPENED'] } }).sort({ _id: 1 }).toArray();
  for (const e of ev) console.log('audit', e.event, '| por', e.email, '|', e.timestamp?.toISOString?.() ?? e.timestamp, '|', JSON.stringify(e.metadata ?? {}).slice(0, 140));
}
await c.close();
