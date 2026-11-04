/**
 * Copia o texto canônico dos Termos de Uso para dentro de apps/web/src, de
 * onde o bundle do web o importa (`src/legal/termos.ts`, via `?raw`).
 *
 * Roda como prebuild/predev/pretypecheck/prelint — antes de qualquer coisa que
 * compile o web. Fonte única: docs/legal/termos-de-uso.md. O destino é
 * gitignored.
 *
 * FALHA VISÍVEL (exit 1) se:
 *  - o arquivo fonte não existir;
 *  - a versão no cabeçalho do .md (`**Versão:** X`) não bater com
 *    TERMOS_DE_USO_VERSAO_ATUAL de packages/shared/src/termos (a que a API usa).
 * Nunca deixa o build "passar" sem o texto certo.
 */
import { existsSync, mkdirSync, copyFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const SHARED_TERMOS = resolve(repoRoot, 'packages/shared/src/termos/index.ts');

function fail(msg) {
  console.error(`\n[copy-legal] ERRO: ${msg}\n`);
  process.exit(1);
}

/**
 * Textos legais copiados para o web. Cada um tem o cabeçalho `**Versão:** X`, que
 * precisa bater com a constante de packages/shared/src/termos que a API usa.
 * - Termos de Uso: exigidos fora da fase de teste.
 * - Termo de Teste: exigido de usuários de clínica em fase de teste (teste beta).
 */
const TEXTOS = [
  { arquivo: 'termos-de-uso.md', constante: 'TERMOS_DE_USO_VERSAO_ATUAL' },
  { arquivo: 'termo-de-teste.md', constante: 'TERMO_DE_TESTE_VERSAO_ATUAL' },
];

const sharedTexto = existsSync(SHARED_TERMOS) ? readFileSync(SHARED_TERMOS, 'utf8') : '';

for (const { arquivo, constante } of TEXTOS) {
  const SRC = resolve(repoRoot, 'docs/legal', arquivo);
  const DEST = resolve(here, '../src/legal', arquivo);

  if (!existsSync(SRC)) {
    fail(
      `arquivo fonte não encontrado:\n  ${SRC}\n\n` +
        'O texto legal precisa estar no repositório antes do build/dev\n' +
        'do web (ver Fase 4 do TDD). Sem ele o app quebraria só em runtime.',
    );
  }

  const mdVersao = readFileSync(SRC, 'utf8').match(/\*\*Versão:\*\*\s*(\S+)/)?.[1];
  if (!mdVersao) {
    fail(`não achei o cabeçalho "**Versão:** X" em ${SRC}`);
  }

  const sharedVersao = sharedTexto.match(new RegExp(`${constante}\\s*=\\s*['"]([^'"]+)['"]`))?.[1];
  if (sharedTexto && sharedVersao !== mdVersao) {
    fail(
      `versão do texto legal divergente:\n` +
        `  docs/legal/${arquivo}  -> ${mdVersao}\n` +
        `  packages/shared/src/termos/index.ts (${constante})  -> ${sharedVersao}\n\n` +
        'Ao publicar uma nova versão, os dois precisam subir juntos.',
    );
  }

  mkdirSync(dirname(DEST), { recursive: true });
  copyFileSync(SRC, DEST);
  console.log(`[copy-legal] ${arquivo} (v${mdVersao}) copiado para src/legal/`);
}
