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
