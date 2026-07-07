// Enums e tipos espelhados da API NestJS (packages/shared + domain entities).

export enum Papel {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MEDICO = 'MEDICO',
  ENFERMEIRO = 'ENFERMEIRO',
  ADVOGADO = 'ADVOGADO',
  SECRETARIA = 'SECRETARIA',
  PACIENTE = 'PACIENTE',
}

export const PAPEL_LABEL: Record<Papel, string> = {
  [Papel.SUPER_ADMIN]: 'Super Admin',
  [Papel.ADMIN]: 'Administrador',
  [Papel.MEDICO]: 'Médico(a)',
  [Papel.ENFERMEIRO]: 'Enfermeiro(a)',
  [Papel.ADVOGADO]: 'Advogado(a)',
  [Papel.SECRETARIA]: 'Secretaria',
  [Papel.PACIENTE]: 'Paciente',
};

// Papéis profissionais que prestam atendimento (paridade de permissões clínicas).
export const PAPEIS_PROFISSIONAIS: Papel[] = [
  Papel.MEDICO,
  Papel.ENFERMEIRO,
  Papel.ADVOGADO,
];

export enum ModalidadeAtendimento {
  MEDICO = 'medico',
  ENFERMAGEM = 'enfermagem',
  JURIDICO = 'juridico',
}

export const MODALIDADE_LABEL: Record<ModalidadeAtendimento, string> = {
  [ModalidadeAtendimento.MEDICO]: 'Médico',
  [ModalidadeAtendimento.ENFERMAGEM]: 'Enfermagem',
  [ModalidadeAtendimento.JURIDICO]: 'Jurídico',
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
  CONSULTA = 'consulta',
  RETORNO = 'retorno',
  EXAME = 'exame',
  PROCEDIMENTO = 'procedimento',
  TELECONSULTA = 'teleconsulta',
  ATENDIMENTO_ENFERMAGEM = 'atendimento_enfermagem',
  PROCEDIMENTO_ENFERMAGEM = 'procedimento_enfermagem',
  ATENDIMENTO_JURIDICO = 'atendimento_juridico',
  AUDIENCIA = 'audiencia',
  ENTREVISTA = 'entrevista',
}

export const TIPO_AGENDAMENTO_LABEL: Record<TipoAgendamento, string> = {
  [TipoAgendamento.CONSULTA]: 'Consulta',
  [TipoAgendamento.RETORNO]: 'Retorno',
  [TipoAgendamento.EXAME]: 'Exame',
  [TipoAgendamento.PROCEDIMENTO]: 'Procedimento',
  [TipoAgendamento.TELECONSULTA]: 'Teleconsulta',
  [TipoAgendamento.ATENDIMENTO_ENFERMAGEM]: 'Atend. Enfermagem',
  [TipoAgendamento.PROCEDIMENTO_ENFERMAGEM]: 'Proc. Enfermagem',
  [TipoAgendamento.ATENDIMENTO_JURIDICO]: 'Atend. Jurídico',
  [TipoAgendamento.AUDIENCIA]: 'Audiência',
  [TipoAgendamento.ENTREVISTA]: 'Entrevista (Fluxo Clínico)',
};

// Tipos de agendamento sugeridos por modalidade (para filtrar o formulário).
export const TIPOS_POR_MODALIDADE: Record<ModalidadeAtendimento, TipoAgendamento[]> = {
  [ModalidadeAtendimento.MEDICO]: [
    TipoAgendamento.CONSULTA,
    TipoAgendamento.RETORNO,
    TipoAgendamento.EXAME,
    TipoAgendamento.PROCEDIMENTO,
    TipoAgendamento.TELECONSULTA,
  ],
  [ModalidadeAtendimento.ENFERMAGEM]: [
    TipoAgendamento.ATENDIMENTO_ENFERMAGEM,
    TipoAgendamento.PROCEDIMENTO_ENFERMAGEM,
    TipoAgendamento.ENTREVISTA,
  ],
  [ModalidadeAtendimento.JURIDICO]: [
    TipoAgendamento.ATENDIMENTO_JURIDICO,
    TipoAgendamento.AUDIENCIA,
  ],
};

