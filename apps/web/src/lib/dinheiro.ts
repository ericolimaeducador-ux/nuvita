/** Reais digitados ("1.234,56" ou "220") -> centavos inteiros; NaN se inválido ou negativo. */
export function reaisParaCentavos(texto: string): number {
  const n = Number(texto.trim().replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && texto.trim() !== '' ? Math.round(n * 100) : NaN;
}

/** Centavos -> texto editável em reais ("220,00"). */
export function centavosParaInput(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}
