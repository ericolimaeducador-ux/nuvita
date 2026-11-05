# Auditoria de Segurança e Operação — Nuvita Psi

**Data:** 2026-08-08 · **Commit auditado:** `532d4fe` · **Escopo:** `apps/api`, `apps/web`, `packages/shared`, infra e CI

Varredura completa do backend, frontend, configuração de segredos, CI/CD e
camada de persistência. Cada achado abaixo tem evidência verificada no código
— nada aqui é suposição de leitura rápida.

---

## Resumo executivo

| Severidade | Qtd | Bloqueia produção? |
|---|---|---|
| 🔴 Crítico | 4 | **Sim** |
| 🟠 Médio | 6 | Não, mas corrigir antes de escalar |
| 🟢 Verificado OK | 8 | — |

**Veredito:** o núcleo de segurança da aplicação é sólido (criptografia,
autenticação, autorização, validação de entrada). Os bloqueios de produção
são de **infraestrutura e operação**, não de lógica de aplicação.

---

## Estado da remediação — 2026-08-08

Os achados que dependiam **só de código** foram corrigidos na mesma data desta
auditoria. O que resta depende de execução na nuvem ou de trabalho de escopo
próprio. Passo a passo e verificação: `infra/PRODUCTION-BACKEND.md`.

| # | Estado | Onde |
|---|---|---|
| C1 | ⏳ Pendente — depende de acesso ao repo/GCP | guia §1 |
| C2 | ✅ Corrigido | `common/http/global-throttler.guard.ts` + `app.module.ts` |
| C3 | 🟡 Parcial — crítica eliminada (33 → 28, 1 crítica → 0) | guia §9 |
| C4 | ✅ Corrigido (health check); HA ainda pendente | `modules/health/redis.health.ts` |
| M1 | ✅ Corrigido | `common/security/config-validation.ts` |
| M2 | ⏳ Precisa de medição no 1º deploy | guia §7 |
| M3 | ✅ Corrigido | `app.module.ts` (`autoIndex`) |
| M4 | ✅ Corrigido | `main.ts` + `AuthModule.onApplicationShutdown` |
| M5 | ✅ Mantido por decisão; alerta especificado | guia §8 |
| M6 | ⏳ Pendente — rotação manual da chave | guia §2 |

Os 5 highs restantes de C3 estão todos presos na migração Nest 10 → 11
(`multer` via `@nestjs/platform-express`; `js-yaml` e `lodash` via
`@nestjs/swagger`) — trabalho próprio, fora de um ciclo de hardening.

---

## 🔴 Críticos

### C1. Deploy de produção nunca funcionou — secrets do CI ausentes

**Evidência:** `gh run list` mostra **100% de falha** em "Deploy Web to GitHub
Pages" e "Deploy API to Cloud Run", em todos os 7 runs desde 2026-08-07.
`gh secret list` no repo retorna **vazio**.

O workflow `.github/workflows/deploy-api.yml` exige `GCP_PROJECT_ID`,
`GCP_WIF_PROVIDER`, `GCP_SA_EMAIL`, `CLOUDRUN_ENV_YAML`; o
`deploy-pages.yml` exige `VITE_API_URL`. Nenhum existe.

**Impacto:** `psi.nuvita.app.br` provavelmente nunca serviu uma versão
funcional. Todo o produto existe só em dev local e no repositório.

**Correção:** seção 1 e 2 do `PRODUCTION-BACKEND.md`.

---

### C2. Sem rate limiting global — endpoints públicos totalmente expostos

**Evidência:** `ThrottlerModule.forRoot()` está registrado em
`app.module.ts:32`, mas **não há `APP_GUARD` global**. O throttling só se
aplica onde o guard é declarado explicitamente: `auth.controller.ts:30`
(`AuthThrottlerGuard`) e `ia-clinica.controller.ts:16` (`ThrottlerGuard`).

Todo o resto roda **sem limite** — incluindo
`telemedicina-acesso.controller.ts`, que é **público e sem autenticação**
(5 rotas: `GET :token`, `POST :token/entrar`, `POST/GET :token/sinais`,
`POST :token/eventos`).