export enum TipoAtendimento {
  CONSULTA = 'consulta',
  RETORNO = 'retorno',
  URGENCIA = 'urgencia',
  TELECONSULTA = 'teleconsulta',
  CONSULTA_ENFERMAGEM = 'consulta_enfermagem',
}

export const TIPO_ATENDIMENTO_LABEL: Record<TipoAtendimento, string> = {
  [TipoAtendimento.CONSULTA]: 'Consulta',
  [TipoAtendimento.RETORNO]: 'Retorno',
  [TipoAtendimento.URGENCIA]: 'Urgência',
  [TipoAtendimento.TELECONSULTA]: 'Teleconsulta',
  [TipoAtendimento.CONSULTA_ENFERMAGEM]: 'Consulta de Enfermagem',
};

// ---- Permissões por módulo (espelho de packages/shared/src/auth/permissao.ts) ----

export enum Modulo {
  DASHBOARD = 'DASHBOARD',
  PACIENTES = 'PACIENTES',
  AGENDA = 'AGENDA',
  PRONTUARIOS = 'PRONTUARIOS',
  DOCUMENTOS = 'DOCUMENTOS',
  FINANCEIRO = 'FINANCEIRO',
  NOTIFICACOES = 'NOTIFICACOES',
  TELEMEDICINA = 'TELEMEDICINA',
  LAUDOS = 'LAUDOS',
  PROCESSOS = 'PROCESSOS',
  ENTREGAS = 'ENTREGAS',
  AVALIACOES = 'AVALIACOES',
  ANALYTICS = 'ANALYTICS',
  FLUXO_CLINICO = 'FLUXO_CLINICO',
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
  [Modulo.FINANCEIRO]: 'Financeiro',
  [Modulo.NOTIFICACOES]: 'Notificações',
  [Modulo.TELEMEDICINA]: 'Telemedicina',
  [Modulo.LAUDOS]: 'Laudos e relatórios',
  [Modulo.PROCESSOS]: 'Processos jurídicos',
  [Modulo.ENTREGAS]: 'Insumos / entregas',
  [Modulo.AVALIACOES]: 'Avaliações de IU',
  [Modulo.ANALYTICS]: 'Relatórios / analytics',
  [Modulo.FLUXO_CLINICO]: 'Fluxo clínico',
  [Modulo.CLINICA]: 'Configuração da clínica',
  [Modulo.SUPER_ADMIN]: 'Super Admin',
};

const M = Modulo;

/** Módulos que cada papel enxerga por padrão (o admin ajusta por usuário). */
export const PERMISSOES_PADRAO_POR_PAPEL: Record<Papel, Modulo[]> = {
  [Papel.SUPER_ADMIN]: TODOS_MODULOS,
  [Papel.ADMIN]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.PRONTUARIOS, M.DOCUMENTOS, M.FINANCEIRO,
    M.NOTIFICACOES, M.TELEMEDICINA, M.LAUDOS, M.PROCESSOS, M.ENTREGAS, M.AVALIACOES,
    M.ANALYTICS, M.FLUXO_CLINICO, M.CLINICA,
  ],
  [Papel.MEDICO]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.PRONTUARIOS, M.DOCUMENTOS, M.TELEMEDICINA,
    M.LAUDOS, M.AVALIACOES, M.ENTREGAS, M.FLUXO_CLINICO,
  ],
  [Papel.ENFERMEIRO]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.PRONTUARIOS, M.DOCUMENTOS, M.AVALIACOES,
    M.LAUDOS, M.ENTREGAS, M.FLUXO_CLINICO,
  ],
  [Papel.ADVOGADO]: [
    M.DASHBOARD, M.PACIENTES, M.PRONTUARIOS, M.PROCESSOS, M.ENTREGAS, M.DOCUMENTOS,
    M.FLUXO_CLINICO,
  ],
  [Papel.SECRETARIA]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.DOCUMENTOS, M.FINANCEIRO, M.NOTIFICACOES, M.FLUXO_CLINICO,
  ],
  [Papel.PACIENTE]: [M.DASHBOARD],
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

