/**
 * Limpeza de dados da funcionalidade de advocacia, removida do código em
 * 2026-07-26 (commit 1540305). Roda uma única vez, contra qualquer ambiente
 * apontado por MONGODB_URI:
 *
 *   1) Migra pacientes presos nas etapas jurídicas antigas
 *      (aguardando_envio_juridico, processo_juridico) para a nova etapa
 *      única aguardando_entrega.
 *   2) Apaga usuários com papel ADVOGADO.
 *   3) Dropa as coleções processos_juridicos e anotacoes_juridicas.
 *
 * Idempotente — rodar de novo não altera nada (etapas já migradas ficam
 * como estão; usuários ADVOGADO e as coleções já não existirão).
 *
 * Uso: MONGODB_URI="<uri>" node scripts/remove-advocacia.mjs
 * Modo dry-run (só mostra o que faria, não altera nada): --dry-run
 *
 * Se a resolução do SRV do Atlas falhar (Node usando 127.0.0.1 como DNS —
 * comum em máquinas Windows), defina DNS_SERVERS="8.8.8.8,1.1.1.1".
 */
import dns from 'node:dns';
import { MongoClient } from 'mongodb';

if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(','));

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('Defina MONGODB_URI.'); process.exit(1); }

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  console.log(`Conectado em: ${db.databaseName}${dryRun ? '  [DRY RUN — nada será alterado]' : ''}`);

  // 1) Migrar pacientes das etapas jurídicas antigas para aguardando_entrega
  const pacientes = db.collection('pacientes');
  const etapasAntigas = ['aguardando_envio_juridico', 'processo_juridico'];
  const presos = await pacientes.countDocuments({ etapaFluxo: { $in: etapasAntigas } });
  console.log(`Pacientes em etapas jurídicas antigas: ${presos}`);
  if (presos > 0 && !dryRun) {
    const r = await pacientes.updateMany(
      { etapaFluxo: { $in: etapasAntigas } },
      { $set: { etapaFluxo: 'aguardando_entrega' } },
    );
    console.log(`  ✓ ${r.modifiedCount} paciente(s) migrado(s) para aguardando_entrega`);
  }

  // 2) Apagar usuários ADVOGADO
  const users = db.collection('users');
  const advogados = await users.find({ papel: 'ADVOGADO' }, { projection: { email: 1 } }).toArray();
  console.log(`Usuários ADVOGADO encontrados: ${advogados.length}`);
  advogados.forEach((u) => console.log(`  - ${u.email}`));
  if (advogados.length > 0 && !dryRun) {
    const r = await users.deleteMany({ papel: 'ADVOGADO' });
    console.log(`  ✓ ${r.deletedCount} usuário(s) ADVOGADO removido(s)`);
  }

  // 3) Dropar coleções de processo jurídico e anotações jurídicas
  for (const nome of ['processos_juridicos', 'anotacoes_juridicas']) {
    const existe = (await db.listCollections({ name: nome }).toArray()).length > 0;
    const total = existe ? await db.collection(nome).countDocuments() : 0;
    console.log(`Coleção ${nome}: ${existe ? `existe (${total} documento(s))` : 'não existe'}`);
    if (existe && !dryRun) {
      await db.collection(nome).drop();
      console.log(`  ✓ Coleção ${nome} removida`);
    }
  }

  console.log(dryRun ? '\nDry run concluído — nada foi alterado.' : '\nOK — limpeza concluída.');
  await client.close();
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1); });
