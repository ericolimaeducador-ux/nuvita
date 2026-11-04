/**
 * Classificação de área do paciente (uma ou mais). Define, por exemplo, quem entra no fluxo clínico
 * de incontinência urinária: só o paciente classificado EXCLUSIVAMENTE como IU.
 */
export enum ClassificacaoArea {
  /** Incontinência urinária. */
  IU = 'IU',
  /** Incontinência fecal. */
  FA = 'FA',
  /** Outras áreas de atuação. */
  OT = 'OT',
}

export const CLASSIFICACOES_AREA = Object.values(ClassificacaoArea);

/**
 * Elegibilidade ao fluxo clínico (DERIVADA, nunca gravada): classificacoes tem exatamente um
 * elemento e ele é IU. Ausente/vazio => não elegível.
 */
export function elegivelFluxoClinico(classificacoes: readonly ClassificacaoArea[] | null | undefined): boolean {
  return !!classificacoes && classificacoes.length === 1 && classificacoes[0] === ClassificacaoArea.IU;
}

/** Igualdade de conjunto (ignora ordem) entre duas listas de classificação. */
export function mesmasClassificacoes(
  a: readonly ClassificacaoArea[] | null | undefined,
  b: readonly ClassificacaoArea[] | null | undefined,
): boolean {
  const x = [...(a ?? [])].sort();
  const y = [...(b ?? [])].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}
