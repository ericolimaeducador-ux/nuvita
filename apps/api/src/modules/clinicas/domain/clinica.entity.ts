export enum PlanoClinica {
  BASICO = 'basico',
  PROFISSIONAL = 'profissional',
  ENTERPRISE = 'enterprise',
}

export interface EnderecoClinica {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

export interface ConfiguracoesClinica {
  logoUrl?: string;
  corPrimaria?: string;
  whatsappNumero?: string;
  emailRemetente?: string;
  fusoHorario: string;
  duracaoConsultaPadrao: number;
}

export interface Clinica {
  id: string;
  nome: string;
  cnpj: string;
  endereco?: EnderecoClinica;
  plano: PlanoClinica;
  configuracoes: ConfiguracoesClinica;
  ativo: boolean;
  criadoEm: Date;
}

export interface PlanoLimites {
  maxPacientes: number;
  maxUsuarios: number;
  funcionalidades: string[];
}

export const LIMITES_POR_PLANO: Record<PlanoClinica, PlanoLimites> = {
  [PlanoClinica.BASICO]: {
    maxPacientes: 500,
    maxUsuarios: 5,
    funcionalidades: ['agenda', 'pacientes', 'notificacoes_email'],
  },
  [PlanoClinica.PROFISSIONAL]: {
    maxPacientes: 5000,
    maxUsuarios: 30,
    funcionalidades: ['agenda', 'pacientes', 'prontuario', 'documentos', 'notificacoes', 'financeiro'],
  },
  [PlanoClinica.ENTERPRISE]: {
    maxPacientes: 100000,
    maxUsuarios: 500,
    funcionalidades: ['agenda', 'pacientes', 'prontuario', 'documentos', 'notificacoes', 'financeiro', 'telemedicina', 'analytics'],
  },
};
