// Razão social e CNPJ conferidos em base pública em 2026-10-04 (empresa ativa).
// Fonte única dos dados da empresa vendedora nos textos legais, rodapé e brand.
// Corrigir razão social, CNPJ, endereço, foro ou e-mail = editar UMA linha aqui.
export const EMPRESA = {
  razaoSocial: 'Dealer Empresas LTDA',
  cnpj: '10.917.735/0001-38',
  endereco: 'Rua das Flechas, 403, Vila Santa Catarina, São Paulo/SP, CEP 04364-030',
  foro: 'São Paulo/SP',
  // Contato geral, Encarregado de Proteção de Dados (DPO) e canal de direitos LGPD.
  email: 'contato@nuvita.app.br',
  // Contato comercial (rodapé da landing).
  emailComercial: 'comercial@nuvita.app.br',
  // Data exibida em "Última atualização" dos Termos e da Privacidade.
  // ATUALIZAR na data real de publicação.
  atualizacaoLegal: '04/10/2026',
} as const;

// Checkout online da landing (links mpago.li e Wallet Brick do Mercado Pago).
// PAUSADO (2026-10-05): links com valor divergente do site, recebedor no CNPJ antigo e
// token de producao recusado (403) pelo Mercado Pago. Em false, o card de preco mostra
// so o contato comercial por e-mail. Voltar a true apos corrigir links e credenciais.
export const CHECKOUT_ONLINE_ATIVO = false;
