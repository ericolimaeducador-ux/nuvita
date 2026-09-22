// Enums e tipos espelhados da API NestJS (packages/shared + domain entities).

export enum Papel {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  PSICOLOGO = 'PSICOLOGO',
  SECRETARIA = 'SECRETARIA',
  PACIENTE = 'PACIENTE',
}

export const PAPEL_LABEL: Record<Papel, string> = {
  [Papel.SUPER_ADMIN]: 'Super Admin',
  [Papel.ADMIN]: 'Administrador',
  [Papel.PSICOLOGO]: 'Psicólogo(a)',
  [Papel.SECRETARIA]: 'Secretaria',
  [Papel.PACIENTE]: 'Paciente',
};

// Papéis profissionais que prestam atendimento (paridade de permissões clínicas).
export const PAPEIS_PROFISSIONAIS: Papel[] = [
  Papel.PSICOLOGO,
];

export enum ModalidadeAtendimento {
  PSICOLOGIA = 'psicologia',
}

export const MODALIDADE_LABEL: Record<ModalidadeAtendimento, string> = {
  [ModalidadeAtendimento.PSICOLOGIA]: 'Psicologia',
};

export enum Sexo {
  FEMININO = 'FEMININO',
  MASCULINO = 'MASCULINO',
  OUTRO = 'OUTRO',
  NAO_INFORMADO = 'NAO_INFORMADO',
}

export const SEXO_LABEL: Record<Sexo, string> = {
  [Sexo.FEMININO]: 'Feminino',
  [Sexo.MASCULINO]: 'Masculino',
  [Sexo.OUTRO]: 'Outro',
  [Sexo.NAO_INFORMADO]: 'Não informado',
};

// Classificação interna do paciente. Hoje só existe o Projeto PSI
// (atendimento psicológico) — visibilidade restrita ao papel PSICOLOGO.
export enum ProjetoPaciente {
  PSI = 'PSI',
}

export const PROJETO_LABEL: Record<ProjetoPaciente, string> = {
  [ProjetoPaciente.PSI]: 'Projeto PSI (Psicologia)',
};

/** Abordagem terapêutica adotada com o paciente — orienta os campos
 * específicos registrados em cada sessão (ver RegistroPsicologico). */
export enum LinhaTerapeutica {
  TCC = 'TCC',
  PSICANALISE = 'PSICANALISE',
  HUMANISTA = 'HUMANISTA',
  GESTALT = 'GESTALT',
  JUNGUIANA = 'JUNGUIANA',
}

export const LINHA_TERAPEUTICA_LABEL: Record<LinhaTerapeutica, string> = {
  [LinhaTerapeutica.TCC]: 'TCC (Terapia Cognitivo-Comportamental)',
  [LinhaTerapeutica.PSICANALISE]: 'Psicanálise',
  [LinhaTerapeutica.HUMANISTA]: 'Humanista (Centrada na Pessoa)',
  [LinhaTerapeutica.GESTALT]: 'Gestalt-Terapia',
  [LinhaTerapeutica.JUNGUIANA]: 'Psicologia Analítica (Junguiana)',
};

export enum StatusAgendamento {
  AGENDADO = 'agendado',
  CONFIRMADO = 'confirmado',
  CANCELADO = 'cancelado',
  CONCLUIDO = 'concluido',
  FALTA = 'falta',
}

export const STATUS_AGENDAMENTO_LABEL: Record<StatusAgendamento, string> = {
  [StatusAgendamento.AGENDADO]: 'Agendado',
  [StatusAgendamento.CONFIRMADO]: 'Confirmado',
  [StatusAgendamento.CANCELADO]: 'Cancelado',
  [StatusAgendamento.CONCLUIDO]: 'Concluído',
  [StatusAgendamento.FALTA]: 'Falta',
};

export const STATUS_AGENDAMENTO_COLOR: Record<StatusAgendamento, string> = {
  [StatusAgendamento.AGENDADO]: 'blue',
  [StatusAgendamento.CONFIRMADO]: 'cyan',
  [StatusAgendamento.CANCELADO]: 'red',
  [StatusAgendamento.CONCLUIDO]: 'green',
  [StatusAgendamento.FALTA]: 'volcano',
};

