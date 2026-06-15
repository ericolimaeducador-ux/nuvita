import { Agendamento, BloqueioAgenda, StatusAgendamento, TipoAgendamento } from '../../domain/agendamento.entity';

export interface CreateAgendamentoInput {
  clinicaId: string;
  pacienteId: string;
  medicoId: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  tipo: TipoAgendamento;
  observacoes?: string;
  criadoPor: string;
}

export interface UpdateAgendamentoInput {
  dataHoraInicio?: Date;
  dataHoraFim?: Date;
  tipo?: TipoAgendamento;
  observacoes?: string;
  medicoId?: string;
}

export interface ListAgendamentosInput {
  clinicaId: string;
  medicoId?: string;
  pacienteId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  status?: StatusAgendamento;
}

export interface CreateBloqueioInput {
  clinicaId: string;
  medicoId: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  motivo?: string;
  criadoPor: string;
}

export interface AgendamentoRepository {
  create(input: CreateAgendamentoInput): Promise<Agendamento>;
  findById(clinicaId: string, id: string): Promise<Agendamento | null>;
  list(input: ListAgendamentosInput): Promise<Agendamento[]>;
  update(clinicaId: string, id: string, input: UpdateAgendamentoInput): Promise<Agendamento | null>;
  updateStatus(clinicaId: string, id: string, status: StatusAgendamento, motivoCancelamento?: string): Promise<Agendamento | null>;
  createBloqueio(input: CreateBloqueioInput): Promise<BloqueioAgenda>;
  listBloqueios(clinicaId: string, medicoId?: string, dataInicio?: Date, dataFim?: Date): Promise<BloqueioAgenda[]>;
  deleteBloqueio(clinicaId: string, id: string): Promise<boolean>;
}
