import { api } from './client';
import type {
  Agendamento,
  AvaliacaoIU,
  DashboardFinanceiro,
  Documento,
  Entrega,
  FollowUp,
  LaudoMedico,
  Lancamento,
  LoginResponse,
  ModalidadeAtendimento,
  Paciente,
  PageResult,
  Papel,
  ProcessoJuridico,
  Produto,
  Prontuario,
  SalaTelemedicina,
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
  programaVaPro?: boolean;
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

// ---------- Financeiro ----------
export interface ListLancamentosParams {
  tipo?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
  cursor?: string;
  limit?: number;
}

export interface CreateLancamentoPayload {
  clinicaId: string;
  tipo: string;
  descricao: string;
  valor: number;
  formaPagamento?: string;
  vencimento?: string;
  pacienteId?: string;
  agendamentoId?: string;
  observacoes?: string;
}

export const financeiroApi = {
  dashboard: (params?: { dataInicio?: string; dataFim?: string }) =>
    api.get<DashboardFinanceiro>('/financeiro/dashboard', { params }).then((r) => r.data),
  list: (params: ListLancamentosParams = {}) =>
    api
      .get<PageResult<Lancamento> | Lancamento[]>('/financeiro/lancamentos', { params })
      .then((r) => r.data),
  create: (payload: CreateLancamentoPayload) =>
    api.post<Lancamento>('/financeiro/lancamentos', payload).then((r) => r.data),
  receber: (id: string, formaPagamento?: string) =>
    api
      .patch(`/financeiro/lancamentos/${id}/receber`, { formaPagamento })
      .then((r) => r.data),
  cancelar: (id: string) =>
    api.patch(`/financeiro/lancamentos/${id}/cancelar`).then((r) => r.data),
};

// ---------- Telemedicina ----------
export interface CreateSalaPayload {
  clinicaId: string;
  agendamentoId: string;
  pacienteId: string;
  modalidade: string;
}

export const telemedicinaApi = {
  createSala: (payload: CreateSalaPayload) =>
    api.post<SalaTelemedicina>('/telemedicina/salas', payload).then((r) => r.data),
  findByAgendamento: (agendamentoId: string) =>
    api
      .get<SalaTelemedicina>(`/telemedicina/salas/agendamento/${agendamentoId}`)
      .then((r) => r.data),
  findById: (id: string) =>
    api.get<SalaTelemedicina>(`/telemedicina/salas/${id}`).then((r) => r.data),
  encerrar: (id: string) =>
    api.patch(`/telemedicina/salas/${id}/encerrar`).then((r) => r.data),
};

// ---------- Produtos ----------
export const produtosApi = {
  list: (tipo?: string) =>
    api.get<Produto[]>('/produtos', { params: tipo ? { tipo } : {} }).then((r) => r.data),
  get: (codigo: number) =>
    api.get<Produto>(`/produtos/${codigo}`).then((r) => r.data),
};

// ---------- Avaliação IU ----------
export const avaliacaoIUApi = {
  create: (payload: Record<string, unknown>) =>
    api.post<AvaliacaoIU>('/avaliacao-iu', payload).then((r) => r.data),
  listByPaciente: (pacienteId: string) =>
    api.get<AvaliacaoIU[]>('/avaliacao-iu', { params: { pacienteId } }).then((r) => r.data),
  get: (id: string) =>
    api.get<AvaliacaoIU>(`/avaliacao-iu/${id}`).then((r) => r.data),
  minhas: () =>
    api.get<AvaliacaoIU[]>('/avaliacao-iu/minhas').then((r) => r.data),
  count: () =>
    api.get<{ total: number }>('/avaliacao-iu/count').then((r) => r.data),
};

// ---------- Follow-up ----------
export const followUpApi = {
  create: (payload: Record<string, unknown>) =>
    api.post<FollowUp>('/followup', payload).then((r) => r.data),
  listByPaciente: (pacienteId: string) =>
    api.get<FollowUp[]>('/followup', { params: { pacienteId } }).then((r) => r.data),
  listByAvaliacao: (avaliacaoIuId: string) =>
    api.get<FollowUp[]>(`/followup/avaliacao/${avaliacaoIuId}`).then((r) => r.data),
  resumo: () =>
    api.get<{ emAvaliacao: number; elegivel: number; naoElegivel: number }>('/followup/resumo').then((r) => r.data),
};

// ---------- Laudo Médico ----------
export const laudoMedicoApi = {
  create: (payload: Record<string, unknown>) =>
    api.post<LaudoMedico>('/laudo-medico', payload).then((r) => r.data),
  listByPaciente: (pacienteId: string) =>
    api.get<LaudoMedico[]>('/laudo-medico', { params: { pacienteId } }).then((r) => r.data),
  get: (id: string) =>
    api.get<LaudoMedico>(`/laudo-medico/${id}`).then((r) => r.data),
  assinar: (id: string, crm?: string) =>
    api.post(`/laudo-medico/${id}/assinar`, {}, { params: crm ? { crm } : {} }).then((r) => r.data),
};

// ---------- Processo Jurídico ----------
export const processoJuridicoApi = {
  create: (payload: Record<string, unknown>) =>
    api.post<ProcessoJuridico>('/processo-juridico', payload).then((r) => r.data),
  listByPaciente: (pacienteId: string) =>
    api.get<ProcessoJuridico[]>('/processo-juridico', { params: { pacienteId } }).then((r) => r.data),
  get: (id: string) =>
    api.get<ProcessoJuridico>(`/processo-juridico/${id}`).then((r) => r.data),
  meus: () =>
    api.get<ProcessoJuridico[]>('/processo-juridico/meus').then((r) => r.data),
  updateStatus: (id: string, payload: Record<string, unknown>) =>
    api.patch<ProcessoJuridico>(`/processo-juridico/${id}/status`, payload).then((r) => r.data),
  addDocumento: (id: string, payload: { nome: string; url: string; tipo: string }) =>
    api.post<ProcessoJuridico>(`/processo-juridico/${id}/documento`, payload).then((r) => r.data),
};

// ---------- Entregas ----------
export const entregasApi = {
  create: (payload: Record<string, unknown>) =>
    api.post<Entrega>('/entregas', payload).then((r) => r.data),
  listByPaciente: (pacienteId: string) =>
    api.get<Entrega[]>('/entregas', { params: { pacienteId } }).then((r) => r.data),
  listByProcesso: (processoId: string) =>
    api.get<Entrega[]>(`/entregas/processo/${processoId}`).then((r) => r.data),
  get: (id: string) =>
    api.get<Entrega>(`/entregas/${id}`).then((r) => r.data),
  confirmar: (id: string) =>
    api.post(`/entregas/${id}/confirmar`).then((r) => r.data),
};
