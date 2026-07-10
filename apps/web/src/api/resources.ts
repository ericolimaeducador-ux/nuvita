import { api } from './client';
import type {
  Agendamento,
  AnotacaoJuridica,
  AvaliacaoIU,
  ChecklistDocumentoItem,
  DashboardFinanceiro,
  Documento,
  Entrega,
  EtapaFluxoClinico,
  FollowUp,
  LaudoMedico,
  Lancamento,
  ListUsuariosResult,
  LoginResponse,
  ModalidadeAtendimento,
  Modulo,
  ObservacaoPaciente,
  Paciente,
  ProjetoPaciente,
  PageResult,
  Papel,
  PresignUploadResponse,
  ProcessoJuridico,
  Produto,
  Prontuario,
  SalaTelemedicina,
  StatusAgendamento,
  StatusProcesso,
  TipoAgendamento,
  TipoAtendimento,
  TipoDocumento,
  UsuarioAdmin,
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
export type PacienteSort = 'recentes' | 'nome_asc' | 'nome_desc' | 'nascimento_asc' | 'nascimento_desc';

export interface ListPacientesParams {
  nome?: string;
  cpf?: string;
  /** Dia exato de nascimento, YYYY-MM-DD. */
  dataNascimento?: string;
  sort?: PacienteSort;
  cursor?: string;
  limit?: number;
  incluirInativos?: boolean;
  clinicaId?: string;
  programaIU?: boolean;
  projeto?: ProjetoPaciente;
  etapaFluxo?: EtapaFluxoClinico;
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
  updateObservacoes: (id: string, observacoes: string) =>
    api.patch<Paciente>(`/pacientes/${id}/observacoes`, { observacoes }).then((r) => r.data),
  avancarEtapaFluxo: (id: string) =>
    api.patch<Paciente>(`/pacientes/${id}/fluxo/avancar`).then((r) => r.data),
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
  list: (params: { pacienteId?: string; prontuarioId?: string } = {}) =>
    api
      .get<PageResult<Documento> | Documento[]>('/documentos', { params })
      .then((r) => r.data),
  presignUpload: (payload: {
    clinicaId: string; pacienteId: string; prontuarioId?: string;
    nome: string; nomePaciente?: string; tipo: TipoDocumento; mimeType: string; tamanho: number; hash: string;
  }) =>
    api.post<PresignUploadResponse>('/documentos/presign-upload', payload).then((r) => r.data),
  confirmarUpload: (id: string) =>
    api.post<Documento>(`/documentos/${id}/confirmar-upload`).then((r) => r.data),
  accessUrl: (id: string) =>
    api.get<{ accessUrl: string; expiresInSeconds: number }>(`/documentos/${id}/access-url`).then((r) => r.data),
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
  update: (id: string, payload: Record<string, unknown>) =>
    api.patch<AvaliacaoIU>(`/avaliacao-iu/${id}`, payload).then((r) => r.data),
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
  listByStatus: (status: StatusProcesso) =>
    api.get<ProcessoJuridico[]>('/processo-juridico/por-status', { params: { status } }).then((r) => r.data),
  updateStatus: (id: string, payload: Record<string, unknown>) =>
    api.patch<ProcessoJuridico>(`/processo-juridico/${id}/status`, payload).then((r) => r.data),
  addDocumento: (id: string, payload: { nome: string; url: string; tipo: string }) =>
    api.post<ProcessoJuridico>(`/processo-juridico/${id}/documento`, payload).then((r) => r.data),
};

// ---------- Anotações Jurídicas ----------
export const anotacaoJuridicaApi = {
  create: (payload: { pacienteId: string; texto: string }) =>
    api.post<AnotacaoJuridica>('/anotacoes-juridicas', payload).then((r) => r.data),
  listByPaciente: (pacienteId: string) =>
    api.get<AnotacaoJuridica[]>('/anotacoes-juridicas', { params: { pacienteId } }).then((r) => r.data),
};

// ---------- Observações do paciente (timeline append-only) ----------
export const observacoesPacienteApi = {
  create: (payload: { pacienteId: string; texto: string }) =>
    api.post<ObservacaoPaciente>('/observacoes-paciente', payload).then((r) => r.data),
  listByPaciente: (pacienteId: string) =>
    api.get<ObservacaoPaciente[]>('/observacoes-paciente', { params: { pacienteId } }).then((r) => r.data),
};

// ---------- Checklist de Documentos ----------
export const checklistDocumentosApi = {
  create: (payload: { pacienteId: string; nome: string; observacao?: string }) =>
    api.post<ChecklistDocumentoItem>('/checklist-documentos', payload).then((r) => r.data),
  listByPaciente: (pacienteId: string) =>
    api.get<ChecklistDocumentoItem[]>('/checklist-documentos', { params: { pacienteId } }).then((r) => r.data),
  update: (id: string, payload: { status?: string; observacao?: string; nome?: string }) =>
    api.patch<ChecklistDocumentoItem>(`/checklist-documentos/${id}`, payload).then((r) => r.data),
  remove: (id: string) =>
    api.delete<{ ok: true }>(`/checklist-documentos/${id}`).then((r) => r.data),
  criarPadrao: (pacienteId: string) =>
    api.post<ChecklistDocumentoItem[]>('/checklist-documentos/padrao', { pacienteId }).then((r) => r.data),
  resumoPendentes: () =>
    api.get<{ pendentes: number }>('/checklist-documentos/resumo-pendentes').then((r) => r.data),
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

// ---------- Super Admin ----------
export interface ListUsersParams {
  papel?: Papel;
  clinicaId?: string;
  ativo?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface UpdateUsuarioPayload {
  nome?: string;
  email?: string;
  papel?: Papel;
  clinicaId?: string | null;
  ativo?: boolean;
  registroProfissional?: string;
  modulosConcedidos?: Modulo[];
  modulosRevogados?: Modulo[];
}

export interface CreateAdminUserPayload {
  nome: string;
  email: string;
  password: string;
  papel: Papel;
  clinicaId?: string;
  registroProfissional?: string;
}

export interface TwoFactorSetup {
  otpauthUrl: string;
  base32: string;
}

export interface ClinicaAdmin {
  id: string;
  nome: string;
  cnpj: string;
  plano: 'basico' | 'profissional' | 'enterprise';
  ativo: boolean;
  criadoEm: string;
  totalUsuarios: number;
}

export interface UpdateClinicaPayload {
  nome?: string;
  plano?: ClinicaAdmin['plano'];
  ativo?: boolean;
}

export const superAdminApi = {
  listUsuarios: (params: ListUsersParams = {}) =>
    api.get<ListUsuariosResult>('/super-admin/usuarios', { params }).then((r) => r.data),
  getUsuario: (id: string) =>
    api.get<UsuarioAdmin>(`/super-admin/usuarios/${id}`).then((r) => r.data),
  createUsuario: (payload: CreateAdminUserPayload) =>
    api.post<UsuarioAdmin & { twoFactorSetup?: TwoFactorSetup }>('/super-admin/usuarios', payload).then((r) => r.data),
  updateUsuario: (id: string, payload: UpdateUsuarioPayload) =>
    api.patch<UsuarioAdmin & { twoFactorSetup?: TwoFactorSetup }>(`/super-admin/usuarios/${id}`, payload).then((r) => r.data),
  resetPassword: (id: string, novaSenha: string) =>
    api.post<{ ok: boolean }>(`/super-admin/usuarios/${id}/reset-password`, { novaSenha }).then((r) => r.data),
  reset2fa: (id: string) =>
    api.post<TwoFactorSetup>(`/super-admin/usuarios/${id}/reset-2fa`).then((r) => r.data),
  listClinicas: () =>
    api.get<{ items: ClinicaAdmin[]; total: number }>('/super-admin/clinicas').then((r) => r.data),
  updateClinica: (id: string, payload: UpdateClinicaPayload) =>
    api.patch<ClinicaAdmin>(`/super-admin/clinicas/${id}`, payload).then((r) => r.data),
};
