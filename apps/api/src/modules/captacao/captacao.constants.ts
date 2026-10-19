/** Códigos dos enfermeiros captadores de campo (dropdown do formulário público). */
export const CODIGOS_ENFERMEIRO_CAPTADOR = [
  'ENF-00126',
  'ENF-00226',
  'ENF-00326',
  'ENF-00426',
  'ENF-00526',
  'ENF-00626',
  'ENF-00726',
  'ENF-00826',
  'ENF-00926',
  'ENF-01026',
] as const;

export type CodigoEnfermeiroCaptador = (typeof CODIGOS_ENFERMEIRO_CAPTADOR)[number];

export const STATUS_CAPTACAO = ['pendente', 'exportado'] as const;
export type StatusCaptacao = (typeof STATUS_CAPTACAO)[number];
