import { ModalidadeAtendimento, SalaTelemedicina, StatusSala } from '../../domain/sala-telemedicina.entity';

export interface CreateSalaInput {
  clinicaId: string;
  agendamentoId: string;
  medicoId: string;
  modalidade: ModalidadeAtendimento;
  pacienteId: string;
  tokenMedico: string;
  tokenPaciente: string;
  expiresAt: Date;
}

export interface SalaTelemedicinaRepository {
  create(input: CreateSalaInput): Promise<SalaTelemedicina>;
  findById(clinicaId: string, id: string): Promise<SalaTelemedicina | null>;
  findByToken(token: string): Promise<SalaTelemedicina | null>;
  findByAgendamento(clinicaId: string, agendamentoId: string): Promise<SalaTelemedicina | null>;
  updateStatus(clinicaId: string, id: string, status: StatusSala, timestamp?: Date): Promise<SalaTelemedicina | null>;
}
