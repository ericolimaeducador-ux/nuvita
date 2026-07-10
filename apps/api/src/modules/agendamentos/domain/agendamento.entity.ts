import { ModalidadeAtendimento } from '../../../../../../packages/shared/src/atendimento';

export { ModalidadeAtendimento };

export enum StatusAgendamento {
  AGENDADO = 'agendado',
  CONFIRMADO = 'confirmado',
  CANCELADO = 'cancelado',
  CONCLUIDO = 'concluido',
  FALTA = 'falta',
}

export enum TipoAgendamento {
  CONSULTA = 'consulta',
  RETORNO = 'retorno',
  EXAME = 'exame',
  PROCEDIMENTO = 'procedimento',
  TELECONSULTA = 'teleconsulta',
  // Enfermagem
  ATENDIMENTO_ENFERMAGEM = 'atendimento_enfermagem',
  PROCEDIMENTO_ENFERMAGEM = 'procedimento_enfermagem',
  // Juridico
  ATENDIMENTO_JURIDICO = 'atendimento_juridico',
  AUDIENCIA = 'audiencia',
  // Fluxo clínico
  ENTREVISTA = 'entrevista',
}

export interface Agendamento {
  id: string;
  clinicaId: string;
  pacienteId: string;
  /** Profissional responsavel (medico, enfermeiro ou advogado conforme a modalidade). */
  medicoId: string;
  modalidade: ModalidadeAtendimento;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  tipo: TipoAgendamento;
  status: StatusAgendamento;
  observacoes?: string;
  motivoCancelamento?: string;
  criadoPor: string;
  criadoEm: Date;
  atualizadoEm?: Date;
  // Preenchidos apenas na leitura (list/findOne) para identificar o paciente com
  // segurança na agenda — nome completo + CPF evitam atender o paciente errado.
  pacienteNome?: string;
  pacienteCpf?: string;
}

export interface BloqueioAgenda {
  id: string;
  clinicaId: string;
  medicoId: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  motivo?: string;
  criadoPor: string;
  criadoEm: Date;
}