export enum TipoAgendamento {
  AVALIACAO_PSICOLOGICA = 'avaliacao_psicologica',
  SESSAO_PSICOTERAPIA = 'sessao_psicoterapia',
}

export const TIPO_AGENDAMENTO_LABEL: Record<TipoAgendamento, string> = {
  [TipoAgendamento.AVALIACAO_PSICOLOGICA]: 'Avaliação Psicológica',
  [TipoAgendamento.SESSAO_PSICOTERAPIA]: 'Sessão de Psicoterapia',
};

// Tipos de agendamento sugeridos por modalidade (para filtrar o formulário).
export const TIPOS_POR_MODALIDADE: Record<ModalidadeAtendimento, TipoAgendamento[]> = {
  [ModalidadeAtendimento.PSICOLOGIA]: [
    TipoAgendamento.AVALIACAO_PSICOLOGICA,
    TipoAgendamento.SESSAO_PSICOTERAPIA,
  ],
};

export enum TipoAtendimento {
  PSICOTERAPIA = 'psicoterapia',
}

export const TIPO_ATENDIMENTO_LABEL: Record<TipoAtendimento, string> = {
  [TipoAtendimento.PSICOTERAPIA]: 'Atendimento Psicológico',
};

/** Mapeia o tipo de agendamento para o tipo de atendimento (prontuário)
 * correspondente. */
export const TIPO_ATENDIMENTO_POR_AGENDAMENTO: Partial<Record<TipoAgendamento, TipoAtendimento>> = {
  [TipoAgendamento.AVALIACAO_PSICOLOGICA]: TipoAtendimento.PSICOTERAPIA,
  [TipoAgendamento.SESSAO_PSICOTERAPIA]: TipoAtendimento.PSICOTERAPIA,
};

// ---- Permissões por módulo (espelho de packages/shared/src/auth/permissao.ts) ----

export enum Modulo {
  DASHBOARD = 'DASHBOARD',
  PACIENTES = 'PACIENTES',
  AGENDA = 'AGENDA',
  PRONTUARIOS = 'PRONTUARIOS',
  DOCUMENTOS = 'DOCUMENTOS',
  NOTIFICACOES = 'NOTIFICACOES',
  TELEMEDICINA = 'TELEMEDICINA',
  ANALYTICS = 'ANALYTICS',
  ATENDIMENTO_PSICOLOGICO = 'ATENDIMENTO_PSICOLOGICO',
  FINANCEIRO_PSICOLOGIA = 'FINANCEIRO_PSICOLOGIA',
  CLINICA = 'CLINICA',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const TODOS_MODULOS: Modulo[] = Object.values(Modulo);

export const MODULO_LABEL: Record<Modulo, string> = {
  [Modulo.DASHBOARD]: 'Dashboard',
  [Modulo.PACIENTES]: 'Pacientes',
  [Modulo.AGENDA]: 'Agenda',
  [Modulo.PRONTUARIOS]: 'Prontuários',
  [Modulo.DOCUMENTOS]: 'Documentos',
  [Modulo.NOTIFICACOES]: 'Notificações',
  [Modulo.TELEMEDICINA]: 'Telemedicina',
  [Modulo.ANALYTICS]: 'Relatórios / analytics',
  [Modulo.ATENDIMENTO_PSICOLOGICO]: 'Atendimento psicológico',
  [Modulo.FINANCEIRO_PSICOLOGIA]: 'Financeiro da psicologia',
  [Modulo.CLINICA]: 'Configuração da clínica',
  [Modulo.SUPER_ADMIN]: 'Super Admin',
};

const M = Modulo;

/** Módulos que cada papel enxerga por padrão (o admin ajusta por usuário). */
export const PERMISSOES_PADRAO_POR_PAPEL: Record<Papel, Modulo[]> = {
  [Papel.SUPER_ADMIN]: TODOS_MODULOS,
  [Papel.ADMIN]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.PRONTUARIOS, M.DOCUMENTOS,
    M.NOTIFICACOES, M.TELEMEDICINA, M.ANALYTICS, M.CLINICA,
  ],
  // Atendimento psicológico é um extra: só o psicólogo enxerga por padrão;
  // outros usuários ganham por concessão individual no painel super-admin.
  // O financeiro da psicologia é o único financeiro do produto — é o caixa
  // do próprio psicólogo (autônomo), por ciclo de sessões.
  [Papel.PSICOLOGO]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.DOCUMENTOS, M.TELEMEDICINA,
    M.ATENDIMENTO_PSICOLOGICO, M.FINANCEIRO_PSICOLOGIA, M.ANALYTICS,
  ],
  [Papel.SECRETARIA]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.DOCUMENTOS, M.NOTIFICACOES, M.ANALYTICS,
  ],
  [Papel.PACIENTE]: [M.DASHBOARD, M.ANALYTICS],
};

