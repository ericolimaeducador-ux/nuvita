export enum OrigemEntrega {
  SUS = 'sus',
  PLANO_SAUDE = 'plano_saude',
  VAREJO = 'varejo',
  DOACAO = 'doacao',
}

export enum StatusEntrega {
  PENDENTE = 'pendente',
  ENVIADA = 'enviada',
  ENTREGUE = 'entregue',
  DEVOLVIDA = 'devolvida',
}

export interface ItemEntrega {
  codigo: number;
  descricao: string;
  quantidade: number;
  valorUnitarioCentavos: number;
  valorTotalCentavos: number;
}

export interface Entrega {
  id: string;
  clinicaId: string;
  pacienteId: string;
  processoJuridicoId?: string;
  avaliacaoIuId?: string;
  responsavelId: string;
  dataEntrega: Date;
  origem: OrigemEntrega;
  status: StatusEntrega;
  itens: ItemEntrega[];
  valorTotalCentavos: number;
  notaFiscal?: string;
  observacoes?: string;
  lancamentoFinanceiroId?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
