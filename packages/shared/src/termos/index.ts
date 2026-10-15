/**
 * Versão vigente dos Termos de Uso do Nuvita Psi. Fonte única, compartilhada por:
 * - o predicado do gate de aceite (feature-terms-of-service-acceptance)
 * - o endpoint POST /auth/aceitar-termos
 * - a tela de aceite no frontend (espelhada em apps/web — ver Fase 4 do TDD)
 *
 * Ao publicar uma nova versão do termo (docs/legal/termos-de-uso.md), suba
 * esta string: todo PSICOLOGO passa a ser obrigado a aceitar de novo no
 * próximo login (reaceite por versão).
 */
export const TERMOS_DE_USO_VERSAO_ATUAL = '2.0';

/** Data de vigência da versão atual (ISO date). Informativo. */
export const TERMOS_DE_USO_VIGENCIA = '2026-10-09';

/**
 * Versão vigente do Termo de Teste (teste beta). Fonte única para:
 * - a inscrição pública (POST /inscricoes-teste e a página /teste-psi/ do site Nuvita);
 * - o aceite dentro do sistema por usuários de clínicas em fase de teste
 *   (docs/legal/termo-de-teste.md, copiado para o web pelo copy-legal).
 * Ao mudar o texto do termo, suba esta string (e o TERMO_VERSAO da página).
 */
export const TERMO_DE_TESTE_VERSAO_ATUAL = 'teste-beta-v1-2026-10';

/**
 * Qual termo o usuário precisa ter aceito para usar o sistema: o Termo de Teste
 * enquanto a clínica dele estiver em fase de teste; os Termos de Uso depois.
 * Sair da fase de teste muda a versão exigida e dispara o reaceite (agora dos
 * Termos de Uso) no próximo acesso — é o comportamento desejado no lançamento.
 */
export function versaoTermosExigida(faseTeste: boolean | undefined | null): string {
  return faseTeste ? TERMO_DE_TESTE_VERSAO_ATUAL : TERMOS_DE_USO_VERSAO_ATUAL;
}
