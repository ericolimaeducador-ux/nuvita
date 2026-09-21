/**
 * Catálogo de planos vendáveis pelo checkout. Os VALORES ficam no servidor: o
 * frontend só envia o identificador do plano, nunca o preço (evita adulteração).
 * Valores em reais, iguais aos anunciados na landing.
 */
export const PLANO_IDS = ['psicologia-vista', 'psicologia-parcelado'] as const;
export type PlanoId = (typeof PLANO_IDS)[number];

export interface PlanoPagamento {
  id: PlanoId;
  titulo: string;
  /** Valor total cobrado, em reais. */
  valor: number;
  /** Restrições de meio de pagamento enviadas na preferência. */
  meiosDePagamento: {
    excluidos: { id: string }[];
    parcelasMaximas?: number;
    parcelasPadrao?: number;
  };
}

export const PLANOS: Record<PlanoId, PlanoPagamento> = {
  // R$ 599,90 à vista no Pix ou débito: sem cartão de crédito nem boleto.
  'psicologia-vista': {
    id: 'psicologia-vista',
    titulo: 'Nuvita Psicologia — Plano Único (à vista)',
    valor: 599.9,
    meiosDePagamento: { excluidos: [{ id: 'credit_card' }, { id: 'ticket' }] },
  },
  // 12x de R$ 69,90 = R$ 838,80. Cartão de crédito em até 12 parcelas. O "sem juros" é
  // definido na conta do Mercado Pago do vendedor (a API não força isso).
  'psicologia-parcelado': {
    id: 'psicologia-parcelado',
    titulo: 'Nuvita Psicologia — Plano Único (12x)',
    valor: 838.8,
    meiosDePagamento: {
      excluidos: [{ id: 'ticket' }, { id: 'bank_transfer' }, { id: 'debit_card' }],
      parcelasMaximas: 12,
      parcelasPadrao: 12,
    },
  },
};