/**
 * Permissões efetivas = padrão do papel ∪ concedidas − revogadas.
 * SUPER_ADMIN sempre tem acesso total, independentemente das exceções.
 */
export function resolvePermissoes(
  papel: Papel,
  concedidas: Modulo[] = [],
  revogadas: Modulo[] = [],
): Modulo[] {
  if (papel === Papel.SUPER_ADMIN) return TODOS_MODULOS;
  const base = new Set<Modulo>(PERMISSOES_PADRAO_POR_PAPEL[papel] ?? []);
  for (const m of concedidas) base.add(m);
  for (const m of revogadas) base.delete(m);
  return TODOS_MODULOS.filter((m) => base.has(m));
}

export function temPermissao(permissoes: Modulo[] | undefined, modulo: Modulo): boolean {
  return !!permissoes && permissoes.includes(modulo);
}

/** Aceite dos Termos de Uso do profissional (feature-terms-of-service-acceptance). */
export interface TermosAceitos {
  versao: string;
  dataAceite: string;
}

export interface AuthUser {
  id: string;
  nome?: string;
  email: string;
  papel: Papel;
  clinicaId?: string;
  /** Registro do conselho (CRM/COREN/OAB) — usado p/ preencher documentos. Ausente em sessões antigas. */
  registroProfissional?: string;
  /** Permissões efetivas calculadas pela API; ausente em sessões antigas. */
  permissoes?: Modulo[];
  /** Troca de senha obrigatória no próximo login (feature-forced-password-change). Ausente em sessões antigas. */
  deveTrocarSenha?: boolean;
  /** Aceite dos Termos de Uso (feature-terms-of-service-acceptance). null/ausente = não aceito. */
  termosAceitos?: TermosAceitos | null;
}

