/**
 * Modalidade do atendimento prestado pela clinica.
 * O sistema atende tres frentes de trabalho:
 * - MEDICO: consultas e procedimentos clinicos
 * - ENFERMAGEM: atendimento e procedimentos de enfermagem
 * - PSICOLOGIA: atendimento psicologico / psicoterapia (extra do sistema)
 */
export enum ModalidadeAtendimento {
  MEDICO = 'medico',
  ENFERMAGEM = 'enfermagem',
  PSICOLOGIA = 'psicologia',
}

export const MODALIDADES_ATENDIMENTO = Object.values(ModalidadeAtendimento);

export const ROTULO_MODALIDADE: Record<ModalidadeAtendimento, string> = {
  [ModalidadeAtendimento.MEDICO]: 'Atendimento Medico',
  [ModalidadeAtendimento.ENFERMAGEM]: 'Atendimento de Enfermagem',
  [ModalidadeAtendimento.PSICOLOGIA]: 'Atendimento Psicologico',
};
