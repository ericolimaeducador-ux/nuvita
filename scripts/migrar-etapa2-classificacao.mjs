/**
 * Migração da ETAPA 2 (classificação de área + fluxo clínico) — ESCRITA PARA O ENSAIO DA FASE 3, NÃO EXECUTADA.
 *
 * O que faz, em `pacientes`:
 *  1. classificacoes: quem não tem o campo (ou o tem vazio) recebe ['IU']. O usuário confirmou que TODOS os dados
 *     atuais são exclusivamente incontinência urinária. Quem já tem classificacoes NÃO é tocado.
 *  2. etapaFluxo / etapaFluxoDesde: valores já gravados (Nuvita antigo) são PRESERVADOS. Só pacientes elegíveis
 *     (classificacoes == ['IU']) que ainda não têm etapa recebem AGUARDANDO_ATENDIMENTO, com etapaFluxoDesde = criadoEm.
 *     Valor de etapaFluxo fora do enum é só REPORTADO (nunca sobrescrito).
 *  3. Cria o índice { clinicaId: 1, etapaFluxo: 1, criadoEm: -1 } (autoIndex fica desligado fora de development).
 *
 * Idempotente: rodar de novo não altera nada. Por padrão roda em SIMULAÇÃO (dry-run): só conta e mostra.
 * Para gravar, passe --apply. Nenhum documento é apagado; só são feitos $set nos campos acima.
 *
 * Como rodar no ENSAIO (banco de ensaio restaurado do dump, NUNCA direto no banco real sem backup):
 *   MONGODB_URI="<uri do banco de ENSAIO>" node scripts/migrar-etapa2-classificacao.mjs            # simulação
 *   MONGODB_URI="<uri do banco de ENSAIO>" node scripts/migrar-etapa2-classificacao.mjs --apply    # grava
 * Opcional: CLINICA_ID="<id>" restringe a uma clínica.
 *
 * Conferência depois: o resumo impresso no fim deve mostrar semClassificacao=0 e elegiveisSemEtapa=0.
 */
import { MongoClient } from 'mongodb';

const ETAPAS_VALIDAS = [
  'aguardando_atendimento',
  'avaliacao_iu',
  'apto_aguardando_contato',
  'entrevista_agendada',
  'aguardando_documentos',
  'aguardando_consulta_medica',
  'aguardando_entrega',
  'nao_elegivel',
  'concluido',
];

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Defina MONGODB_URI (banco de ENSAIO).');
  process.exit(1);
}
const aplicar = process.argv.includes('--apply');
const clinicaId = process.env.CLINICA_ID;

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const pacientes = client.db().collection('pacientes');
    const escopo = clinicaId ? { clinicaId } : {};
    console.log(`Modo: ${aplicar ? 'APLICAR (--apply)' : 'SIMULAÇÃO (dry-run)'} | escopo: ${clinicaId ?? 'todas as clínicas'}`);

    const total = await pacientes.countDocuments(escopo);

    // 1) classificacoes ausente ou vazia -> ['IU']
    const semClassificacao = { ...escopo, $or: [{ classificacoes: { $exists: false } }, { classificacoes: { $size: 0 } }] };
    const nSemClassificacao = await pacientes.countDocuments(semClassificacao);
    if (aplicar && nSemClassificacao > 0) {
      const r = await pacientes.updateMany(semClassificacao, { $set: { classificacoes: ['IU'] } });
      console.log(`classificacoes=['IU'] definido em ${r.modifiedCount} paciente(s).`);
    }

    // 2) elegíveis (== ['IU']) sem etapa -> AGUARDANDO_ATENDIMENTO (etapaFluxoDesde = criadoEm)
    const elegiveisSemEtapa = {
      ...escopo,
      classificacoes: ['IU'],
      $or: [{ etapaFluxo: { $exists: false } }, { etapaFluxo: null }],
    };
    // Na simulação os pacientes do passo 1 ainda não têm ['IU']; contamos os dois grupos juntos para o relatório.
    const nElegiveisSemEtapa = aplicar
      ? await pacientes.countDocuments(elegiveisSemEtapa)
      : await pacientes.countDocuments({
          ...escopo,
          $and: [
            { $or: [{ classificacoes: ['IU'] }, { classificacoes: { $exists: false } }, { classificacoes: { $size: 0 } }] },
            { $or: [{ etapaFluxo: { $exists: false } }, { etapaFluxo: null }] },
          ],
        });
    if (aplicar && nElegiveisSemEtapa > 0) {
      const r = await pacientes.updateMany(elegiveisSemEtapa, [
        { $set: { etapaFluxo: 'aguardando_atendimento', etapaFluxoDesde: { $ifNull: ['$criadoEm', '$$NOW'] } } },
      ]);
      console.log(`etapaFluxo=aguardando_atendimento definido em ${r.modifiedCount} paciente(s).`);
    }

    // etapas fora do enum: só reporta
    const etapaInvalida = await pacientes.countDocuments({
      ...escopo,
      etapaFluxo: { $exists: true, $nin: [...ETAPAS_VALIDAS, null] },
    });

    // 3) índice composto
    if (aplicar) {
      const nome = await pacientes.createIndex({ clinicaId: 1, etapaFluxo: 1, criadoEm: -1 });
      console.log(`Índice garantido: ${nome}`);
    }

    // Resumo final (no modo --apply reflete o estado depois da gravação)
    const resumo = {
      totalPacientes: total,
      semClassificacao: aplicar ? await pacientes.countDocuments(semClassificacao) : nSemClassificacao,
      elegiveisSemEtapa: aplicar ? await pacientes.countDocuments(elegiveisSemEtapa) : nElegiveisSemEtapa,
      etapaForaDoEnum: etapaInvalida,
    };
    console.log(aplicar ? 'RESUMO (depois):' : 'RESUMO (a fazer; nada foi gravado):', resumo);
    if (etapaInvalida > 0) console.warn('ATENÇÃO: há etapaFluxo fora do enum — revisar manualmente (não foi alterado).');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