**Impacto:** `GET /telemedicina/acesso/:token/sinais` é feito em *polling
contínuo* por design (sinalização WebRTC sem WebSocket). Sem limite, um
único cliente malicioso — ou um bug de retry no front — satura CPU e custo
de Cloud Run. As rotas de escrita (`/sinais`, `/eventos`) permitem inflar a
collection indefinidamente sem custo para o atacante.

**Atenuante:** os tokens são UUIDv4 (`telemedicina.service.ts:68-69`), com
122 bits de entropia — enumeração por força bruta é inviável, então o risco
é de **abuso de recurso**, não de acesso indevido a sala.

**Correção:** guard global + limite específico para as rotas públicas
(seção 6 do guia).

---

### C3. 33 vulnerabilidades de dependência (1 crítica, 9 altas)

**Evidência:** `npm audit --omit=dev` — cadeia transitiva do
`@google-cloud/*`: `gaxios`, `google-gax`, `teeny-request`,
`retry-request`, `uuid`.

Origem: `@google-cloud/secret-manager` e `@google-cloud/kms` (usados só
quando `CONFIG_SOURCE=gcp`, ou seja, **exatamente em produção**).

**Correção:** `npm audit fix`; o que exigir major bump, avaliar com
`npm audit fix --force` em branch separado + rodar a suíte. Fixar como
gate no CI (seção 9).

---

### C4. Redis é ponto único de falha da autenticação — e o health check não o vê

**Evidência:** `auth.service.ts:198` chama
`tokenRevocation.isRevoked(payload.jti)` na validação de **todo access
token**. `TokenRevocationService` (`token-revocation.service.ts`) **não tem
try/catch** — se o Redis cair, toda requisição autenticada lança exceção.

Ao mesmo tempo, `health.controller.ts` só faz
`mongoose.pingCheck('mongodb')` — **não verifica Redis**.

**Impacto:** com o Redis fora, a API fica 100% inutilizável para usuários
logados, mas o `/health` **continua respondendo 200**. O Cloud Run entende
a instância como saudável e mantém o tráfego nela — indisponibilidade total
sem failover nem alarme.

Nota: o comportamento fail-closed do `isRevoked` está **correto** do ponto
de vista de segurança (na dúvida, nega). O problema é o health check mentir
sobre isso.

**Correção:** incluir Redis no health check + Memorystore HA (seções 4 e 8).

---

## 🟠 Médios

### M1. Sem validação de força dos segredos em produção

`config.service.ts` carrega os segredos mas **não valida nada** — nem
tamanho mínimo, nem se ainda está com o placeholder. É possível subir em
produção com `JWT_ACCESS_SECRET=change-me-access-secret-min-32-chars`
(valor literal do `.env.example`) sem nenhum erro.

**Atenuante:** o `BOOTSTRAP_SECRET` — o mais perigoso — é usado **só em CLI**
(`bootstrap-admin.command.ts:126`), não em rota HTTP. Não há superfície de
rede para ele.

**Correção:** seção 3 do guia (fail-fast no boot).

---

### M2. Extração de IP pode colapsar o rate limit em produção

`client-ip.ts` usa deliberadamente a **última** entrada de
`X-Forwarded-For`, com o argumento (correto) de que a primeira é controlada
pelo cliente.

Porém, atrás de um **Application Load Balancer do GCP**, o formato é
`<ip-do-cliente>, <ip-da-forwarding-rule>` — a última entrada é o IP do
balanceador, **constante para todos os usuários**. Se for esse o caso, todo
o rate limiting de login passa a compartilhar um único bucket: ou trava
todo mundo, ou não trava ninguém.

Isso **depende da topologia real** (Cloud Run direto vs. atrás de LB) e não
dá para determinar sem medir. Não é um bug confirmado — é um risco que
precisa de verificação empírica.

**Correção:** validar logando o IP extraído no primeiro deploy (seção 7).

---

### M3. `autoIndex` do Mongoose ligado em produção