/** Rótulo do registro profissional conforme o papel (CRM/COREN/OAB). */
export const REGISTRO_LABEL: Partial<Record<Papel, string>> = {
  [Papel.PSICOLOGO]: 'CRP',
};
export function registroLabel(papel?: Papel): string {
  return (papel && REGISTRO_LABEL[papel]) || 'Registro profissional';
}
/** Papéis que possuem registro de conselho profissional. */
export function papelTemRegistro(papel?: Papel): boolean {
  return !!papel && papel in REGISTRO_LABEL;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Endereco {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

export interface ConsentimentoLGPD {
  aceito: boolean;
  dataAceite: string;
  versao: string;
}

/** Responsável legal de paciente menor de idade — ver paciente-idade.ts. */
export interface ResponsavelLegal {
  nome?: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  vinculo?: string;
}

export interface AutorizacaoResponsavel {
  confirmado: boolean;
  registradaPor?: string;
  registradaEm?: string;
}

export interface Paciente {
  id: string;
  clinicaId: string;
  nome: string;
  cpf?: string;
  dataNascimento?: string;
  sexo?: Sexo;
  telefone?: string;
  email?: string;
  endereco?: Endereco;
  consentimentoLGPD?: ConsentimentoLGPD;
  projeto?: ProjetoPaciente;
  linhaTerapeutica?: LinhaTerapeutica;
  representante?: string;
  responsavelLegal?: ResponsavelLegal;
  autorizacaoResponsavel?: AutorizacaoResponsavel;
  observacoes?: string;
  ativo?: boolean;
  criadoEm?: string;
}

export interface PageResult<T> {
  items?: T[];
  data?: T[];
  nextCursor?: string | null;
  total?: number;
}

export interface Agendamento {
  id: string;
  clinicaId: string;
  pacienteId: string;
  medicoId: string;
  modalidade: ModalidadeAtendimento;
  dataHoraInicio: string;
  dataHoraFim: string;
  tipo: TipoAgendamento;
  status: StatusAgendamento;
  observacoes?: string;
  motivoCancelamento?: string;
  /** Enriquecidos pelo backend na leitura — identificação segura do paciente. */
  pacienteNome?: string;
  pacienteCpf?: string;
}

export interface SinaisVitais {
  pressaoArterial?: string;
  frequenciaCardiaca?: number;
  frequenciaRespiratoria?: number;
  temperatura?: number;
  saturacaoO2?: number;
  peso?: number;
  altura?: number;
  escalaDor?: number;
}

export interface ProntuarioSubjetivo {
  queixaPrincipal?: string;
  hda?: string;
  antecedentesPessoais?: string;
  antecedentesCirurgicos?: string;
  medicamentosEmUso?: string;
  alergias?: string;
  historiaFamiliar?: string;
  historiaSocial?: string;
  revisaoSistemas?: string;
}

export interface ExameSegmentar {
  cabecaPescoco?: string;
  cardiovascular?: string;
  respiratorio?: string;
  abdome?: string;
  geniturinario?: string;
  neurologico?: string;
  extremidades?: string;
  pele?: string;
}

export interface ProntuarioObjetivo {
  estadoGeral?: string;
  sinaisVitais?: SinaisVitais;
  exameSegmentar?: ExameSegmentar;
  exameFisico?: string;
}

export interface ProntuarioAvaliacao {
  hipotesesDiagnosticas?: string[];
  cid10?: string[];
  diagnosticoDefinitivo?: string;
  evolucao?: string;
}

export interface ProntuarioPlano {
  conduta?: string;
  prescricao?: string;
  examesSolicitados?: string[];
  orientacoes?: string;
  encaminhamentos?: string;
  retorno?: string;
}

export interface AssinaturaProntuario {
  medicoId: string;
  dataAssinatura: string;
  hash?: string;
}

/** Registro de atendimento psicológico / psicoterapia (Res. CFP 006/2019). */
export interface RegistroPsicologico {
  motivoAtendimento?: string;
  avaliacaoDemanda?: string;
  doencasPrevias?: string;
  diagnosticosSaudeMental?: string;
  medicamentosEmUso?: string;
  historicoFamiliarSaudeMental?: string;
  qualidadeSono?: string;
  apetiteAlimentacao?: string;
  atividadeFisica?: string;
  usoSubstancias?: string;
  estadoEmocional?: string;
  escalaDor?: number;
  avaliacaoRisco?: string;
  redeApoio?: string;
  objetivosTrabalho?: string;
  procedimentoTecnica?: string;
  evolucao?: string;
  encaminhamentos?: string;
  anotacoesLivres?: string;
  crp?: string;

  // Campos específicos por linha terapêutica (ver LinhaTerapeutica) —
  // preenchidos condicionalmente conforme a classificação do paciente,
  // ver apps/web/src/lib/linhaTerapeutica.ts (CAMPOS_POR_LINHA).
  tccPensamentosAutomaticos?: string;
  tccDistorcoesCognitivas?: string;
  tccTarefaCasa?: string;
  tccRegistroComportamental?: string;
  psicanaliseAssociacaoLivre?: string;
  psicanaliseConteudoOnirico?: string;
  psicanaliseDinamicaTransferencial?: string;
  psicanaliseRepeticoes?: string;
  humanistaCongruencia?: string;
  humanistaAutorrealizacao?: string;
  humanistaAcolhimento?: string;
  gestaltAwareness?: string;
  gestaltFiguraFundo?: string;
  gestaltContatoFronteira?: string;
  junguianaSimbolosArquetipicos?: string;
  junguianaMaterialOnirico?: string;
  junguianaProcessoIndividuacao?: string;
}

/** Ordem/rótulos de exibição do registro psicológico — usado no histórico de
 * sessões, no relatório e na impressão do prontuário de psicoterapia. */
export const REGISTRO_PSICOLOGICO_CAMPOS: Array<[keyof RegistroPsicologico, string]> = [
  ['motivoAtendimento', 'Motivo do atendimento'],
  ['avaliacaoDemanda', 'Avaliação de demanda'],
  ['doencasPrevias', 'Doenças prévias'],
  ['diagnosticosSaudeMental', 'Diagnósticos de saúde mental'],
  ['medicamentosEmUso', 'Medicamentos em uso'],
  ['historicoFamiliarSaudeMental', 'Histórico familiar de saúde mental'],
  ['qualidadeSono', 'Qualidade do sono'],
  ['apetiteAlimentacao', 'Apetite / alimentação'],
  ['atividadeFisica', 'Atividade física'],
  ['usoSubstancias', 'Uso de substâncias'],
  ['estadoEmocional', 'Estado emocional'],
  ['escalaDor', 'Dor (0-10)'],
  ['avaliacaoRisco', 'Avaliação de risco'],
  ['redeApoio', 'Rede de apoio'],
  ['objetivosTrabalho', 'Objetivos do acompanhamento'],
  ['procedimentoTecnica', 'Procedimento / técnica'],
  ['evolucao', 'Evolução'],
  ['encaminhamentos', 'Encaminhamentos'],
  ['anotacoesLivres', 'Anotações livres'],
  ['crp', 'CRP'],
  ['tccPensamentosAutomaticos', 'Pensamentos automáticos identificados'],
  ['tccDistorcoesCognitivas', 'Distorções cognitivas trabalhadas'],
  ['tccTarefaCasa', 'Tarefa de casa (exercício comportamental)'],
  ['tccRegistroComportamental', 'Registro de comportamento-alvo / frequência'],
  ['psicanaliseAssociacaoLivre', 'Material de associação livre'],
  ['psicanaliseConteudoOnirico', 'Conteúdo onírico relatado (sonhos)'],
  ['psicanaliseDinamicaTransferencial', 'Dinâmica transferencial / contratransferencial'],
  ['psicanaliseRepeticoes', 'Repetições / padrões significantes identificados'],
  ['humanistaCongruencia', 'Congruência autopercebida pelo paciente'],
  ['humanistaAutorrealizacao', 'Movimento em direção à autorrealização'],
  ['humanistaAcolhimento', 'Registro de acolhimento incondicional / escuta ativa'],
  ['gestaltAwareness', 'Awareness no aqui-e-agora'],
  ['gestaltFiguraFundo', 'Figura-fundo (necessidade emergente)'],
  ['gestaltContatoFronteira', 'Fronteira de contato / ajustamento criativo'],
  ['junguianaSimbolosArquetipicos', 'Símbolos e conteúdos arquetípicos'],
  ['junguianaMaterialOnirico', 'Material onírico (sonhos)'],
  ['junguianaProcessoIndividuacao', 'Processo de individuação observado'],
];

export interface Prontuario {
  id: string;
  clinicaId: string;
  pacienteId: string;
  dataAtendimento: string;
  tipo: TipoAtendimento;
  assinado?: AssinaturaProntuario;
  subjetivo?: ProntuarioSubjetivo;
  objetivo?: ProntuarioObjetivo;
  avaliacao?: ProntuarioAvaliacao;
  plano?: ProntuarioPlano;
  registroPsicologico?: RegistroPsicologico;
}

export enum TipoDocumento {
  EXAME = 'exame',
  RECEITA = 'receita',
  LAUDO = 'laudo',
  TERMO = 'termo',
  OUTRO = 'outro',
}
export const TIPO_DOCUMENTO_LABEL: Record<TipoDocumento, string> = {
  [TipoDocumento.EXAME]: 'Exame',
  [TipoDocumento.RECEITA]: 'Receita',
  [TipoDocumento.LAUDO]: 'Laudo',
  [TipoDocumento.TERMO]: 'Termo',
  [TipoDocumento.OUTRO]: 'Outro',
};

export const ALLOWED_DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/dicom'] as const;
export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

export interface Documento {
  id: string;
  clinicaId: string;
  pacienteId: string;
  prontuarioId?: string;
  nome: string;
  tipo: TipoDocumento;
  mimeType: AllowedDocumentMimeType;
  tamanho: number;
  hash: string;
  uploadPor: string;
  thumbnailUrl?: string;
  criadoEm: string;
}

export interface PresignUploadResponse {
  documento: Documento;
  uploadUrl: string;
  expiresInSeconds: number;
  requiredHeaders: Record<string, string>;
}

// ---------- Financeiro ----------
export enum StatusLancamento {
  PENDENTE = 'pendente',
  RECEBIDO = 'recebido',
  CANCELADO = 'cancelado',
}

export const STATUS_LANCAMENTO_LABEL: Record<StatusLancamento, string> = {
  [StatusLancamento.PENDENTE]: 'Pendente',
  [StatusLancamento.RECEBIDO]: 'Recebido',
  [StatusLancamento.CANCELADO]: 'Cancelado',
};

export const STATUS_LANCAMENTO_COLOR: Record<StatusLancamento, string> = {
  [StatusLancamento.PENDENTE]: 'orange',
  [StatusLancamento.RECEBIDO]: 'green',
  [StatusLancamento.CANCELADO]: 'red',
};

export enum TipoLancamento {
  RECEITA = 'receita',
  DESPESA = 'despesa',
}

export const TIPO_LANCAMENTO_LABEL: Record<TipoLancamento, string> = {
  [TipoLancamento.RECEITA]: 'Receita',
  [TipoLancamento.DESPESA]: 'Despesa',
};

export enum FormaPagamento {
  DINHEIRO = 'dinheiro',
  CARTAO_CREDITO = 'cartao_credito',
  CARTAO_DEBITO = 'cartao_debito',
  PIX = 'pix',
  TRANSFERENCIA = 'transferencia',
  CONVENIO = 'convenio',
  BOLETO = 'boleto',
}

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  [FormaPagamento.DINHEIRO]: 'Dinheiro',
  [FormaPagamento.CARTAO_CREDITO]: 'Cartão de Crédito',
  [FormaPagamento.CARTAO_DEBITO]: 'Cartão de Débito',
  [FormaPagamento.PIX]: 'PIX',
  [FormaPagamento.TRANSFERENCIA]: 'Transferência',
  [FormaPagamento.CONVENIO]: 'Convênio',
  [FormaPagamento.BOLETO]: 'Boleto',
};

export interface Lancamento {
  id: string;
  clinicaId: string;
  pacienteId?: string;
  agendamentoId?: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  formaPagamento?: FormaPagamento;
  status: StatusLancamento;
  vencimento?: string;
  recebidoEm?: string;
  observacoes?: string;
  criadoPor: string;
  criadoEm: string;
}

export interface DashboardFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
  totalPendente: number;
  saldo: number;
  porFormaPagamento: Array<{ forma: string; total: number; quantidade: number }>;
}

