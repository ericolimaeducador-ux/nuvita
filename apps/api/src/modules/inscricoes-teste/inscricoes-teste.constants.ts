export const INSCRICAO_TESTE_REPOSITORY = Symbol('INSCRICAO_TESTE_REPOSITORY');

/** Vagas do teste beta de 15 dias. Informativo: a decisão de quem entra é do SUPER_ADMIN. */
export const VAGAS_TESTE_BETA = 25;

/**
 * Versão do termo de teste exibido na landing. A landing envia a versão que a
 * pessoa viu; se divergir desta, a inscrição é recusada (evita aceite de um
 * texto antigo). Ao revisar o termo, suba esta string E a da landing.
 */
export const TERMO_TESTE_VERSAO_ATUAL = 'teste-beta-v1-2026-10';
