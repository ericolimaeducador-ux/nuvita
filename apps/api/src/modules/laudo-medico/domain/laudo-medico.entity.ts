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

export interface LaudoMedico {
  id: string;
  clinicaId: string;
  pacienteId: string;
  medicoId: string;
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
