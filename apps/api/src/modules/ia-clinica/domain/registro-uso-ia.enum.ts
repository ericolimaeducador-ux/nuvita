/**
 * Tipo de uso da IA clínica que gerou um registro de auditoria.
 *
 * Os dois valores espelham os dois casos de uso do módulo: sugestão de
 * abordagem terapêutica e prescrição de cuidados. Valores string estáveis —
 * são persistidos em registros_uso_ia e no metadata do audit_logs.
 */
export enum TipoUsoIA {
  SUGESTAO_ABORDAGEM = 'SUGESTAO_ABORDAGEM',
  PRESCRICAO_CUIDADOS = 'PRESCRICAO_CUIDADOS',
}

/**
 * Decisão humana registrada pelo enfermeiro sobre uma sugestão da IA.
 *
 * `ACEITA` — o enfermeiro optou por usar a sugestão (o texto é copiado para o
 * campo correspondente). `DESCARTADA` — o enfermeiro descartou a sugestão da
 * tela. Uma decisão por registro, imutável.
 */
export enum DecisaoUsoIA {
  ACEITA = 'ACEITA',
  DESCARTADA = 'DESCARTADA',
}
