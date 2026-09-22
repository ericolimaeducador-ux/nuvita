export enum Sexo {
  FEMININO = 'FEMININO',
  MASCULINO = 'MASCULINO',
  OUTRO = 'OUTRO',
  NAO_INFORMADO = 'NAO_INFORMADO',
}

// Classificação interna do paciente. Hoje só existe o Projeto PSI
// (atendimento psicológico) — visibilidade restrita ao papel PSICOLOGO (ver
// PacientesService.list/findOne).
export enum ProjetoPaciente {
  PSI = 'PSI',
}

/** Abordagem terapêutica adotada com o paciente — orienta os campos
 * específicos registrados em cada sessão (ver RegistroPsicologico). */
export enum LinhaTerapeutica {
  TCC = 'TCC',
  PSICANALISE = 'PSICANALISE',
  HUMANISTA = 'HUMANISTA',
  GESTALT = 'GESTALT',
  JUNGUIANA = 'JUNGUIANA',
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

export interface Convenio {
  nome?: string;
  numeroCarteirinha?: string;
  validade?: string;
}

export interface ConsentimentoLGPD {
  aceito: boolean;
  dataAceite: Date;
  versao: string;
}

/**
 * Responsável legal de paciente menor de idade (Art. 8º do Código de Ética
 * Profissional do CFP + Resolução CFP nº 13/2022 — citados pelo usuário;
 * fonte ainda não verificada em texto normativo primário nesta sessão).
 * Todos os campos ficam opcionais no TIPO — a obrigatoriedade condicional
 * (quando o paciente é menor) é regra de negócio, validada em
 * PacientesService, não uma restrição estrutural do dado.
 */
export interface ResponsavelLegal {
  nome?: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  /** Ex.: "mãe", "pai", "tutor legal". Texto livre — sem catálogo fechado no MVP. */
  vinculo?: string;
}

export interface AutorizacaoResponsavel {
  confirmado: boolean;
  /** context.user.sub de quem confirmou — mesmo padrão de `criadoPor` em agendamento/lançamento financeiro. */
  registradaPor?: string;
  registradaEm?: Date;
}

export interface Paciente {
  id: string;
  clinicaId: string;
  nome: string;
  cpf?: string;
  dataNascimento?: Date;
  sexo?: Sexo;
  telefone?: string;
  email?: string;
  endereco?: Endereco;
  convenio?: Convenio;
  consentimentoLGPD?: ConsentimentoLGPD;
  projeto?: ProjetoPaciente;
  linhaTerapeutica?: LinhaTerapeutica;
  /** Quem indicou/encaminhou o paciente. Texto livre, não criptografado — precisa ser filtrável/agregável. */
  representante?: string;
  responsavelLegal?: ResponsavelLegal;
  autorizacaoResponsavel?: AutorizacaoResponsavel;
  observacoes?: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
