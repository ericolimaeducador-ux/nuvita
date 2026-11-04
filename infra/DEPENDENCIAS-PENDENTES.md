# Dependências pendentes

Vulnerabilidades conhecidas que **não** foram corrigidas durante a limpeza de
hardening (auditoria 2026-08-08) por exigirem tarefa dedicada com validação
completa. Registradas aqui para não se perderem.

## 1. `qs` — 3 CVEs abertas

| Advisory | Resumo | 1ª versão corrigida |
|----------|--------|---------------------|
| GHSA-q8mj-m7cp-5q26 | DoS remoto: `qs.stringify` quebra com `TypeError` em entradas null/undefined em arrays comma-format quando `encodeValuesOnly` está ativo | 6.15.2 |
| GHSA-x5fp-wj9c-mxmx | Bypass de array-limit via parsing de bracket-key com vírgula | 6.16.0 |
| GHSA-4mjr-xmp4-gh2g | DoS via `isBuffer` controlado pelo atacante | 6.16.0 |

**Fix real:** `qs@6.16.0` (cobre as três). Versões instaladas hoje: `qs@6.14.2`
(sob `@nestjs/platform-express` → `body-parser@1.20.4`) e `qs@6.15.2` (outra
árvore) — ambas vulneráveis às três.

**Por que não foi aplicado agora:** tentativa de forçar `"qs": "6.16.0"` no bloco
`overrides` do `package.json` raiz falhou. `npm install` (npm 11.12.1) **não
re-resolve contra o `package-lock.json` existente** mesmo com `overrides`
editado — reporta "up to date" e mantém a árvore. O lock (lockfileVersion 3)
**não registra `overrides` em `packages[""]`**, provável anomalia de geração por
uma versão de npm diferente; sem esse campo, o check de "in sync" do npm ignora
a mudança. Aplicar o override exige **regenerar o lockfile inteiro** (diff de
milhares de linhas), o que precisa de tarefa própria com validação completa de
build/teste — não cabe dentro da limpeza de hardening.

## 2. `react-router` / `react-router-dom` — 2 CVEs

| Advisory | Resumo | Aplica-se a este projeto? | 1ª versão corrigida |
|----------|--------|---------------------------|---------------------|
| GHSA-wrjc-x8rr-h8h6 | Open redirect via backslash em `<Link>` e `useNavigate` (bypass de CVE-2025-68470) | **Sim** — SPA Vite usa `<Link>`/`useNavigate` | 7.18.0 |
| GHSA-337j-9hxr-rhxg | Constructor injection via `deserializeErrors()` na hidratação SSR | **Não** — só afeta SSR, este projeto é SPA client-side | 7.18.0 |

**Fix real:** `react-router@7.18.0` / `react-router-dom@7.18.0`. Não há backport
para a linha 6.x (nem 6.30.6). É **major 6 → 7**, migração dedicada com teste
página por página.

Risco moderado conhecido e aceito até a migração: open redirect (GHSA-wrjc-x8rr-h8h6).

## 3. Recomendação

Tratar os dois itens **juntos**, numa única tarefa de "atualização de
dependências" separada do hardening, incluindo:

- Investigar a anomalia do lockfile (ausência de `overrides` em `packages[""]`,
  qual versão de npm gerou o lock atual) **antes** de tentar qualquer override
  futuro.
- Regenerar o `package-lock.json` de forma controlada.
- Validação completa de build + testes (API e web) após a mudança.
- Migração `react-router` 6 → 7 com verificação de rota por rota.
