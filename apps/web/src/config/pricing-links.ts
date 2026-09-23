// Links de checkout/contato usados nos botões da landing. O Mercado Pago não permite
// um único link com preços diferentes por forma de pagamento; por isso cada plano tem
// dois links: à vista (Pix/débito) e parcelado (12x sem juros). Enquanto um valor
// estiver vazio, o botão correspondente fica desabilitado ("Em breve") — nunca
// gera um href quebrado.
export const PRICING_LINKS = {
  psicologia: {
    vista: 'https://mpago.li/24yEAFn',
    parcelado: 'https://mpago.li/16vQvDq',
  },
  estomoBasico: {
    vista: '', // TODO: Erico vai fornecer quando lançar Estomoterapia
    parcelado: '',
  },
  estomoPremium: {
    vista: '', // TODO: Erico vai fornecer quando lançar Estomoterapia
    parcelado: '',
  },
  whatsappVendas: '', // TODO: Erico vai fornecer o link do WhatsApp (Enterprise)
} as const;