// ---------- Financeiro da psicologia (psicólogo autônomo) ----------

/** O acompanhamento é vendido em pacotes fechados de sessões, pagos adiantado. */
export const SESSOES_POR_CICLO = 4;

export enum StatusCiclo {
  A_COBRAR = 'a_cobrar',
  AGUARDANDO_PAGAMENTO = 'aguardando_pagamento',
  EM_DIA = 'em_dia',
}

export const STATUS_CICLO_LABEL: Record<StatusCiclo, string> = {
  [StatusCiclo.A_COBRAR]: 'Cobrar ciclo',
  [StatusCiclo.AGUARDANDO_PAGAMENTO]: 'Aguardando pagamento',
  [StatusCiclo.EM_DIA]: 'Em dia',
};

export interface CobrancaCiclo {
  id: string;
  ciclo: number;
  valor: number;
  status: StatusLancamento;
  formaPagamento?: FormaPagamento;
  vencimento?: string;
  recebidoEm?: string;
  criadoEm: string;
}

export interface PacientePsicologia {
  pacienteId: string;
  pacienteNome?: string;
  sessoesRealizadas: number;
  proximaSessao: number;
  cicloAtual: number;
  sessoesNoCiclo: number;
  sessoesAteFecharCiclo: number;
  statusCiclo: StatusCiclo;
  valorEmAberto: number;
  primeiraSessaoEm?: string;
  ultimaSessaoEm?: string;
  cobrancas: CobrancaCiclo[];
}

