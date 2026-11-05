// Financeiro de PACIENTE do Estomaterapia: REGISTRO de cobranças + AVISOS. O sistema NÃO recebe dinheiro de paciente
// (a clínica recebe por fora, na máquina de cartão própria): não há gateway, link de pagamento nem checkout aqui.
// Independente do módulo `financeiro` legado (livro-caixa) e do financeiro da psicologia, que não são tocados.
//
// Valores em CENTAVOS (inteiros), como nas entregas. Nada é apagado fisicamente: cancelar é lógico (status + motivo).

export enum TipoCobranca {
  CONSULTA_AVALIACAO = 'consulta_avaliacao',
  // Gerada SÓ pela assinatura da consulta de enfermagem (etapa 5a); não é criada manualmente.
  CONSULTA_ENFERMAGEM = 'consulta_enfermagem',
  PACOTE_MENSAL = 'pacote_mensal',
  OUTRO = 'outro',
}

export enum FormaPagamentoCobranca {
  A_VISTA = 'a_vista',
  PIX = 'pix',
  CREDITO = 'credito',
  BOLETO = 'boleto',
  OUTRO = 'outro',
}

/**
 * pendente -> enviada (aviso enviado) -> paga | cancelada. `vencida` NÃO é gravada: é DERIVADA na leitura (pendente ou
 * enviada com vencimento anterior a hoje), para nunca ficar defasada sem um job.
 */
export enum StatusCobranca {
  PENDENTE = 'pendente',
  ENVIADA = 'enviada',
  PAGA = 'paga',
  VENCIDA = 'vencida',
  CANCELADA = 'cancelada',
}

/** Item do futuro checklist -> valor: a soma dos itens pode preencher o valor da cobrança (ver somaItens). */
export interface ItemCobranca {
  descricao: string;
  valorCentavos: number;
}

export interface Cobranca {
  id: string;
  clinicaId: string;
  pacienteId: string;
  tipo: TipoCobranca;
  /** Texto livre: o que o pacote/cobrança inclui. TODO(conteudo): rótulos/orientações definidos na etapa de conteúdo. */
  descricao: string;
  valorCentavos: number;
  /** Vazio hoje; quando usado, a soma dos itens é o valor (a API recusa divergência). */
  itens: ItemCobranca[];
  formaPagamento?: FormaPagamentoCobranca;
  parcelas?: number;
  vencimento: Date;
  /** Status GRAVADO (sem `vencida`); a leitura devolve o status efetivo via statusEfetivo(). */
  status: StatusCobranca;
  /** Vínculo OPCIONAL ao atendimento/plano. Referência SEM validação dura por ora (atendimento/prontuário: etapa 5). */
  atendimentoId?: string;
  planoId?: string;
  /** Consulta de enfermagem que gerou a cobrança (etapa 5a). No máximo UMA cobrança por consulta (índice único parcial). */
  consultaId?: string;
  criadoPor: string;
  enviadaEm?: Date;
  pagaEm?: Date;
  pagoPor?: string;
  canceladaEm?: Date;
  canceladoPor?: string;
  motivoCancelamento?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/** Soma dos itens em centavos (0 se vazio). Base do futuro "checklist -> valor". */
export function somaItens(itens: readonly ItemCobranca[] | undefined): number {
  return (itens ?? []).reduce((total, item) => total + item.valorCentavos, 0);
}

/** Status efetivo: pendente/enviada com vencimento já passado (antes de hoje, dia de calendário em UTC) vira `vencida`. */
export function statusEfetivo(c: Pick<Cobranca, 'status' | 'vencimento'>, hoje: Date = new Date()): StatusCobranca {
  if (c.status !== StatusCobranca.PENDENTE && c.status !== StatusCobranca.ENVIADA) return c.status;
  const inicioDeHoje = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  return c.vencimento.getTime() < inicioDeHoje ? StatusCobranca.VENCIDA : c.status;
}
