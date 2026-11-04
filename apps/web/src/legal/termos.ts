// Texto integral dos Termos de Uso do Nuvita Psi.
//
// O arquivo `termos-de-uso.md` ao lado é uma CÓPIA de `docs/legal/termos-de-uso.md`
// (fonte única), feita pelo script `apps/web/scripts/copy-legal.mjs` antes do
// build e do dev server. É gitignored — não editar aqui, editar em docs/legal/.
// Ver Fase 4 do TDD (my_docs/tdd-clinic-onboarding-and-auth-gates.md).
import termosDeUsoTexto from './termos-de-uso.md?raw';
import termoDeTesteTexto from './termo-de-teste.md?raw';

/**
 * Versão vigente, extraída do cabeçalho `**Versão:** X` do próprio texto — o
 * .md é a fonte da verdade. O prebuild (`copy-legal.mjs`) garante que esse
 * cabeçalho bate com `TERMOS_DE_USO_VERSAO_ATUAL` de `packages/shared/src/termos`
 * (usado pela API); se divergirem, o build do web falha.
 */
const versaoMatch = termosDeUsoTexto.match(/\*\*Versão:\*\*\s*(\S+)/);
const vigenciaMatch = termosDeUsoTexto.match(/\*\*Data de publica[çc][ãa]o[^:]*:\*\*\s*(.+)/);

export const TERMOS_DE_USO_VERSAO_ATUAL: string = versaoMatch?.[1] ?? '';
export const TERMOS_DE_USO_VIGENCIA: string = vigenciaMatch?.[1]?.trim() ?? '';

export { termosDeUsoTexto };

/**
 * Termo de Teste (teste beta): exigido no lugar dos Termos de Uso enquanto a clínica
 * do usuário estiver em fase de teste (`user.faseTeste`). Mesma mecânica: o .md em
 * docs/legal/termo-de-teste.md é a fonte; o copy-legal confere o cabeçalho de versão
 * contra TERMO_DE_TESTE_VERSAO_ATUAL de packages/shared/src/termos.
 */
export const TERMO_DE_TESTE_VERSAO_ATUAL: string =
  termoDeTesteTexto.match(/\*\*Versão:\*\*\s*(\S+)/)?.[1] ?? '';
export const TERMO_DE_TESTE_VIGENCIA: string =
  termoDeTesteTexto.match(/\*\*Data de publica[çc][ãa]o[^:]*:\*\*\s*(.+)/)?.[1]?.trim() ?? '';
export { termoDeTesteTexto };

/** Espelha versaoTermosExigida() de packages/shared/src/termos (SINCRONIA MANUAL). */
export function versaoTermosExigida(faseTeste: boolean | undefined | null): string {
  return faseTeste ? TERMO_DE_TESTE_VERSAO_ATUAL : TERMOS_DE_USO_VERSAO_ATUAL;
}