export interface PainelPsicologia {
  valorSessao?: number;
  sessoesPorCiclo: number;
  recebidoNoMes: number;
  aReceber: number;
  ciclosACobrar: number;
  pacientes: PacientePsicologia[];
}

/** "1ª consulta" na estreia; depois, o número da sessão que vem. */
export function rotuloProximaSessao(p: { sessoesRealizadas: number; proximaSessao: number }): string {
  return p.sessoesRealizadas === 0 ? '1ª consulta' : `${p.proximaSessao}ª sessão`;
}

// ---------- Telemedicina ----------
export enum StatusSala {
  AGUARDANDO = 'aguardando',
  EM_ANDAMENTO = 'em_andamento',
  ENCERRADA = 'encerrada',
  EXPIRADA = 'expirada',
}

export const STATUS_SALA_LABEL: Record<StatusSala, string> = {
  [StatusSala.AGUARDANDO]: 'Aguardando',
  [StatusSala.EM_ANDAMENTO]: 'Em andamento',
  [StatusSala.ENCERRADA]: 'Encerrada',
  [StatusSala.EXPIRADA]: 'Expirada',
};

export const STATUS_SALA_COLOR: Record<StatusSala, string> = {
  [StatusSala.AGUARDANDO]: 'blue',
  [StatusSala.EM_ANDAMENTO]: 'green',
  [StatusSala.ENCERRADA]: 'default',
  [StatusSala.EXPIRADA]: 'red',
};

