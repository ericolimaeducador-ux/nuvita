import { TipoDocumentoFiscal } from '../../../../../../packages/shared/src/documentos';

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
  /** CPF (profissional pessoa física) ou CNPJ, normalizado: maiúsculas, sem pontuação. */
  documento: string;
  tipoDocumento: TipoDocumentoFiscal;
  endereco?: EnderecoClinica;
  plano: PlanoClinica;
  configuracoes: ConfiguracoesClinica;
  ativo: boolean;
  /**
   * Clínica do teste beta: seus usuários aceitam o Termo de Teste em vez dos Termos
   * de Uso. Desmarcar no lançamento faz todos aceitarem os Termos de Uso no próximo acesso.
   */
  faseTeste: boolean;
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
