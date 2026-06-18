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
