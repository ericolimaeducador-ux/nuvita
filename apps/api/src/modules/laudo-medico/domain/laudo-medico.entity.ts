export interface ProdutoSolicitado {
  codigo: number;
  descricao: string;
  quantidade: number;
  unidade: string;
  codigoSiafisico?: number;
}

export interface AssinaturaLaudo {
  medicoId: string;
  crmNumero?: string;
  dataAssinatura: Date;
  hash: string;
}

export enum StatusLaudoMedico {
  RASCUNHO = 'RASCUNHO',
  AGUARDANDO_REVISAO = 'AGUARDANDO_REVISAO',
  ASSINADO = 'ASSINADO',
}

export interface LaudoMedico {
  id: string;
  clinicaId: string;
  pacienteId: string;
  // Só preenchido no momento da assinatura (ver AssinaturaLaudo.medicoId) —
  // até lá o laudo é um rascunho sem médico responsável definido.
  medicoId?: string;
  criadoPorId: string;
  criadoPorNome?: string;
  criadoPorPapel: string;
  status: StatusLaudoMedico;
  avaliacaoIuId: string;
  dataLaudo: Date;
  cid10: string[];
  justificativaMedica: string;
  fundamentoLegal: string;
  produtosSolicitados: ProdutoSolicitado[];
  assinado?: AssinaturaLaudo;
  criadoEm: Date;
  atualizadoEm: Date;
}
