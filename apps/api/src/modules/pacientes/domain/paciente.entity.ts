export enum Sexo {
  FEMININO = 'FEMININO',
  MASCULINO = 'MASCULINO',
  OUTRO = 'OUTRO',
  NAO_INFORMADO = 'NAO_INFORMADO',
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
  cpf: string;
  dataNascimento: Date;
  sexo: Sexo;
  telefone?: string;
  email?: string;
  endereco?: Endereco;
  convenio?: Convenio;
  consentimentoLGPD: ConsentimentoLGPD;
  programaIU?: boolean;
  observacoes?: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
