/**
 * Modalidade do atendimento prestado pela clinica.
 * O sistema atende quatro frentes de trabalho:
 * - MEDICO: consultas e procedimentos clinicos
 * - ENFERMAGEM: atendimento e procedimentos de enfermagem
 * - JURIDICO: atendimento juridico / consultoria
 * - PSICOLOGIA: atendimento psicologico / psicoterapia (extra do sistema)
 */
export enum ModalidadeAtendimento {
  MEDICO = 'medico',
  ENFERMAGEM = 'enfermagem',
  JURIDICO = 'juridico',
  PSICOLOGIA = 'psicologia',
}

export const MODALIDADES_ATENDIMENTO = Object.values(ModalidadeAtendimento);

export const ROTULO_MODALIDADE: Record<ModalidadeAtendimento, string> = {
  [ModalidadeAtendimento.MEDICO]: 'Atendimento Medico',
  [ModalidadeAtendimento.ENFERMAGEM]: 'Atendimento de Enfermagem',
  [ModalidadeAtendimento.JURIDICO]: 'Atendimento Juridico',
  [ModalidadeAtendimento.PSICOLOGIA]: 'Atendimento Psicologico',
};