Não há configuração de `autoIndex` — o default do Mongoose é **`true`**,
inclusive em produção. Na subida, ele tenta construir todos os índices
declarados nos schemas.

**Impacto:** com as collections pequenas de hoje é inofensivo. Conforme
`pacientes`/`prontuarios` crescerem, a construção de índice na inicialização
pode estourar o timeout de startup do Cloud Run e derrubar o deploy.

---

### M4. Sem `enableShutdownHooks()` — shutdown não-gracioso

`main.ts` não chama `app.enableShutdownHooks()`. O Cloud Run envia SIGTERM
e aguarda ~10s antes do SIGKILL. Sem os hooks, requisições em voo são
cortadas e as conexões Mongo/Redis não fecham limpas — gera erro no cliente
a cada deploy/scale-down e conexões órfãas no Atlas.

---

### M5. Rate limiter de login é fail-open

`login-rate-limiter.service.ts:23` captura a falha do Redis e segue
(`fail-open`), com log de warning. É um tradeoff **deliberado e documentado**
(disponibilidade > proteção), mas significa que uma queda de Redis remove
silenciosamente a proteção contra força bruta de senha e TOTP.

**Correção:** alerta sobre esse log específico (seção 8) — não mudar o
comportamento sem decisão de produto.

---

### M6. Chave da Anthropic exposta em texto plano

A `ANTHROPIC_API_KEY` em uso foi compartilhada em conversa de chat. Está
corretamente fora do git (`apps/api/.env` é gitignored, verificado), mas
deve ser considerada comprometida.

**Correção:** rotacionar no console da Anthropic antes de ir a produção e
cadastrar a nova só no Secret Manager.

---

## 🟢 Verificado e correto

Itens auditados que **não** precisam de ação — registrados para não serem
reinvestigados:

1. **Criptografia de dados de paciente (LGPD)** — `paciente-crypto.service.ts`
   usa AES-256-GCM com IV aleatório de 12 bytes por registro e
   HMAC-SHA256 para hash determinístico de CPF (busca sem expor o dado).
   Implementação correta.
2. **Nenhum segredo no histórico do git** — `.env` nunca foi commitado;
   busca por `sk-ant-*`, `AKIA*`, chaves privadas e pelos segredos reais do
   `.env` local não retornou nada em nenhum commit.
3. **`.env.example` com placeholders** — nenhum valor real.
4. **Validação de entrada estrita** — `main.ts:22` usa `ValidationPipe` com
   `whitelist: true` + `forbidNonWhitelisted: true` + `transform: true`.
   Campo não declarado em DTO é rejeitado, não ignorado.
5. **Cobertura de guards** — todos os 17 controllers têm
   `JwtAuthGuard + TenantRequiredGuard`, exceto `health` e
   `telemedicina/acesso`, ambos públicos **por design**.
6. **Endpoint público não vaza PII** — `toAcessoView`
   (`telemedicina.service.ts:272`) retorna só `salaId`, `papel`, `status`,
   `modalidade`, `expiresAt`, `iniciadaEm`. Nenhum dado pessoal, como o
   comentário do controller afirma.
7. **Política de sessão e 2FA** — access token 15min, refresh 7 dias,
   revogação por `jti`, 2FA obrigatório para `SUPER_ADMIN`, `ADMIN` e
   `PSICOLOGO` (todos os papéis privilegiados). Senha mínima de 10 chars.
8. **Postura HTTP** — Helmet com CSP fora de dev, CORS por allowlist de
   origem, Swagger fechado em produção salvo `EXPOSE_DOCS=true` explícito,
   deploy por Workload Identity Federation (sem chave de service account
   de longa duração no CI).

---

## Ordem sugerida de correção

1. **C1** — sem isso nada vai ao ar.
2. **C4 + C2** — antes de qualquer usuário real tocar o sistema.
3. **C3, M1, M3, M4** — no mesmo ciclo de hardening.
4. **M2** — validar no primeiro deploy, com tráfego real.
5. **M5, M6** — operação contínua.

Passo a passo de execução: `infra/PRODUCTION-BACKEND.md`.
