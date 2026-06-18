import { api } from './client';
import type {
  Agendamento,
  Documento,
  LoginResponse,
  ModalidadeAtendimento,
  Paciente,
  PageResult,
  Papel,
  Prontuario,
  StatusAgendamento,
  TipoAgendamento,
  TipoAtendimento,
} from '@/types';

// ---------- Auth ----------
export const authApi = {
  login: (email: string, password: string, totpCode?: string) =>
    api
      .post<LoginResponse>('/auth/login', { email, password, totpCode })
      .then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
};

// ---------- Clínicas ----------
export interface CriarUsuarioPayload {
  nome: string;
  email: string;
  password: string;
  papel: Papel;
}
export const clinicasApi = {
  // Cria um usuário (profissional ou secretaria) dentro da clínica do ADMIN.
  criarUsuario: (clinicaId: string, payload: CriarUsuarioPayload) =>
    api.post(`/clinicas/${clinicaId}/usuarios`, payload).then((r) => r.data),
};

// ---------- Pacientes ----------
export interface ListPacientesParams {
  nome?: string;
  cpf?: string;
  cursor?: string;
  limit?: number;
  incluirInativos?: boolean;
  clinicaId?: string;
}
export const pacientesApi = {
  list: (params: ListPacientesParams = {}) =>
    api.get<PageResult<Paciente>>('/pacientes', { params }).then((r) => r.data),
  get: (id: string) => api.get<Paciente>(`/pacientes/${id}`).then((r) => r.data),
  create: (payload: Record<string, unknown>) =>
    api.post<Paciente>('/pacientes', payload).then((r) => r.data),
  update: (id: string, payload: Record<string, unknown>) =>
    api.patch<Paciente>(`/pacientes/${id}`, payload).then((r) => r.data),
  deactivate: (id: string) =>
    api.patch(`/pacientes/${id}/desativar`).then((r) => r.data),
  export: (id: string) =>
    api.get(`/pacientes/${id}/export`).then((r) => r.data),
};

// ---------- Agenda ----------
export interface ListAgendamentosParams {
  medicoId?: string;
  pacienteId?: string;
  modalidade?: ModalidadeAtendimento;
  status?: StatusAgendamento;
  dataInicio?: string;
  dataFim?: string;
}
export interface CreateAgendamentoPayload {
  clinicaId: string;
  pacienteId: string;
  medicoId: string;
  modalidade?: ModalidadeAtendimento;
  dataHoraInicio: string;
  dataHoraFim: string;
  tipo: TipoAgendamento;
  observacoes?: string;
}
export const agendaApi = {
  list: (params: ListAgendamentosParams = {}) =>
    api
      .get<PageResult<Agendamento> | Agendamento[]>('/agendamentos', { params })
      .then((r) => r.data),
  create: (payload: CreateAgendamentoPayload) =>
    api.post<Agendamento>('/agendamentos', payload).then((r) => r.data),
  // Reagendar = atualizar data/hora (PATCH /:id).
  reagendar: (id: string, dataHoraInicio: string, dataHoraFim: string) =>
    api
      .patch(`/agendamentos/${id}`, { dataHoraInicio, dataHoraFim })
      .then((r) => r.data),
  cancelar: (id: string, motivoCancelamento?: string) =>
    api
      .patch(`/agendamentos/${id}/cancelar`, { motivoCancelamento })
      .then((r) => r.data),
  concluir: (id: string) =>
    api.patch(`/agendamentos/${id}/concluir`).then((r) => r.data),
};

// ---------- Prontuários ----------
export const prontuariosApi = {
  list: (params: { pacienteId?: string } = {}) =>
    api
      .get<PageResult<Prontuario> | Prontuario[]>('/prontuarios', { params })
      .then((r) => r.data),
  get: (id: string) =>
    api.get<Prontuario>(`/prontuarios/${id}`).then((r) => r.data),
  create: (payload: Record<string, unknown>) =>
    api.post<Prontuario>('/prontuarios', payload).then((r) => r.data),
  assinar: (id: string) =>
    api.post(`/prontuarios/${id}/assinar`).then((r) => r.data),
  cid10: (q: string) =>
    api
      .get<Array<{ codigo: string; descricao: string }>>(
        '/prontuarios/cid10/autocomplete',
        { params: { q, termo: q } },
      )
      .then((r) => r.data),
};

export type { TipoAtendimento };

// ---------- Documentos ----------
export const documentosApi = {
  list: () =>
    api
      .get<PageResult<Documento> | Documento[]>('/documentos')
      .then((r) => r.data),
  presignUpload: (payload: Record<string, unknown>) =>
    api.post('/documentos/presign-upload', payload).then((r) => r.data),
  accessUrl: (id: string) =>
    api.get<{ url: string }>(`/documentos/${id}/access-url`).then((r) => r.data),
  excluir: (id: string) =>
    api.patch(`/documentos/${id}/excluir`).then((r) => r.data),
};

// ---------- Notificações ----------
export const notificacoesApi = {
  dashboard: () => api.get('/notificacoes/dashboard').then((r) => r.data),
  enviar: (payload: Record<string, unknown>) =>
    api.post('/notificacoes', payload).then((r) => r.data),
};
