import { FormaPagamento, StatusLancamento } from './lancamento.entity';

/** O acompanhamento é vendido em pacotes fechados de sessões. */
export const SESSOES_POR_CICLO = 4;

/** Ciclo a que pertence a n-ésima sessão (1..4 → 1; 5..8 → 2; …). */
export function cicloDaSessao(numeroDaSessao: number): number {
  return Math.floor((numeroDaSessao - 1) / SESSOES_POR_CICLO) + 1;
}

/**
 * Preço de sessão do psicólogo. É por profissional, não por clínica: o módulo
 * atende autônomos, e cada um cobra o seu valor.
 */
export interface ConfigPsicologo {
  id: string;
  clinicaId: string;
  profissionalId: string;
  valorSessao: number;
  atualizadoEm: Date;
}

/**
 * Situação do ciclo que o paciente está prestes a cursar. A cobrança é
 * pré-paga: o ciclo é pago e só então as 4 sessões acontecem.
 */
export enum StatusCiclo {
  /** Não existe cobrança para o ciclo atual — é hora de cobrar. */
  A_COBRAR = 'a_cobrar',
  /** Cobrança emitida, ainda não recebida. */
  AGUARDANDO_PAGAMENTO = 'aguardando_pagamento',
  /** Ciclo atual pago — pode atender. */
  EM_DIA = 'em_dia',
}

export interface CobrancaCiclo {
  id: string;
  ciclo: number;
  valor: number;
  status: StatusLancamento;
  formaPagamento?: FormaPagamento;
  vencimento?: Date;
  recebidoEm?: Date;
  criadoEm: Date;
}

/** Uma linha do painel: onde o paciente está no acompanhamento e no pagamento. */
export interface PacientePsicologia {
  pacienteId: string;
  pacienteNome?: string;
  /** Sessões já registradas em prontuário. */
  sessoesRealizadas: number;
  /** Número da sessão que acontecerá no próximo atendimento. */
  proximaSessao: number;
  /** Ciclo da próxima sessão. */
  cicloAtual: number;
  /** Quantas das 4 sessões do ciclo atual já foram feitas. */
  sessoesNoCiclo: number;
  /** Quantas faltam para fechar o ciclo atual. */
  sessoesAteFecharCiclo: number;
  statusCiclo: StatusCiclo;
  /** Soma das cobranças pendentes do paciente. */
  valorEmAberto: number;
  primeiraSessaoEm?: Date;
  ultimaSessaoEm?: Date;
  cobrancas: CobrancaCiclo[];
}

export interface PainelPsicologia {
  valorSessao?: number;
  sessoesPorCiclo: number;
  /** Recebido no mês corrente. */
  recebidoNoMes: number;
  /** Total pendente de recebimento (todas as cobranças em aberto). */
  aReceber: number;
  /** Pacientes cujo ciclo atual ainda não foi cobrado. */
  ciclosACobrar: number;
  pacientes: PacientePsicologia[];
}
