export enum PapelSala {
  PROFISSIONAL = 'profissional',
  PACIENTE = 'paciente',
}

export enum TipoEventoSala {
  ENTROU = 'entrou',
  SAIU = 'saiu',
  DESCONECTOU = 'desconectou',
  RECONECTOU = 'reconectou',
  FALHA_CONEXAO = 'falha_conexao',
  MIDIA_NEGADA = 'midia_negada',
  ENCERRADA = 'encerrada',
}

/** Registro imutável da linha do tempo do atendimento (quem entrou/saiu/caiu e quando). */
export interface SalaEvento {
  id: string;
  clinicaId: string;
  salaId: string;
  papel: PapelSala;
  tipo: TipoEventoSala;
  detalhes?: string;
  ip?: string;
  userAgent?: string;
  criadoEm: Date;
}