export interface AuthUser {
  id: string;
  nome?: string;
  email: string;
  papel: Papel;
  clinicaId?: string;
  /** Permissões efetivas calculadas pela API; ausente em sessões antigas. */
  permissoes?: Modulo[];
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
  programaIU?: boolean;
  observacoes?: string;
  etapaFluxo?: EtapaFluxoClinico;
  etapaFluxoDesde?: string;
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

export type NaturezaAtendimento = 'sus' | 'suplementar' | 'particular';
export type TipoSolicitacaoJudicial = 'medicamento' | 'produto' | 'procedimento';

export interface PrescritorJudicial {
  nome?: string;
  registro?: string;
  especialidade?: string;
}

export interface ProdutoJudicial {
  descricao?: string;
  calibreFrench?: number;
  comprimentoCm?: number;
  quantidadePorDia?: number;
  quantidadePorMes?: number;
  usoContinuo?: boolean;
}

export interface MedicamentoJudicial {
  principioAtivo?: string;
  formaFarmaceuticaApresentacao?: string;
  dose?: string;
  posologia?: string;
  viaAdministracao?: string;
  duracaoTratamento?: string;
}

export interface RelatorioJudicial {
  municipioEstado?: string;
  naturezaAtendimento?: NaturezaAtendimento;
  enfermidadeCid?: string;
  historicoDoenca?: string;
  tratamentosRealizados?: string;
  tipoSolicitacao?: TipoSolicitacaoJudicial;
  produto?: ProdutoJudicial;
  medicamento?: MedicamentoJudicial;
  procedimentoDescricao?: string;
  urgente?: boolean;
  justificativaUrgencia?: string;
  imprescindivel?: boolean;
  justificativaImprescindivel?: string;
  beneficiosEsperados?: string;
  consequenciasNaoUso?: string;
  prescritor?: PrescritorJudicial;
  dataEmissao?: string;
}

export interface AssinaturaProntuario {
  medicoId: string;
  dataAssinatura: string;
  hash?: string;
}

export interface CateterIndicado {
  sexo?: string;
  french?: number;
  codigo?: number;
}

/** Questionário de Avaliação de Incontinência Urinária embutido no prontuário. */
export interface FichaAvaliacaoIU {
  local?: string;
  estadoCivil?: string;
  prescritor?: string;
  planoSaude?: string;
  hospitalReferencia?: string;
  motivoIU?: string;
  inicioSintomas?: string;
  perfilCliente?: string;
  destreza?: string;
  dntui?: boolean;
  tiposIU?: string[];
  miccaoEspontanea?: boolean;
  volumeAproximadoMl?: number;
  realizaCateterismo?: boolean;
  cateterismosDia?: number;
  cateterUtilizado?: string;
  ultimaInfeccaoUrinaria?: string;
  emTratamento?: boolean;
  tratamento?: string;
  volumeDrenado?: string;
  outrasIntercorrencias?: string;
  cateterIndicado?: CateterIndicado;
  encaminhamento?: string;
  localEncaminhamento?: string;
  responsavelCateterismo?: string;
  autorizaPesquisa?: boolean;
  aceitaInformacoes?: boolean;
  emailContato?: string;
  whatsappContato?: string;
  coren?: string;
  respCuidador?: string;
}

export interface RegistroEnfermagem {
  dataLigacao?: string;
  sondaChegouEm?: string;
  observacoes?: string;
}

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
  fichaAvaliacaoIU?: FichaAvaliacaoIU;
  registroEnfermagem?: RegistroEnfermagem;
  relatorioJudicial?: RelatorioJudicial;
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

// Espelho de packages/shared/src/checklist-documentos/documentos-padrao.ts —
// usado como sugestão de nome ao anexar um documento.
export const DOCUMENTOS_PADRAO: string[] = [
  'RG ou CNH (documento de identificação com foto)',
  'Comprovante de endereço',
  'Comprovante de rendimentos',
  'Cópia da carteirinha do SUS',
  'Relatório médico',
  'Negativa administrativa',
];

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

// ---------- Fluxo Clínico — Avaliação de Incontinência Urinária ----------

export enum LocalAtendimento {
  RESIDENCIA = 'residencia',
  HOSPITAL = 'hospital',
  INST_LONGA_PERMANENCIA = 'inst_longa_permanencia',
}
export const LOCAL_LABEL: Record<LocalAtendimento, string> = {
  [LocalAtendimento.RESIDENCIA]: 'Residência',
  [LocalAtendimento.HOSPITAL]: 'Hospital',
  [LocalAtendimento.INST_LONGA_PERMANENCIA]: 'Inst. Longa Permanência',
};

export enum PerfilCliente {
  ATIVO = 'ativo',
  MODERADO = 'moderado',
  ACAMADO = 'acamado',
  CADEIRANTE = 'cadeirante',
}
export const PERFIL_LABEL: Record<PerfilCliente, string> = {
  [PerfilCliente.ATIVO]: 'Ativo',
  [PerfilCliente.MODERADO]: 'Moderado',
  [PerfilCliente.ACAMADO]: 'Acamado',
  [PerfilCliente.CADEIRANTE]: 'Cadeirante',
};

export enum Destreza {
  PRESERVADA = 'preservada',
  REDUZIDA = 'reduzida',
  MUITO_REDUZIDA = 'muito_reduzida',
}
export const DESTREZA_LABEL: Record<Destreza, string> = {
  [Destreza.PRESERVADA]: 'Preservada',
  [Destreza.REDUZIDA]: 'Reduzida',
  [Destreza.MUITO_REDUZIDA]: 'Muito reduzida',
};

export enum TipoIU {
  ESFORCO = 'esforco',
  URGENCIA = 'urgencia',
  MISTA = 'mista',
  RETENCAO_TRANSBORDAMENTO = 'retencao_transbordamento',
  CONTINUA = 'continua',
  INSENSIVEL = 'insensivel',
  ENURESE_NOTURNA = 'enurese_noturna',
  COITO = 'coito',
}
export const TIPO_IU_LABEL: Record<TipoIU, string> = {
  [TipoIU.ESFORCO]: 'Esforço',
  [TipoIU.URGENCIA]: 'Urgência',
  [TipoIU.MISTA]: 'Mista',
  [TipoIU.RETENCAO_TRANSBORDAMENTO]: 'Retenção/Transbordamento',
  [TipoIU.CONTINUA]: 'Contínua',
  [TipoIU.INSENSIVEL]: 'Insensível',
  [TipoIU.ENURESE_NOTURNA]: 'Enurese Noturna',
  [TipoIU.COITO]: 'Coito',
};

export enum EncaminhamentoIU {
  POLO_SUS = 'polo_sus',
  PLANO_SAUDE = 'plano_saude',
  VAREJO = 'varejo',
}
export const ENCAMINHAMENTO_LABEL: Record<EncaminhamentoIU, string> = {
  [EncaminhamentoIU.POLO_SUS]: 'Pólo SUS',
  [EncaminhamentoIU.PLANO_SAUDE]: 'Plano de Saúde',
  [EncaminhamentoIU.VAREJO]: 'Varejo',
};

export interface AvaliacaoIU {
  id: string;
  clinicaId: string;
  pacienteId: string;
  enfermeiroId: string;
  agendamentoId?: string;
  dataAtendimento: string;
  local: LocalAtendimento;
  prescritor?: string;
  planoSaude?: string;
  hospitalReferencia?: string;
  motivoIU: string;
  inicioSintomas?: string;
  perfilCliente: PerfilCliente;
  destreza: Destreza;
  dntui: boolean;
  tiposIU: TipoIU[];
  miccaoEspontanea: boolean;
  volumeAproximadoMl?: number;
  realizaCateterismo: boolean;
  cateterismosDia?: number;
  cateterUtilizado?: string;
  ultimaInfeccaoUrinaria?: string;
  emTratamento: boolean;
  tratamento?: string;
  volumeDrenadoMl?: string;
  outrasIntercorrencias?: string;
  produtoIndicado?: { codigo: number; sexo: 'feminino' | 'masculino'; french: number };
  responsavelCateterismo?: string;
  autorizaPesquisa: boolean;
  aceitaInformacoes: boolean;
  emailContato?: string;
  whatsappContato?: string;
  coren?: string;
  encaminhamento?: EncaminhamentoIU;
  localEncaminhamento?: string;
  respCuidador?: string;
  criadoEm: string;
}

export enum StatusElegibilidade {
  EM_AVALIACAO = 'em_avaliacao',
  ELEGIVEL = 'elegivel',
  NAO_ELEGIVEL = 'nao_elegivel',
}
export const STATUS_ELEGIBILIDADE_LABEL: Record<StatusElegibilidade, string> = {
  [StatusElegibilidade.EM_AVALIACAO]: 'Em avaliação',
  [StatusElegibilidade.ELEGIVEL]: 'Elegível',
  [StatusElegibilidade.NAO_ELEGIVEL]: 'Não elegível',
};

export interface FollowUp {
  id: string;
  clinicaId: string;
  pacienteId: string;
  avaliacaoIuId: string;
  enfermeiroId: string;
  dataFollowup: string;
  statusElegibilidade: StatusElegibilidade;
  observacoes: string;
  proximoFollowup?: string;
  criadoEm: string;
}

export interface LaudoMedico {
  id: string;
  clinicaId: string;
  pacienteId: string;
  medicoId: string;
  avaliacaoIuId: string;
  dataLaudo: string;
  cid10: string[];
  justificativaMedica: string;
  fundamentoLegal: string;
  produtosSolicitados: Array<{ codigo: number; descricao: string; quantidade: number; unidade: string; codigoSiafisico?: number }>;
  assinado?: { medicoId: string; dataAssinatura: string };
  criadoEm: string;
}

export enum StatusProcesso {
  EM_PREPARACAO = 'em_preparacao',
  PROTOCOLADO = 'protocolado',
  EM_ANDAMENTO = 'em_andamento',
  GANHO = 'ganho',
  PERDIDO = 'perdido',
  ARQUIVADO = 'arquivado',
}
export const STATUS_PROCESSO_LABEL: Record<StatusProcesso, string> = {
  [StatusProcesso.EM_PREPARACAO]: 'Em preparação',
  [StatusProcesso.PROTOCOLADO]: 'Protocolado',
  [StatusProcesso.EM_ANDAMENTO]: 'Em andamento',
  [StatusProcesso.GANHO]: 'Ganho',
  [StatusProcesso.PERDIDO]: 'Perdido',
  [StatusProcesso.ARQUIVADO]: 'Arquivado',
};

export interface ProcessoJuridico {
  id: string;
  clinicaId: string;
  pacienteId: string;
  avaliacaoIuId: string;
  laudoMedicoId: string;
  advogadoId: string;
  status: StatusProcesso;
  numeroProcesso?: string;
  tribunal?: string;
  dataProtocolo?: string;
  dataDecisao?: string;
  observacoes?: string;
  documentos: Array<{ nome: string; url: string; tipo: string; adicionadoEm: string }>;
  criadoEm: string;
}

export interface AnotacaoJuridica {
  id: string;
  clinicaId: string;
  pacienteId: string;
  autorId: string;
  texto: string;
  criadoEm: string;
}

export enum StatusChecklistDocumento {
  PENDENTE = 'pendente',
  RECEBIDO = 'recebido',
}
export const STATUS_CHECKLIST_DOCUMENTO_LABEL: Record<StatusChecklistDocumento, string> = {
  [StatusChecklistDocumento.PENDENTE]: 'Pendente',
  [StatusChecklistDocumento.RECEBIDO]: 'Recebido',
};

export interface ChecklistDocumentoItem {
  id: string;
  clinicaId: string;
  pacienteId: string;
  nome: string;
  status: StatusChecklistDocumento;
  observacao?: string;
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
}

export enum OrigemEntrega {
  SUS = 'sus',
  PLANO_SAUDE = 'plano_saude',
  VAREJO = 'varejo',
  DOACAO = 'doacao',
}
export const ORIGEM_ENTREGA_LABEL: Record<OrigemEntrega, string> = {
  [OrigemEntrega.SUS]: 'SUS',
  [OrigemEntrega.PLANO_SAUDE]: 'Plano de Saúde',
  [OrigemEntrega.VAREJO]: 'Varejo',
  [OrigemEntrega.DOACAO]: 'Doação',
};

export enum StatusEntrega {
  PENDENTE = 'pendente',
  ENVIADA = 'enviada',
  ENTREGUE = 'entregue',
  DEVOLVIDA = 'devolvida',
}
export const STATUS_ENTREGA_LABEL: Record<StatusEntrega, string> = {
  [StatusEntrega.PENDENTE]: 'Pendente',
  [StatusEntrega.ENVIADA]: 'Enviada',
  [StatusEntrega.ENTREGUE]: 'Entregue',
  [StatusEntrega.DEVOLVIDA]: 'Devolvida',
};

export interface Entrega {
  id: string;
  clinicaId: string;
  pacienteId: string;
  processoJuridicoId?: string;
  avaliacaoIuId?: string;
  responsavelId: string;
  dataEntrega: string;
  origem: OrigemEntrega;
  status: StatusEntrega;
  itens: Array<{ codigo: number; descricao: string; quantidade: number; valorUnitarioCentavos: number; valorTotalCentavos: number }>;
  valorTotalCentavos: number;
  notaFiscal?: string;
  observacoes?: string;
  criadoEm: string;
}

// Espelho de packages/shared/src/fluxo-clinico/etapa.ts — etapa persistida do
// pipeline clínico (fonte de verdade fica no backend).
export enum EtapaFluxoClinico {
  AGUARDANDO_ATENDIMENTO = 'aguardando_atendimento',
  AVALIACAO_IU = 'avaliacao_iu',
  APTO_AGUARDANDO_CONTATO = 'apto_aguardando_contato',
  ENTREVISTA_AGENDADA = 'entrevista_agendada',
  AGUARDANDO_DOCUMENTOS = 'aguardando_documentos',
  AGUARDANDO_CONSULTA_MEDICA = 'aguardando_consulta_medica',
  AGUARDANDO_ENVIO_JURIDICO = 'aguardando_envio_juridico',
  PROCESSO_JURIDICO = 'processo_juridico',
  NAO_ELEGIVEL = 'nao_elegivel',
  CONCLUIDO = 'concluido',
}

export const ETAPA_FLUXO_LABEL: Record<EtapaFluxoClinico, string> = {
  [EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO]: 'Aguardando Atendimento',
  [EtapaFluxoClinico.AVALIACAO_IU]: 'Avaliação IU / Teste do Produto',
  [EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO]: 'Apto — Aguardando Contato',
  [EtapaFluxoClinico.ENTREVISTA_AGENDADA]: 'Entrevista Agendada',
  [EtapaFluxoClinico.AGUARDANDO_DOCUMENTOS]: 'Aguardando Documentos',
  [EtapaFluxoClinico.AGUARDANDO_CONSULTA_MEDICA]: 'Aguardando Consulta Médica',
  [EtapaFluxoClinico.AGUARDANDO_ENVIO_JURIDICO]: 'Aguardando Envio ao Jurídico',
  [EtapaFluxoClinico.PROCESSO_JURIDICO]: 'Processo Jurídico',
  [EtapaFluxoClinico.NAO_ELEGIVEL]: 'Não Elegível',
  [EtapaFluxoClinico.CONCLUIDO]: 'Concluído',
};

/** Prazos (em dias) só para as etapas com SLA definido pelo negócio. */
export const PRAZO_DIAS_POR_ETAPA: Partial<Record<EtapaFluxoClinico, number>> = {
  [EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO]: 10,
  [EtapaFluxoClinico.AVALIACAO_IU]: 20,
  [EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO]: 15,
  [EtapaFluxoClinico.AGUARDANDO_DOCUMENTOS]: 10,
  [EtapaFluxoClinico.AGUARDANDO_CONSULTA_MEDICA]: 15, // prazo médio, não SLA duro
};

export interface PrazoEtapaInfo {
  diasLimite?: number;
  diasDecorridos: number;
  diasRestantes?: number;
  atrasado: boolean;
}

/** Calcula a situação de prazo de uma etapa a partir de quando ela começou. */
export function calcularPrazoEtapa(
  etapa: EtapaFluxoClinico,
  etapaDesde: string,
  agora: Date = new Date(),
): PrazoEtapaInfo {
  const diasLimite = PRAZO_DIAS_POR_ETAPA[etapa];
  const msPorDia = 24 * 60 * 60 * 1000;
  const diasDecorridos = Math.floor((agora.getTime() - new Date(etapaDesde).getTime()) / msPorDia);

  if (diasLimite === undefined) {
    return { diasDecorridos, atrasado: false };
  }

  const diasRestantes = diasLimite - diasDecorridos;
  return { diasLimite, diasDecorridos, diasRestantes, atrasado: diasRestantes < 0 };
}

/**
 * Avanço MANUAL do fluxo ("Avançar etapa" na tela do paciente) — espelho de
 * packages/shared/src/fluxo-clinico/etapa.ts. Usado só pra decidir se/como
 * mostrar o botão; a validação de verdade (papel x etapa) é feita no backend.
 * Ficam de fora as etapas cujo gatilho automático produz um documento
 * clínico/legal essencial (Avaliação IU, Laudo Médico) — pular via botão
 * perderia esse registro.
 */
export const PROXIMA_ETAPA_MANUAL: Partial<Record<EtapaFluxoClinico, EtapaFluxoClinico>> = {
  [EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO]: EtapaFluxoClinico.ENTREVISTA_AGENDADA,
  [EtapaFluxoClinico.ENTREVISTA_AGENDADA]: EtapaFluxoClinico.AGUARDANDO_DOCUMENTOS,
  [EtapaFluxoClinico.AGUARDANDO_DOCUMENTOS]: EtapaFluxoClinico.AGUARDANDO_CONSULTA_MEDICA,
  [EtapaFluxoClinico.AGUARDANDO_ENVIO_JURIDICO]: EtapaFluxoClinico.PROCESSO_JURIDICO,
};

export const PAPEIS_AVANCO_MANUAL: Partial<Record<EtapaFluxoClinico, Papel[]>> = {
  [EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO]: [Papel.SECRETARIA],
  [EtapaFluxoClinico.ENTREVISTA_AGENDADA]: [Papel.SECRETARIA],
  [EtapaFluxoClinico.AGUARDANDO_DOCUMENTOS]: [Papel.SECRETARIA],
  [EtapaFluxoClinico.AGUARDANDO_ENVIO_JURIDICO]: [Papel.ADVOGADO],
};

export interface Produto {
  id: string;
  codigo: number;
  nome: string;
  tipo: string;
  sexo: string;
  embalagem: string;
  french?: number;
  comprimentoCm?: number;
  descricaoTecnica: string;
  descricaoSiafisico?: string;
  codigoSiafisico?: number;
  ativo: boolean;
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
