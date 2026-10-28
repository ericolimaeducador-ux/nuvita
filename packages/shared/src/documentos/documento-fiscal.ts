/**
 * Documento fiscal de quem contrata o sistema: CNPJ (pessoa jurídica) ou CPF
 * (profissional que atende como pessoa física, caso comum na psicologia).
 *
 * ⚠️ SINCRONIA MANUAL com apps/web/src/lib/documento-fiscal.ts — o web não importa
 * packages/shared. Ao mexer aqui, mexer lá: o formulário do super-admin precisa
 * aceitar e recusar exatamente o que a API aceita e recusa.
 *
 * CNPJ alfanumérico: a Receita Federal emite CNPJs com letras desde julho de 2026.
 * Os 12 primeiros caracteres podem ser [0-9A-Z]; os 2 dígitos verificadores seguem
 * numéricos. Cálculo: valor de cada caractere = código ASCII − 48, módulo 11 com os
 * mesmos pesos do CNPJ numérico (que continua válido).
 * Fonte: Receita Federal, "Perguntas e respostas — CNPJ alfanumérico".
 */

export enum TipoDocumentoFiscal {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
}

/** Maiúsculas, sem pontuação nem espaços. Não valida. */
export function normalizarDocumentoFiscal(valor: string): string {
  return valor.toUpperCase().replace(/[.\-/\s]/g, '');
}

function digitoModulo11(valores: number[], pesos: number[]): number {
  const soma = valores.reduce((acc, v, i) => acc + v * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(valor: string): boolean {
  const cpf = normalizarDocumentoFiscal(valor);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const n = cpf.split('').map(Number);
  const d1 = digitoModulo11(n.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoModulo11(n.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === n[9] && d2 === n[10];
}

const PESOS_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CNPJ_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** CNPJ numérico ou alfanumérico. */
export function cnpjValido(valor: string): boolean {
  const cnpj = normalizarDocumentoFiscal(valor);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) return false;
  const v = cnpj.split('').map((c) => c.charCodeAt(0) - 48);
  const d1 = digitoModulo11(v.slice(0, 12), PESOS_CNPJ_1);
  const d2 = digitoModulo11([...v.slice(0, 12), d1], PESOS_CNPJ_2);
  return d1 === v[12] && d2 === v[13];
}

export function documentoFiscalValido(tipo: TipoDocumentoFiscal, valor: string): boolean {
  return tipo === TipoDocumentoFiscal.CPF ? cpfValido(valor) : cnpjValido(valor);
}

// Só os 2 últimos dígitos aparecem (a auditoria nunca guarda o documento inteiro).
export function mascararDocumentoFiscal(tipo: TipoDocumentoFiscal, valor: string): string {
  const d = normalizarDocumentoFiscal(valor);
  const fim = d.slice(-2);
  return tipo === TipoDocumentoFiscal.CPF ? `***.***.***-${fim}` : `**.***.***/****-${fim}`;
}

/** 000.000.000-00 ou 00.000.000/0000-00 (aceita letras no CNPJ). Valor inválido volta normalizado. */
export function formatarDocumentoFiscal(tipo: TipoDocumentoFiscal, valor: string): string {
  const d = normalizarDocumentoFiscal(valor);
  if (tipo === TipoDocumentoFiscal.CPF && d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (tipo === TipoDocumentoFiscal.CNPJ && d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return d;
}
