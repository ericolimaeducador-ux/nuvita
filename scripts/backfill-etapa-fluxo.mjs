/**
 * Backfill de etapaFluxo/etapaFluxoDesde para pacientes existentes que ainda
 * não têm o campo (pacientes criados antes da introdução do fluxo clínico
 * com etapas persistidas). Infere a etapa mais provável a partir dos
 * registros já existentes nas coleções do pipeline.
 *
 * A inferência não tenta adivinhar entrevista/documentos/consulta médica no
 * legado (não dá pra saber com certeza se o paciente já passou por essas
 * etapas) — nesses casos o paciente fica em APTO_AGUARDANDO_CONTATO e a
 * secretária avança manualmente.
 *
 * Uso: MONGODB_URI="<uri>" node scripts/backfill-etapa-fluxo.mjs
 * Idempotente — só toca pacientes sem etapaFluxo definido.
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('Defina MONGODB_URI.'); process.exit(1); }

const ETAPA = {
  AGUARDANDO_ATENDIMENTO: 'aguardando_atendimento',
  AVALIACAO_IU: 'avaliacao_iu',
  APTO_AGUARDANDO_CONTATO: 'apto_aguardando_contato',
  AGUARDANDO_ENVIO_JURIDICO: 'aguardando_envio_juridico',
  PROCESSO_JURIDICO: 'processo_juridico',
  NAO_ELEGIVEL: 'nao_elegivel',
  CONCLUIDO: 'concluido',
};

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const pacientes = db.collection('pacientes');
  const avaliacoes = db.collection('avaliacoes_iu');
  const followups = db.collection('followups');
  const laudos = db.collection('laudos_medicos');
  const processos = db.collection('processos_juridicos');
  const entregas = db.collection('entregas');

  const semEtapa = await pacientes.find({ etapaFluxo: { $exists: false } }).toArray();
  console.log(`Pacientes sem etapaFluxo: ${semEtapa.length}`);

  let atualizados = 0;
  for (const p of semEtapa) {
    const pacienteId = p._id.toString();

    const [entregaEntregue, processo, laudo, followupRecente, avaliacao] = await Promise.all([
      entregas.findOne({ pacienteId, status: 'entregue' }),
      processos.findOne({ pacienteId }, { sort: { criadoEm: -1 } }),
      laudos.findOne({ pacienteId }, { sort: { dataLaudo: -1 } }),
      followups.findOne({ pacienteId }, { sort: { dataFollowup: -1 } }),
      avaliacoes.findOne({ pacienteId }, { sort: { dataAtendimento: -1 } }),
    ]);

    let etapa = ETAPA.AGUARDANDO_ATENDIMENTO;
    let desde = p.criadoEm;

    if (entregaEntregue && processo) {
      etapa = ETAPA.CONCLUIDO;
      desde = entregaEntregue.atualizadoEm ?? entregaEntregue.dataEntrega;
    } else if (processo) {
      etapa = ETAPA.PROCESSO_JURIDICO;
      desde = processo.criadoEm;
    } else if (laudo) {
      etapa = ETAPA.AGUARDANDO_ENVIO_JURIDICO;
      desde = laudo.dataLaudo ?? laudo.criadoEm;
    } else if (followupRecente?.statusElegibilidade === 'nao_elegivel') {
      etapa = ETAPA.NAO_ELEGIVEL;
      desde = followupRecente.dataFollowup;
    } else if (followupRecente?.statusElegibilidade === 'elegivel') {
      etapa = ETAPA.APTO_AGUARDANDO_CONTATO;
      desde = followupRecente.dataFollowup;
    } else if (avaliacao) {
      etapa = ETAPA.AVALIACAO_IU;
      desde = avaliacao.dataAtendimento ?? avaliacao.criadoEm;
    }

    await pacientes.updateOne(
      { _id: p._id },
      { $set: { etapaFluxo: etapa, etapaFluxoDesde: desde ?? p.criadoEm } },
    );
    atualizados += 1;
  }

  console.log(`OK — ${atualizados} pacientes atualizados.`);

  const contagemPorEtapa = await pacientes.aggregate([
    { $group: { _id: '$etapaFluxo', total: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]).toArray();
  console.log('Distribuição atual por etapa:', contagemPorEtapa);

  await client.close();
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1); });
