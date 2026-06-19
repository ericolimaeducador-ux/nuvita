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
}

export const TIPO_ATENDIMENTO_LABEL: Record<TipoAtendimento, string> = {
  [TipoAtendimento.CONSULTA]: 'Consulta',
  [TipoAtendimento.RETORNO]: 'Retorno',
  [TipoAtendimento.URGENCIA]: 'Urgência',
  [TipoAtendimento.TELECONSULTA]: 'Teleconsulta',
};

export interface AuthUser {
  id: string;
  nome?: string;
  email: string;
  papel: Papel;
  clinicaId?: string;
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
  programaVaPro?: boolean;
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

export interface Prontuario {
  id: string;
  clinicaId: string;
  pacienteId: string;
  dataAtendimento: string;
  tipo: TipoAtendimento;
  assinado?: boolean;
  subjetivo?: Record<string, unknown>;
  objetivo?: Record<string, unknown>;
  avaliacao?: Record<string, unknown>;
  plano?: Record<string, unknown>;
}

export interface Documento {
  id: string;
  nome?: string;
  titulo?: string;
  tipo?: string;
  tamanho?: number;
  status?: string;
  criadoEm?: string;
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

// ---------- Fluxo Clínico VaPro ----------

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
