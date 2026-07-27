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

// Derivada automaticamente do `tipo` do produto do catálogo no momento da
// entrega (ver EntregasService.create) — nunca aceita diretamente do cliente,
// para não deixar o cliente "mentir" a categoria usada nos relatórios.
export enum CategoriaInsumo {
  SONDA = 'sonda',
  COLETOR = 'coletor',
  // Item sem correspondência no catálogo de produtos (ou catálogo futuro
  // com categorias ainda não mapeadas).
  OUTRO = 'outro',
}

export interface ItemEntrega {
  codigo: number;
  descricao: string;
  quantidade: number;
  valorUnitarioCentavos: number;
  valorTotalCentavos: number;
  categoria?: CategoriaInsumo;
}

export interface Entrega {
  id: string;
  clinicaId: string;
  pacienteId: string;
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
