import { api } from './client';

// Tickets internos usuário → SUPER_ADMIN (feature-tickets-superadmin): hoje só
// "Correção de dados de identidade" de um paciente.
export type TicketStatus = 'ABERTO' | 'ATENDIDO' | 'RECUSADO';

export interface Ticket {
  id: string;
  clinicaId: string;
  pacienteId: string;
  tipo: 'CORRECAO_IDENTIDADE';
  justificativa: string;
  autorId: string;
  status: TicketStatus;
  abertoEm: string;
  resolvidoEm?: string;
  resolvidoPor?: string;
  motivoRecusa?: string;
}

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  ABERTO: 'Aberto',
  ATENDIDO: 'Atendido',
  RECUSADO: 'Recusado',
};

export interface CorrecaoIdentidadePayload {
  nome?: string;
  cpf?: string;
  dataNascimento?: string;
}

export const ticketsApi = {
  abrir: (payload: { pacienteId: string; justificativa: string }) =>
    api.post<Ticket>('/tickets', payload).then((r) => r.data),
  listarAbertos: () => api.get<Ticket[]>('/tickets').then((r) => r.data),
  listarPorPaciente: (pacienteId: string) =>
    api.get<Ticket[]>(`/tickets/paciente/${pacienteId}`).then((r) => r.data),
  atender: (id: string, payload: CorrecaoIdentidadePayload) =>
    api.post<Ticket>(`/tickets/${id}/atender`, payload).then((r) => r.data),
  recusar: (id: string, motivo: string) =>
    api.post<Ticket>(`/tickets/${id}/recusar`, { motivo }).then((r) => r.data),
};

/** Correção direta de identidade pelo SUPER_ADMIN (sempre com justificativa). */
export const corrigirIdentidadePaciente = (
  pacienteId: string,
  payload: CorrecaoIdentidadePayload & { justificativa: string },
) => api.patch(`/pacientes/${pacienteId}/identidade`, payload).then((r) => r.data);