export interface SalaTelemedicina {
  id: string;
  clinicaId: string;
  agendamentoId: string;
  medicoId: string;
  modalidade: ModalidadeAtendimento;
  pacienteId: string;
  status: StatusSala;
  tokenMedico: string;
  tokenPaciente: string;
  expiresAt: string;
  iniciadaEm?: string;
  encerradaEm?: string;
  criadoEm: string;
}

export enum PapelSala {
  PROFISSIONAL = 'profissional',
  PACIENTE = 'paciente',
}

export const PAPEL_SALA_LABEL: Record<PapelSala, string> = {
  [PapelSala.PROFISSIONAL]: 'Profissional',
  [PapelSala.PACIENTE]: 'Paciente',
};

export enum TipoEventoSala {
  ENTROU = 'entrou',
  SAIU = 'saiu',
  DESCONECTOU = 'desconectou',
  RECONECTOU = 'reconectou',
  FALHA_CONEXAO = 'falha_conexao',
  MIDIA_NEGADA = 'midia_negada',
  ENCERRADA = 'encerrada',
}

export const TIPO_EVENTO_SALA_LABEL: Record<TipoEventoSala, string> = {
  [TipoEventoSala.ENTROU]: 'Entrou na sala',
  [TipoEventoSala.SAIU]: 'Saiu da sala',
  [TipoEventoSala.DESCONECTOU]: 'Conexão perdida',
  [TipoEventoSala.RECONECTOU]: 'Reconectou',
  [TipoEventoSala.FALHA_CONEXAO]: 'Falha de conexão',
  [TipoEventoSala.MIDIA_NEGADA]: 'Câmera/microfone negados',
  [TipoEventoSala.ENCERRADA]: 'Atendimento encerrado',
};

export interface SalaEvento {
  id: string;
  clinicaId: string;
  salaId: string;
  papel: PapelSala;
  tipo: TipoEventoSala;
  detalhes?: string;
  criadoEm: string;
}

/** Estado da sala visto por quem entra com o token (sem dados sensíveis). */
export interface SalaAcessoInfo {
  salaId: string;
  papel: PapelSala;
  status: StatusSala;
  modalidade: ModalidadeAtendimento;
  expiresAt: string;
  iniciadaEm?: string;
  encerradaEm?: string;
}

export enum TipoSinal {
  /** Paciente anuncia presença; o profissional responde com uma (re)oferta. */
  PRONTO = 'pronto',
  OFFER = 'offer',
  ANSWER = 'answer',
  CANDIDATE = 'candidate',
  BYE = 'bye',
}

export interface SinalSala {
  id: string;
  salaId: string;
  de: PapelSala;
  tipo: TipoSinal;
  payload: unknown;
  criadoEm: string;
}

export interface ObservacaoPaciente {
  id: string;
  clinicaId: string;
  pacienteId: string;
  autorId: string;
  autorEmail: string;
  texto: string;
  criadoEm: string;
}

// ---------- Super Admin ----------
export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  clinicaId?: string | null;
  ativo: boolean;
  criadoEm: string;
  registroProfissional?: string;
  permissoes?: Modulo[];
  modulosConcedidos?: Modulo[];
  modulosRevogados?: Modulo[];
}

export interface ListUsuariosResult {
  items: UsuarioAdmin[];
  total: number;
  skip: number;
  limit: number;
}

// ---------- IA clínica ----------
export enum DecisaoUsoIA {
  ACEITA = 'ACEITA',
  DESCARTADA = 'DESCARTADA',
}
