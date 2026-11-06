import type { AvaliacaoLesao, IdentificacaoLesao, PontoMedida, StatusLesao } from '@shared/consulta';
// Enums e tipos espelhados da API NestJS (packages/shared + domain entities).

export enum Papel {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  ENFERMEIRO = 'ENFERMEIRO',
  SECRETARIA = 'SECRETARIA',
  PACIENTE = 'PACIENTE',
}

export const PAPEL_LABEL: Record<Papel, string> = {
  [Papel.SUPER_ADMIN]: 'Super Admin',
  [Papel.ADMIN]: 'Administrador',
  [Papel.ENFERMEIRO]: 'Enfermeiro(a)',
  [Papel.SECRETARIA]: 'Secretaria',
  [Papel.PACIENTE]: 'Paciente',
};

// Papéis profissionais que prestam atendimento (paridade de permissões clínicas).
export const PAPEIS_PROFISSIONAIS: Papel[] = [
  Papel.ENFERMEIRO,
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
// (atendimento psicológico) — visibilidade restrita ao papel ENFERMEIRO.
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
    // Sem PRONTUARIOS: dado clínico é do enfermeiro (a API nega o prontuário ao admin).
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.DOCUMENTOS,
    M.NOTIFICACOES, M.TELEMEDICINA, M.ANALYTICS, M.CLINICA,
  ],
  // Atendimento psicológico é um extra: só o enfermeiro enxerga por padrão;
  // outros usuários ganham por concessão individual no painel super-admin.
  // O financeiro da psicologia é o único financeiro do produto — é o caixa
  // do próprio enfermeiro (autônomo), por ciclo de sessões.
  [Papel.ENFERMEIRO]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.DOCUMENTOS, M.TELEMEDICINA,
    M.ATENDIMENTO_PSICOLOGICO, M.FINANCEIRO_PSICOLOGIA, M.ANALYTICS,
  ],
  [Papel.SECRETARIA]: [
    M.DASHBOARD, M.PACIENTES, M.AGENDA, M.DOCUMENTOS, M.NOTIFICACOES, M.ANALYTICS,
  ],
  // O paciente não tem tela nem API de dados: só o Dashboard. Relatórios trazem dados da clínica inteira.
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
  /** COREN do enfermeiro (assinatura dos documentos clínicos). Preenchido uma vez pelo próprio; ausente = sem COREN. */
  coren?: string;
  /** Permissões efetivas calculadas pela API; ausente em sessões antigas. */
  permissoes?: Modulo[];
  /** Troca de senha obrigatória no próximo login (feature-forced-password-change). Ausente em sessões antigas. */
  deveTrocarSenha?: boolean;
  /** Aceite dos Termos de Uso (feature-terms-of-service-acceptance). null/ausente = não aceito. */
  termosAceitos?: TermosAceitos | null;
  /** Clínica em fase de teste: o termo exigido é o Termo de Teste. Ausente = false. */
  faseTeste?: boolean;
}

