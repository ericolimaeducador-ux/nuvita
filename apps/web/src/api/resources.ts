import { api } from './client';
import type {
  Agendamento,
  AuthUser,
  DecisaoUsoIA,
  Documento,
  Endereco,
  Lancamento,
  LinhaTerapeutica,
  ListUsuariosResult,
  LoginResponse,
  ModalidadeAtendimento,
  Modulo,
  ObservacaoPaciente,
  Paciente,
  PainelPsicologia,
  ProjetoPaciente,
  PageResult,
  Papel,
  PresignUploadResponse,
  Prontuario,
  SalaAcessoInfo,
  SalaEvento,
  SalaTelemedicina,
  SinalSala,
  StatusSala,
  TipoEventoSala,
  TipoSinal,
  StatusAgendamento,
  TipoAgendamento,
  TipoAtendimento,
  TipoDocumento,
  UsuarioAdmin,
} from '@/types';

// ---------- Auth ----------
/** Resposta dos endpoints que resolvem um gate pós-login: devolvem o user atualizado. */
export interface GateResolvidoResponse {
  user: AuthUser;
}

export const authApi = {
  login: (email: string, password: string, totpCode?: string) =>
    api
      .post<LoginResponse>('/auth/login', { email, password, totpCode })
      .then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  // O próprio profissional grava o CRP (a API aceita uma única vez; depois só o super-admin corrige).
  salvarMeuCrp: (crp: string) =>
    api.patch<{ user: AuthUser }>('/auth/me', { crp }).then((r) => r.data),
  aceitarTermos: (versao: string) =>
    api
      .post<GateResolvidoResponse>('/auth/aceitar-termos', { versao })
      .then((r) => r.data),
  trocarSenhaObrigatoria: (novaSenha: string) =>
    api
      .post<GateResolvidoResponse>('/auth/trocar-senha-obrigatoria', { novaSenha })
      .then((r) => r.data),
};

// ---------- Clínicas ----------
export interface CriarUsuarioPayload {
  nome: string;
  email: string;
  password: string;
  papel: Papel;
}
export interface CriarUsuarioResponse {
  user: { id: string; nome: string; email: string; papel: Papel };
  /** Segundo fator do usuário criado (psicólogo): exibido UMA vez para o ADMIN repassar. */
  twoFactorSetup?: { otpauthUrl: string; base32: string };
}

/** Contrato de GET /clinicas/minha (timbre dos documentos clínicos). Campos ausentes = não preenchidos. */
export interface MinhaClinica {
  nome: string;
  documento: string;
  tipoDocumento: 'CPF' | 'CNPJ';
  endereco?: Endereco;
  telefone?: string;
  emailContato?: string;
  logoUrl?: string;
}

