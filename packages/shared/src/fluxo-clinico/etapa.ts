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
