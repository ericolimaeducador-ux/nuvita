/**
 * Modalidade do atendimento prestado pela clinica. Nuvita-psi atende só
 * psicologia — o campo continua existindo (schemas/telemedicina já o usam)
 * para não forçar uma migração de dado, mas hoje só tem um valor possível.
 */
export enum ModalidadeAtendimento {
  PSICOLOGIA = 'psicologia',
}

export const MODALIDADES_ATENDIMENTO = Object.values(ModalidadeAtendimento);

export const ROTULO_MODALIDADE: Record<ModalidadeAtendimento, string> = {
  [ModalidadeAtendimento.PSICOLOGIA]: 'Atendimento Psicologico',
};