/** Rótulo do registro profissional conforme o papel (CRM/COREN/OAB). */
export const REGISTRO_LABEL: Partial<Record<Papel, string>> = {
  [Papel.ENFERMEIRO]: 'COREN',
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

/** Classificação de área do paciente (espelho de packages/shared/src/paciente/classificacao.ts). */
export enum ClassificacaoArea {
  IU = 'IU',
  FA = 'FA',
  OT = 'OT',
}

export const CLASSIFICACAO_AREA_LABEL: Record<ClassificacaoArea, string> = {
  [ClassificacaoArea.IU]: 'IU — Incontinência urinária e anal',
  [ClassificacaoArea.FA]: 'FA — Feridas',
  [ClassificacaoArea.OT]: 'OT — Ostomias',
};

/** Elegibilidade ao fluxo clínico (DERIVADA): classificado exatamente como IU. Espelha o shared/backend. */
export function elegivelFluxoClinico(classificacoes?: readonly ClassificacaoArea[] | null): boolean {
  return !!classificacoes && classificacoes.length === 1 && classificacoes[0] === ClassificacaoArea.IU;
}

export enum EtapaFluxoClinico {
  AGUARDANDO_ATENDIMENTO = 'aguardando_atendimento',
  AVALIACAO_IU = 'avaliacao_iu',
  APTO_AGUARDANDO_CONTATO = 'apto_aguardando_contato',
  ENTREVISTA_AGENDADA = 'entrevista_agendada',
  AGUARDANDO_DOCUMENTOS = 'aguardando_documentos',
  AGUARDANDO_CONSULTA_MEDICA = 'aguardando_consulta_medica',
  AGUARDANDO_ENTREGA = 'aguardando_entrega',
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
  [EtapaFluxoClinico.AGUARDANDO_ENTREGA]: 'Aguardando Entrega',
  [EtapaFluxoClinico.NAO_ELEGIVEL]: 'Não Elegível',
  [EtapaFluxoClinico.CONCLUIDO]: 'Concluído',
};

/** Prazos (em dias) só para as etapas com SLA definido pelo negócio (espelho do shared). */
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
  /** Classificação de área (IU/FA/OT). Ausente em dado anterior à classificação. */
  classificacoes?: ClassificacaoArea[];
  /** Etapa do fluxo clínico; ausente = fora do fluxo. Mantida mesmo se o paciente deixar de ser elegível. */
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

/** Documento de comparecimento emitido pelo servidor: texto e dados de assinatura vêm prontos. */
export interface DocumentoEmitido {
  id: string;
  protocolo: string;
  tipo: 'DECLARACAO_COMPARECIMENTO' | 'ATESTADO_COMPARECIMENTO';
  titulo: string;
  corpo: string;
  atendimento: { data: string; horaInicio: string; horaFim: string };
  emissor: { nome: string; coren?: string };
  clinica: { nome: string };
  emitidoEm: string;
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
  /** COREN do perfil carimbado pelo servidor ao assinar. Ausente nos registros anteriores. */
  coren?: string;
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
  coren?: string;

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
  ['coren', 'COREN'],
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

/** Fatos do laudo calculados pelo servidor sobre sessões ancoradas na agenda. */
export interface ResumoAcompanhamento {
  desde: string | null;
  totalSessoes: number;
}

export interface Prontuario {
  id: string;
  clinicaId: string;
  pacienteId: string;
  /** Atendimento da agenda a que o prontuário está ancorado (ausente só em registros antigos). */
  agendamentoId?: string;
  dataAtendimento: string;
  tipo: TipoAtendimento;
  assinado?: AssinaturaProntuario;
  subjetivo?: ProntuarioSubjetivo;
  objetivo?: ProntuarioObjetivo;
  avaliacao?: ProntuarioAvaliacao;
  plano?: ProntuarioPlano;
  registroPsicologico?: RegistroPsicologico;
  /** Formulário usado no registro de psicoterapia (gravado pelo servidor). Ausente nos registros antigos. */
  formulario?: 'completo' | 'seguimento';
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

// ---------- Financeiro da psicologia (enfermeiro autônomo) ----------

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
  /** Fechou um ciclo e o novo ainda não tem cobrança: hora de renovar. */
  ciclosFechadosARenovar: number;
  /** Ciclo atual sem cobrança, sem ter fechado um ciclo. */
  ciclosSemCobranca: number;
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

// ---------- Produtos (catálogo operacional global) e Entregas ----------
// TODO(conteudo): rótulos de incontinência urinária (sonda, coletor, marcas, SUS) — revisar na etapa de conteúdo.
export enum TipoProduto {
  CATETER_VAPRO = 'cateter_vapro',
  COLETOR_ACTICOAT = 'coletor_acticoat',
  CATETER_SAMTRONIC = 'cateter_samtronic',
}
// Valores já conhecidos. O tipo/linha de um produto é TEXTO LIVRE (linha nova não exige mudar código): para valor fora
// daqui, a tela mostra o próprio texto.
export const TIPO_PRODUTO_LABEL: Record<string, string> = {
  [TipoProduto.CATETER_VAPRO]: 'Cateter (VaPro)',
  [TipoProduto.COLETOR_ACTICOAT]: 'Coletor (Acticoat)',
  [TipoProduto.CATETER_SAMTRONIC]: 'Cateter (Samtronic)',
};

export enum SexoProduto {
  MASCULINO = 'masculino',
  FEMININO = 'feminino',
  UNIVERSAL = 'universal',
}
export const SEXO_PRODUTO_LABEL: Record<SexoProduto, string> = {
  [SexoProduto.MASCULINO]: 'Masculino',
  [SexoProduto.FEMININO]: 'Feminino',
  [SexoProduto.UNIVERSAL]: 'Universal',
};

export enum EmbalagemProduto {
  STANDARD = 'standard',
  POCKET = 'pocket',
}
export const EMBALAGEM_PRODUTO_LABEL: Record<EmbalagemProduto, string> = {
  [EmbalagemProduto.STANDARD]: 'Standard',
  [EmbalagemProduto.POCKET]: 'Pocket',
};

export enum ProjetoCatalogo {
  ALPHA = 'ALPHA',
  BETA = 'BETA',
  SIGMA = 'SIGMA',
}

export interface Produto {
  id: string;
  codigo: number;
  codigoFabricante?: string;
  nome: string;
  tipo: string;
  sexo: SexoProduto;
  embalagem: EmbalagemProduto;
  projeto: ProjetoCatalogo;
  french?: number;
  comprimentoCm?: number;
  descricaoTecnica: string;
  descricaoSiafisico?: string;
  codigoSiafisico?: number;
  ativo: boolean;
}

export enum OrigemEntrega {
  SUS = 'sus',
  PLANO_SAUDE = 'plano_saude',
  VAREJO = 'varejo',
  DOACAO = 'doacao',
}
export const ORIGEM_ENTREGA_LABEL: Record<OrigemEntrega, string> = {
  [OrigemEntrega.SUS]: 'SUS',
  [OrigemEntrega.PLANO_SAUDE]: 'Plano de saúde',
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

export interface ItemEntrega {
  codigo: number;
  descricao: string;
  quantidade: number;
  valorUnitarioCentavos: number;
  valorTotalCentavos: number;
  categoria?: string;
}

export interface Entrega {
  id: string;
  clinicaId: string;
  pacienteId: string;
  dataEntrega: string;
  origem: OrigemEntrega;
  status: StatusEntrega;
  itens: ItemEntrega[];
  valorTotalCentavos: number;
  notaFiscal?: string;
  observacoes?: string;
}

// ---------- Checklist de documentos e Follow-up (etapa 3c) ----------
// TODO(conteudo): rótulos de elegibilidade/documentos (SUS, laudo) são do fluxo de incontinência urinária — revisar.
export enum StatusChecklistDocumento {
  PENDENTE = 'pendente',
  RECEBIDO = 'recebido',
}

export interface ChecklistItem {
  id: string;
  clinicaId: string;
  pacienteId: string;
  nome: string;
  status: StatusChecklistDocumento;
  observacao?: string;
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
  avaliacaoIuId?: string;
  enfermeiroId: string;
  dataFollowup: string;
  statusElegibilidade: StatusElegibilidade;
  observacoes: string;
  proximoFollowup?: string;
}

// ---------- Avaliação de IU (etapa 4a) ----------
// TODO(conteudo): enums, rótulos e campos da ficha são do fluxo de incontinência urinária — mantidos como no Nuvita
// antigo; revisar na etapa de conteúdo (estomaterapia).
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
  enfermeiroNome?: string;
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
  produtoIndicado?: { codigo: number; sexo: 'feminino' | 'masculino' | 'universal'; french: number };
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

// ---------- Financeiro de paciente do Estomaterapia (etapa 4b): REGISTRO de cobranças + AVISOS ----------
// O sistema NÃO recebe dinheiro de paciente (a clínica recebe por fora). Valores em CENTAVOS.
// TODO(conteudo): rótulos de tipo/forma/status e textos de cobrança — revisar na etapa de conteúdo.
export enum TipoCobranca {
  /** Só gerada pela assinatura da consulta de enfermagem. */
  CONSULTA_ENFERMAGEM = 'consulta_enfermagem',
  PACOTE_MENSAL = 'pacote_mensal',
  OUTRO = 'outro',
}
export const TIPO_COBRANCA_LABEL: Record<TipoCobranca, string> = {
  // TODO(conteudo): rótulo da cobrança gerada na assinatura da consulta.
  [TipoCobranca.CONSULTA_ENFERMAGEM]: 'Consulta de enfermagem',
  [TipoCobranca.PACOTE_MENSAL]: 'Pacote mensal',
  [TipoCobranca.OUTRO]: 'Outro',
};

export enum FormaPagamentoCobranca {
  A_VISTA = 'a_vista',
  PIX = 'pix',
  CREDITO = 'credito',
  BOLETO = 'boleto',
  OUTRO = 'outro',
}
export const FORMA_PAGAMENTO_COBRANCA_LABEL: Record<FormaPagamentoCobranca, string> = {
  [FormaPagamentoCobranca.A_VISTA]: 'À vista',
  [FormaPagamentoCobranca.PIX]: 'Pix',
  [FormaPagamentoCobranca.CREDITO]: 'Crédito',
  [FormaPagamentoCobranca.BOLETO]: 'Boleto',
  [FormaPagamentoCobranca.OUTRO]: 'Outro',
};

export enum StatusCobranca {
  PENDENTE = 'pendente',
  ENVIADA = 'enviada',
  PAGA = 'paga',
  VENCIDA = 'vencida',
  CANCELADA = 'cancelada',
}
export const STATUS_COBRANCA_LABEL: Record<StatusCobranca, string> = {
  [StatusCobranca.PENDENTE]: 'Pendente',
  [StatusCobranca.ENVIADA]: 'Enviada',
  [StatusCobranca.PAGA]: 'Paga',
  [StatusCobranca.VENCIDA]: 'Vencida',
  [StatusCobranca.CANCELADA]: 'Cancelada',
};

export interface ItemCobranca {
  descricao: string;
  valorCentavos: number;
}

export interface Cobranca {
  id: string;
  clinicaId: string;
  pacienteId: string;
  tipo: TipoCobranca;
  descricao: string;
  valorCentavos: number;
  itens: ItemCobranca[];
  formaPagamento?: FormaPagamentoCobranca;
  parcelas?: number;
  vencimento: string;
  /** Status EFETIVO: pendente/enviada com vencimento passado já vem como `vencida`. */
  status: StatusCobranca;
  enviadaEm?: string;
  pagaEm?: string;
  canceladaEm?: string;
  motivoCancelamento?: string;
}

export interface ResumoFinanceiroMensal {
  mes: string;
  aReceberCentavos: number;
  recebidoCentavos: number;
  vencidoCentavos: number;
  quantidades: { aReceber: number; recebido: number; vencido: number };
}

// ---------- Consulta de enfermagem (etapa 5a): 5 etapas da Res. Cofen 736/2024 ----------
// Estrutura apenas: nenhum conteúdo clínico (lista de diagnósticos, escala, taxonomia) vem do sistema.
// TODO(conteudo): rótulos/orientações de cada etapa.
export enum StatusConsulta {
  RASCUNHO = 'RASCUNHO',
  ASSINADA = 'ASSINADA',
}
export enum AreaModuloAvaliacao {
  IU = 'IU',
  INCONTINENCIA_ANAL = 'INCONTINENCIA_ANAL',
  FERIDA = 'FERIDA',
  OSTOMIA = 'OSTOMIA',
}
export enum PadraoImplementacao {
  AUTONOMO = 'AUTONOMO',
  INTERPROFISSIONAL = 'INTERPROFISSIONAL',
  PROGRAMA_SAUDE = 'PROGRAMA_SAUDE',
}
export const PADRAO_IMPLEMENTACAO_LABEL: Record<PadraoImplementacao, string> = {
  [PadraoImplementacao.AUTONOMO]: 'Autônomo',
  [PadraoImplementacao.INTERPROFISSIONAL]: 'Interprofissional',
  [PadraoImplementacao.PROGRAMA_SAUDE]: 'Programa de saúde',
};
export enum StatusCobrancaConsulta {
  GERADA = 'GERADA',
  INCLUIDA_EM_PACOTE = 'INCLUIDA_EM_PACOTE',
  PENDENTE_GERACAO = 'PENDENTE_GERACAO',
}
export const STATUS_COBRANCA_CONSULTA_LABEL: Record<StatusCobrancaConsulta, string> = {
  [StatusCobrancaConsulta.GERADA]: 'Cobrança gerada',
  [StatusCobrancaConsulta.INCLUIDA_EM_PACOTE]: 'Incluída em pacote',
  [StatusCobrancaConsulta.PENDENTE_GERACAO]: 'Cobrança pendente',
};

export interface ConsultaEnfermagem {
  id: string;
  clinicaId: string;
  pacienteId: string;
  enfermeiroId: string;
  status: StatusConsulta;
  avaliacao: { dadosSubjetivos: string; dadosObjetivos: string; modulos: Array<{ area: AreaModuloAvaliacao; dados: Record<string, unknown> }> };
  diagnosticos: Array<{ texto: string; origem: 'MANUAL' | 'IA_ACEITA' | 'IA_EDITADA' }>;
  planejamento: {
    prioridades: string;
    resultadosEsperados: string;
    prescricaoEnfermagem: string[];
    examesSolicitados: string;
    encaminhamentos: string;
  };
  implementacao: { registros: Array<{ padrao: PadraoImplementacao; descricao: string; registradoEm: string; registradoPor: string }> };
  evolucao: { texto: string };
  assinatura?: { enfermeiroId: string; coren: string; dataAssinatura: string };
  cobranca?: { incluidaEmPacote: boolean; valorCentavos?: number; status: StatusCobrancaConsulta; cobrancaId?: string };
  /** Feridas (5c): situação da aplicação do desfecho nas lesões (só quando algum desfecho fecha lesão). */
  desfechoLesoesStatus?: 'APLICADO' | 'PENDENTE_APLICACAO';
  criadoEm: string;
  atualizadoEm: string;
}

/** Anexo da consulta (foto/PDF do diário). A URL privada do storage nunca vem ao cliente. */
export interface AnexoConsulta {
  id: string;
  consultaId: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  tamanho: number;
  enviadoPor: string;
  /** Foto de ferida (5c): lesão a que pertence. */
  lesaoId?: string;
  confirmadoEm: string | null;
  criadoEm: string;
}

export interface AdendoConsulta {
  id: string;
  consultaId: string;
  numero: number;
  autorId: string;
  motivo: string;
  texto: string;
  criadoEm: string;
}

// ---------- Feridas (etapa 5c) ----------
export interface CorrecaoLesao {
  em: string;
  por: string;
  motivo: string;
  anterior: IdentificacaoLesao;
}

export interface Lesao extends IdentificacaoLesao {
  id: string;
  clinicaId: string;
  pacienteId: string;
  numero: number;
  dataIdentificacao: string;
  status: StatusLesao;
  motivoEncerramento?: string;
  statusConsultaId?: string;
  statusAlteradoEm?: string;
  correcoes: CorrecaoLesao[];
  versao: number;
  criadaPor: string;
  criadaEm: string;
}

export interface ConsentimentoImagem {
  id: string;
  pacienteId: string;
  obtidoEm: string;
  registradoPor: string;
  revogadoEm: string | null;
  revogadoPor: string | null;
  criadoEm: string;
}

export interface HistoricoLesao {
  lesao: Lesao;
  avaliacoes: Array<{ consultaId: string; assinadaEm: string; enfermeiroId: string; avaliacao: AvaliacaoLesao; medidas: PontoMedida[] }>;
}
