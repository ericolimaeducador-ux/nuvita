export enum TipoAtendimento {
  CONSULTA = 'consulta',
  RETORNO = 'retorno',
  URGENCIA = 'urgencia',
  TELECONSULTA = 'teleconsulta',
}

export interface Subjetivo {
  queixaPrincipal: string;
  hda?: string;
}

export interface SinaisVitais {
  pressaoArterial?: string;
  frequenciaCardiaca?: number;
  frequenciaRespiratoria?: number;
  temperatura?: number;
  saturacaoO2?: number;
  peso?: number;
  altura?: number;
}

export interface Objetivo {
  exameFisico?: string;
  sinaisVitais?: SinaisVitais;
}

export interface Avaliacao {
  hipotesesDiagnosticas?: string[];
  cid10?: string[];
}

export interface Plano {
  conduta?: string;
  prescricao?: string;
  examesSolicitados?: string[];
}

export interface ArquivoProntuario {
  nome: string;
  url: string;
  tipo: string;
  tamanho: number;
}

export interface AssinaturaProntuario {
  medicoId: string;
  dataAssinatura: Date;
  hash: string;
}

export interface Prontuario {
  id: string;
  clinicaId: string;
  pacienteId: string;
  medicoId: string;
  agendamentoId?: string;
  dataAtendimento: Date;
  tipo: TipoAtendimento;
  subjetivo: Subjetivo;
  objetivo: Objetivo;
  avaliacao: Avaliacao;
  plano: Plano;
  arquivos: ArquivoProntuario[];
  assinado?: AssinaturaProntuario;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ProntuarioAddendum {
  id: string;
  prontuarioId: string;
  medicoId: string;
  texto: string;
  criadoEm: Date;
}

export interface Cid10 {
  id: string;
  codigo: string;
  descricao: string;
}
