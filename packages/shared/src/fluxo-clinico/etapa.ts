import { Papel } from '../auth/papel.enum';

/**
 * Etapas do pipeline clínico de incontinência urinária (cadastro -> alta
 * judicializada). Fonte única usada pelo backend para decidir transições; o
 * frontend mantém uma cópia manual em apps/web/src/types.ts (mesmo padrão já
 * usado para todo enum de domínio no projeto).
 */
export enum EtapaFluxoClinico {
  AGUARDANDO_ATENDIMENTO = 'aguardando_atendimento',
  AVALIACAO_IU = 'avaliacao_iu',
  APTO_AGUARDANDO_CONTATO = 'apto_aguardando_contato',
  ENTREVISTA_AGENDADA = 'entrevista_agendada',
  AGUARDANDO_DOCUMENTOS = 'aguardando_documentos',
  AGUARDANDO_CONSULTA_MEDICA = 'aguardando_consulta_medica',
  AGUARDANDO_ENVIO_JURIDICO = 'aguardando_envio_juridico',
  PROCESSO_JURIDICO = 'processo_juridico',
  // Rank alto de propósito (perto do fim, não logo após AVALIACAO_IU): assim
  // a comparação de rank em podeAvancarPara() já trata esta etapa como
  // terminal, sem precisar de um caso especial na função de comparação.
  NAO_ELEGIVEL = 'nao_elegivel',
  CONCLUIDO = 'concluido',
}

/** Ordem estrita do pipeline — usada para impedir regressão de etapa. */
export const ORDEM_ETAPAS_FLUXO: EtapaFluxoClinico[] = [
  EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO,
  EtapaFluxoClinico.AVALIACAO_IU,
  EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO,
  EtapaFluxoClinico.ENTREVISTA_AGENDADA,
  EtapaFluxoClinico.AGUARDANDO_DOCUMENTOS,
  EtapaFluxoClinico.AGUARDANDO_CONSULTA_MEDICA,
  EtapaFluxoClinico.AGUARDANDO_ENVIO_JURIDICO,
  EtapaFluxoClinico.PROCESSO_JURIDICO,
  EtapaFluxoClinico.NAO_ELEGIVEL,
  EtapaFluxoClinico.CONCLUIDO,
];

/** Prazos (em dias) só para as etapas com SLA definido pelo negócio. */
export const PRAZO_DIAS_POR_ETAPA: Partial<Record<EtapaFluxoClinico, number>> = {
  [EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO]: 10,
  [EtapaFluxoClinico.AVALIACAO_IU]: 20,
  [EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO]: 15,
  [EtapaFluxoClinico.AGUARDANDO_DOCUMENTOS]: 10,
  [EtapaFluxoClinico.AGUARDANDO_CONSULTA_MEDICA]: 15, // prazo médio, não SLA duro
};

/**
 * Avanço MANUAL — botão explícito "Avançar etapa" na tela do paciente, para
 * quando o evento de negócio que normalmente dispara a transição automática
 * (ver PacientesService.avancarEtapaFluxo e os hooks em cada módulo) não tem
 * correspondência exata com uma ação real do dia a dia (ex: "fiz contato por
 * telefone" não gera nenhum registro no sistema). Mapeia cada etapa para a
 * ÚNICA próxima etapa "padrão" — por isso ficam de fora etapas cujo gatilho
 * automático produz um DOCUMENTO clínico/legal essencial (pular via botão
 * perderia esse registro, não é só uma formalidade administrativa):
 * - AGUARDANDO_ATENDIMENTO: o gatilho real é criar a Avaliação IU (ficha
 *   clínica completa) — teria que existir sem nunca ter sido preenchida.
 * - AVALIACAO_IU: bifurca em elegível/não-elegível pelo formulário de
 *   Follow-up, que já é uma ação manual explícita — um botão genérico
 *   "avançar" seria ambíguo aqui.
 * - AGUARDANDO_CONSULTA_MEDICA: o gatilho real é criar o Laudo Médico
 *   (CID-10 + justificativa médica) — documento que sustenta a ação
 *   judicial; pular sem ele inviabiliza o processo mais adiante.
 * - PROCESSO_JURIDICO -> CONCLUIDO: exige confirmar a entrega definitiva E o
 *   processo estar GANHO (consequência financeira/jurídica formal demais
 *   para um botão genérico) — só a rota automática faz essa transição.
 * - NAO_ELEGIVEL e CONCLUIDO: terminais, não têm próxima etapa.
 */
export const PROXIMA_ETAPA_MANUAL: Partial<Record<EtapaFluxoClinico, EtapaFluxoClinico>> = {
  [EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO]: EtapaFluxoClinico.ENTREVISTA_AGENDADA,
  [EtapaFluxoClinico.ENTREVISTA_AGENDADA]: EtapaFluxoClinico.AGUARDANDO_DOCUMENTOS,
  [EtapaFluxoClinico.AGUARDANDO_DOCUMENTOS]: EtapaFluxoClinico.AGUARDANDO_CONSULTA_MEDICA,
  [EtapaFluxoClinico.AGUARDANDO_ENVIO_JURIDICO]: EtapaFluxoClinico.PROCESSO_JURIDICO,
};

/** Quem pode acionar o avanço manual a partir de cada etapa (ADMIN sempre pode, adicionado no backend). */
export const PAPEIS_AVANCO_MANUAL: Partial<Record<EtapaFluxoClinico, Papel[]>> = {
  [EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO]: [Papel.SECRETARIA],
  [EtapaFluxoClinico.ENTREVISTA_AGENDADA]: [Papel.SECRETARIA],
  [EtapaFluxoClinico.AGUARDANDO_DOCUMENTOS]: [Papel.SECRETARIA],
  [EtapaFluxoClinico.AGUARDANDO_ENVIO_JURIDICO]: [Papel.ADVOGADO],
};

function rank(etapa: EtapaFluxoClinico): number {
  return ORDEM_ETAPAS_FLUXO.indexOf(etapa);
}

/** Único ponto de decisão: só permite mover para frente no pipeline. */
export function podeAvancarPara(atual: EtapaFluxoClinico, novaEtapa: EtapaFluxoClinico): boolean {
  return rank(novaEtapa) > rank(atual);
}

export interface PrazoEtapaInfo {
  diasLimite?: number;
  diasDecorridos: number;
  diasRestantes?: number;
  atrasado: boolean;
}

/** Calcula a situação de prazo de uma etapa a partir de quando ela começou. */
export function calcularPrazoEtapa(
  etapa: EtapaFluxoClinico,
  etapaDesde: Date,
  agora: Date = new Date(),
): PrazoEtapaInfo {
  const diasLimite = PRAZO_DIAS_POR_ETAPA[etapa];
  const msPorDia = 24 * 60 * 60 * 1000;
  const diasDecorridos = Math.floor((agora.getTime() - etapaDesde.getTime()) / msPorDia);

  if (diasLimite === undefined) {
    return { diasDecorridos, atrasado: false };
  }

  const diasRestantes = diasLimite - diasDecorridos;
  return { diasLimite, diasDecorridos, diasRestantes, atrasado: diasRestantes < 0 };
}
