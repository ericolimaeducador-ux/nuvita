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
}

export interface Agendamento {
  id: string;
  clinicaId: string;
  pacienteId: string;
  medicoId: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  tipo: TipoAgendamento;
  status: StatusAgendamento;
  observacoes?: string;
  motivoCancelamento?: string;
  criadoPor: string;
  criadoEm: Date;
  atualizadoEm?: Date;
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
