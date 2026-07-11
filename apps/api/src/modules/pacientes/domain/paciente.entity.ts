import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';

export enum Sexo {
  FEMININO = 'FEMININO',
  MASCULINO = 'MASCULINO',
  OUTRO = 'OUTRO',
  NAO_INFORMADO = 'NAO_INFORMADO',
}

// Classificação interna de projeto (tipo de cateter). Os nomes dos
// fabricantes são propriedade intelectual e NUNCA aparecem no sistema —
// só os rótulos neutros Alpha/Beta. O mapeamento fica fora do software.
export enum ProjetoPaciente {
  ALPHA = 'ALPHA',
  BETA = 'BETA',
  // Pacientes de atendimento psicológico — visibilidade restrita ao papel
  // PSICOLOGO (ver PacientesService.list/findOne). Não faz parte do
  // programa de cateterismo/incontinência urinária.
  PSI = 'PSI',
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
  programaIU?: boolean;
  projeto?: ProjetoPaciente;
  observacoes?: string;
  etapaFluxo: EtapaFluxoClinico;
  etapaFluxoDesde: Date;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
