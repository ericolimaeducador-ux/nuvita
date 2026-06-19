export enum StatusProcesso {
  EM_PREPARACAO = 'em_preparacao',
  PROTOCOLADO = 'protocolado',
  EM_ANDAMENTO = 'em_andamento',
  GANHO = 'ganho',
  PERDIDO = 'perdido',
  ARQUIVADO = 'arquivado',
}

export interface DocumentoProcesso {
  nome: string;
  url: string;
  tipo: string;
  adicionadoEm: Date;
}

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
  dataProtocolo?: Date;
  dataDecisao?: Date;
  observacoes?: string;
  documentos: DocumentoProcesso[];
  criadoEm: Date;
  atualizadoEm: Date;
}