export const clinicasApi = {
  minha: () => api.get<MinhaClinica>('/clinicas/minha').then((r) => r.data),
  // Cria um usuário (profissional ou secretaria) dentro da clínica do ADMIN.
  criarUsuario: (clinicaId: string, payload: CriarUsuarioPayload) =>
    api.post<CriarUsuarioResponse>(`/clinicas/${clinicaId}/usuarios`, payload).then((r) => r.data),
  // Logo da clínica (ADMIN da própria clínica; SUPER_ADMIN por id). Bucket privado: PUT presignado + confirmar.
  solicitarUploadLogo: (clinicaId: string, payload: { mimeType: string; tamanho: number; hash: string }) =>
    api
      .post<{ uploadUrl: string; logoKey: string; expiresInSeconds: number }>(`/clinicas/${clinicaId}/logo/upload-url`, payload)
      .then((r) => r.data),
  confirmarLogo: (clinicaId: string, logoKey: string) =>
    api.post(`/clinicas/${clinicaId}/logo/confirmar`, { logoKey }).then(() => undefined),
  removerLogo: (clinicaId: string) => api.delete(`/clinicas/${clinicaId}/logo`).then(() => undefined),
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
  projeto?: ProjetoPaciente;
  representante?: string;
}
export const pacientesApi = {
  list: (params: ListPacientesParams = {}) =>
    api.get<PageResult<Paciente>>('/pacientes', { params }).then((r) => r.data),
  listarRepresentantes: () =>
    api.get<string[]>('/pacientes/representantes').then((r) => r.data),
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

// ---------- Financeiro da psicologia ----------
export interface CobrarCicloPayload {
  pacienteId: string;
  ciclo: number;
  valor: number;
  formaPagamento?: string;
  vencimento?: string;
  descricao?: string;
  observacoes?: string;
}

export const psicoFinanceiroApi = {
  painel: () => api.get<PainelPsicologia>('/financeiro/psicologia/painel').then((r) => r.data),
  salvarConfig: (valorSessao: number) =>
    api.post('/financeiro/psicologia/configuracao', { valorSessao }).then((r) => r.data),
  cobrar: (payload: CobrarCicloPayload) =>
    api.post<Lancamento>('/financeiro/psicologia/cobrancas', payload).then((r) => r.data),
  receber: (id: string) =>
    api.patch(`/financeiro/psicologia/cobrancas/${id}/receber`).then((r) => r.data),
  cancelar: (id: string) =>
    api.patch(`/financeiro/psicologia/cobrancas/${id}/cancelar`).then((r) => r.data),
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
  listar: (params?: { dataInicio?: string; dataFim?: string }) =>
    api.get<SalaTelemedicina[]>('/telemedicina/salas', { params }).then((r) => r.data),
  findByAgendamento: (agendamentoId: string) =>
    api
      .get<SalaTelemedicina>(`/telemedicina/salas/agendamento/${agendamentoId}`)
      .then((r) => r.data),
  findById: (id: string) =>
    api.get<SalaTelemedicina>(`/telemedicina/salas/${id}`).then((r) => r.data),
  encerrar: (id: string) =>
    api.patch(`/telemedicina/salas/${id}/encerrar`).then((r) => r.data),
  eventos: (salaId: string) =>
    api.get<SalaEvento[]>(`/telemedicina/salas/${salaId}/eventos`).then((r) => r.data),
};

// Acesso à sala pelo token do link (paciente entra sem login; o token é a credencial).
export interface EntrarSalaResponse {
  salaId: string;
  papel: string;
  iceServers: RTCIceServer[];
}

export const teleAcessoApi = {
  info: (token: string) =>
    api.get<SalaAcessoInfo>(`/telemedicina/acesso/${token}`).then((r) => r.data),
  entrar: (token: string) =>
    api.post<EntrarSalaResponse>(`/telemedicina/acesso/${token}/entrar`).then((r) => r.data),
  enviarSinal: (token: string, tipo: TipoSinal, payload: unknown) =>
    api.post(`/telemedicina/acesso/${token}/sinais`, { tipo, payload }).then((r) => r.data),
  sinais: (token: string, after?: string) =>
    api
      .get<{ status: StatusSala; sinais: SinalSala[] }>(`/telemedicina/acesso/${token}/sinais`, {
        params: after ? { after } : {},
      })
      .then((r) => r.data),
  evento: (token: string, tipo: TipoEventoSala, detalhes?: string) =>
    api.post(`/telemedicina/acesso/${token}/eventos`, { tipo, detalhes }).then((r) => r.data),
  /** Envio confiável ao fechar a aba (sendBeacon sobrevive ao unload). */
  eventoBeacon: (token: string, tipo: TipoEventoSala) => {
    const url = `${api.defaults.baseURL ?? ''}/telemedicina/acesso/${token}/eventos`;
    const body = new Blob([JSON.stringify({ tipo })], { type: 'application/json' });
    navigator.sendBeacon(url, body);
  },
};

// ---------- Observações do paciente (timeline append-only) ----------
export const observacoesPacienteApi = {
  create: (payload: { pacienteId: string; texto: string }) =>
    api.post<ObservacaoPaciente>('/observacoes-paciente', payload).then((r) => r.data),
  listByPaciente: (pacienteId: string) =>
    api.get<ObservacaoPaciente[]>('/observacoes-paciente', { params: { pacienteId } }).then((r) => r.data),
};

// ---------- Testes psicológicos (placeholder — sem catálogo ainda) ----------
export interface TestePsicologico {
  id: string;
  clinicaId: string;
  pacienteId: string;
  nomeTeste: string;
  dataAplicacao: string;
  resultado?: string;
  aplicadoPor: string;
  criadoEm: string;
}

export const testesPsicologicosApi = {
  create: (payload: { pacienteId: string; nomeTeste: string; dataAplicacao: string; resultado?: string }) =>
    api.post<TestePsicologico>('/testes-psicologicos', payload).then((r) => r.data),
  listByPaciente: (pacienteId: string) =>
    api.get<TestePsicologico[]>('/testes-psicologicos', { params: { pacienteId } }).then((r) => r.data),
};

// ---------- IA clínica (sugestão de abordagem + prescrição de exercícios) ----------
export interface SugerirAbordagemPayload {
  linhaTerapeutica?: LinhaTerapeutica;
  motivoAtendimento?: string;
  diagnosticosSaudeMental?: string;
  avaliacaoRisco?: string;
  evolucao?: string;
  anotacoesLivres?: string;
  numeroSessoesAnteriores?: number;
}

export interface GerarPrescricaoPayload {
  linhaTerapeutica?: LinhaTerapeutica;
  contextoClinico?: string;
  checklistSelecionado?: string[];
}

export const iaClinicaApi = {
  sugerirAbordagem: (payload: SugerirAbordagemPayload) =>
    api
      .post<{ sugestao: string; registroUsoIaId: string }>('/ia-clinica/sugerir-abordagem', payload)
      .then((r) => r.data),
  gerarPrescricao: (payload: GerarPrescricaoPayload) =>
    api
      .post<{ prescricao: string; registroUsoIaId: string }>('/ia-clinica/gerar-prescricao', payload)
      .then((r) => r.data),
  registrarDecisao: (registroUsoIaId: string, decisao: DecisaoUsoIA) =>
    api
      .post<void>(`/ia-clinica/registros/${registroUsoIaId}/decisao`, { decisao })
      .then((r) => r.data),
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

export type TipoDocumentoClinica = 'CPF' | 'CNPJ';

export interface ClinicaAdmin {
  id: string;
  nome: string;
  /** CPF ou CNPJ, normalizado (sem pontuação). */
  documento: string;
  tipoDocumento: TipoDocumentoClinica;
  plano: 'basico' | 'profissional' | 'enterprise';
  ativo: boolean;
  /** Teste beta: usuários aceitam o Termo de Teste. Ausente em respostas antigas = false. */
  faseTeste?: boolean;
  criadoEm: string;
  totalUsuarios: number;
}

export interface UpdateClinicaPayload {
  nome?: string;
  plano?: ClinicaAdmin['plano'];
  ativo?: boolean;
  faseTeste?: boolean;
  /** Correção da identidade fiscal (só SUPER_ADMIN): sempre os dois juntos. */
  tipoDocumento?: TipoDocumentoClinica;
  documento?: string;
}

export interface CriarClinicaPayload {
  clinica: {
    nome: string;
    tipoDocumento: TipoDocumentoClinica;
    documento: string;
    plano: ClinicaAdmin['plano'];
    fusoHorario: string;
    duracaoConsultaPadrao: number;
    faseTeste?: boolean;
  };
  primeiroAdmin: { nome: string; email: string };
}

export interface CriarClinicaResponse {
  clinica: { id: string; nome: string; plano: ClinicaAdmin['plano'] };
  admin: { id: string; nome: string; email: string; papel: Papel };
  /** Devolvida UMA vez — repassar ao cliente por fora. */
  senhaTemporaria: string;
  twoFactorSetup?: { base32: string; otpauthUrl?: string };
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
  criarClinica: (payload: CriarClinicaPayload) =>
    api.post<CriarClinicaResponse>('/super-admin/clinicas', payload).then((r) => r.data),
  updateClinica: (id: string, payload: UpdateClinicaPayload) =>
    api.patch<ClinicaAdmin>(`/super-admin/clinicas/${id}`, payload).then((r) => r.data),
};

// ---------- Analytics / Relatórios Gerenciais ----------
export interface AnalyticsPeriodParams {
  clinicaId?: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface DashboardPacientes {
  totalAtivos: number;
  novosPorMes: Array<{ _id: { ano: number; mes: number }; total: number }>;
  porSexo: Array<{ _id: string | null; total: number }>;
}

export interface DashboardAgendamentos {
  porStatus: Array<{ _id: string | null; total: number }>;
  porTipo: Array<{ _id: string | null; total: number }>;
  topMedicos: Array<{ _id: string | null; total: number }>;
  porMes: Array<{ _id: { ano: number; mes: number }; total: number }>;
  porDia: Array<{ _id: string; total: number }>;
  porSemana: Array<{ _id: { ano: number; semana: number }; total: number }>;
}

export interface DashboardFinanceiroAnalytics {
  receitasPorMes: Array<{ _id: { ano: number; mes: number }; total: number; quantidade: number }>;
  despesasPorMes: Array<{ _id: { ano: number; mes: number }; total: number; quantidade: number }>;
  porFormaPagamento: Array<{ _id: string | null; total: number; quantidade: number }>;
  totalGeral: Array<{ _id: { tipo: string; status: string }; total: number }>;
}

export interface CobrancaResumo {
  id: string;
  pacienteId?: string;
  pacienteNome?: string;
  valor: number;
  vencimento?: string;
  ciclo?: number;
}

export interface CobrancasPsicologia {
  vencidas: CobrancaResumo[];
  aVencer: CobrancaResumo[];
  semData: CobrancaResumo[];
  totalVencido: number;
  totalAVencer: number;
}

export interface PacientePerdaSeguimento {
  pacienteId?: string;
  pacienteNome?: string;
  totalAgendamentos: number;
  faltas: number;
  ultimaSessaoConcluidaEm?: string;
}

export interface SlotVago {
  inicio: string;
  fim: string;
}

export const analyticsApi = {
  pacientes: (params: AnalyticsPeriodParams = {}) =>
    api.get<DashboardPacientes>('/analytics/pacientes', { params }).then((r) => r.data),
  pacientesPorRepresentante: (params: AnalyticsPeriodParams = {}) =>
    api.get<Array<{ _id: string; total: number }>>('/analytics/pacientes-por-representante', { params }).then((r) => r.data),
  agendamentos: (params: AnalyticsPeriodParams = {}) =>
    api.get<DashboardAgendamentos>('/analytics/agendamentos', { params }).then((r) => r.data),
  financeiro: (params: AnalyticsPeriodParams = {}) =>
    api.get<DashboardFinanceiroAnalytics>('/analytics/financeiro', { params }).then((r) => r.data),
  cobrancasPsicologia: (params: { clinicaId?: string; profissionalId?: string } = {}) =>
    api.get<CobrancasPsicologia>('/analytics/cobrancas-psicologia', { params }).then((r) => r.data),
  perdaSeguimento: (params: { clinicaId?: string; profissionalId?: string; diasLimite?: number } = {}) =>
    api.get<PacientePerdaSeguimento[]>('/analytics/perda-seguimento', { params }).then((r) => r.data),
  horariosVagos: (params: {
    data: string;
    clinicaId?: string;
    profissionalId?: string;
    horaInicio?: number;
    horaFim?: number;
    slotMinutos?: number;
  }) => api.get<SlotVago[]>('/analytics/horarios-vagos', { params }).then((r) => r.data),
};
