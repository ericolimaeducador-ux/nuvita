# Smoke de produção — Nuvita

Bateria **não destrutiva** contra a API pública. Preferência absoluta por
leitura. Nenhum caso apaga, desativa ou altera paciente.

Assinado pelas regras do product owner **Erico Henrique de Lima Araujo /
Orquestrador 7Safe**.

## Como rodar

Na raiz do repositório (Node 18+, `fetch` nativo — sem `npm install` extra):

```bash
node scripts/smoke-prod/run.mjs
```

Atalho:

```bash
npm run smoke:prod
```

Alvo padrão: `https://api.nuvita.app.br`.

```bash
API_BASE=https://api.nuvita.app.br node scripts/smoke-prod/run.mjs
```

Bloco autenticado (opcional):

```bash
SMOKE_EMAIL='smoke-operador@sua-clinica.example' \
SMOKE_PASSWORD='…' \
SMOKE_TOTP_SECRET='…' \
node scripts/smoke-prod/run.mjs
```

Saída máquina:

```bash
node scripts/smoke-prod/run.mjs --json
```

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Uso |
|---|---|---|---|
| `API_BASE` | não | `https://api.nuvita.app.br` | Origem da API (sem barra no fim) |
| `SMOKE_TIMEOUT_MS` | não | `15000` | Timeout por request |
| `SMOKE_EMAIL` | não | — | Login autenticado. Sem isso, os casos auth saem `SKIP` |
| `SMOKE_PASSWORD` | não* | — | Senha do operador smoke (`*` se `SMOKE_EMAIL` estiver setado) |
| `SMOKE_TOTP` | não | — | Código TOTP de 6 dígitos (papéis com 2FA obrigatório) |
| `SMOKE_TOTP_SECRET` | não | — | Segredo base32; o runner gera o TOTP (RFC 6238) |
| `SMOKE_CLINICA_ID` | não | — | Header `x-clinica-id` — necessário se o usuário for `SUPER_ADMIN` (sem clínica no token) |

Não commite essas credenciais. Não use conta de paciente real como “smoke”.

## O que a bateria cobre

Rotas tiradas do código em `apps/api` (a API **não** tem prefixo `/api`):

| Caso | Rota real | Esperado |
|---|---|---|
| `health` | `GET /health` | `200`, `status=ok`, `info.mongodb.status=up` (`HealthController` + Terminus) |
| `docs-closed` | `GET /docs` e `GET /docs-json` | **não-200** (Swagger só sobe fora de `production` ou com `EXPOSE_DOCS=true` — `apps/api/src/main.ts`) |
| `login-invalid` | `POST /auth/login` | `401` com e-mail fake `smoke-invalid@example.com` |
| `tenant-no-token` | `GET /pacientes`, `GET /produtos` | `401` sem `Authorization` (`JwtAuthGuard` + `TenantRequiredGuard`) |
| `telemedicina-token-invalido` | `GET /telemedicina/acesso/:token` | `4xx` (`NotFoundException` — token de sala inválido) |
| `auth-login` | `POST /auth/login` | `200` + `accessToken` + `user` **se** `SMOKE_EMAIL`/`SMOKE_PASSWORD` |
| `auth-pacientes-list` | `GET /pacientes?limit=1` | `200` + `{ items }` — **só lista**, sem `GET /:id`, sem `PATCH`, sem desativar |
| `auth-clinica-context` | equivalente a “clínica atual” | ver abaixo |
| `auth-logout` | `POST /auth/logout` | encerra a sessão smoke |

### Por que não há `GET /clinicas/me`

`ClinicasController` (`apps/api/src/modules/clinicas/presentation/clinicas.controller.ts`)
expõe **apenas** `POST /clinicas/:clinicaId/usuarios` (escrita, ADMIN). Não existe
rota de leitura “minha clínica”.

O smoke autentica e então:

- lê `user.papel` / `user.clinicaId` do login (`toPublicUser`);
- se **não** for `SUPER_ADMIN`: `GET /produtos` — catálogo tenant-guarded, só leitura;
- se for `SUPER_ADMIN`: `GET /super-admin/clinicas` — lista de clínicas da plataforma.

## Regras de segurança (obrigatórias)

1. **Nunca** `DELETE`, `remove`, `desativar` ou `excluir` em pacientes (nem em
   prontuário, laudo, follow-up, documento). O runner **recusa** esses métodos/paths
   antes de disparar o HTTP.
2. **POST** só em `/auth/login` e `/auth/logout`. Qualquer outro POST aborta.
3. Qualquer escrita futura (se alguém estender o script) deve usar e-mail/nome
   claramente fake, prefixados com `smoke-` / `SMOKE_TEST_`, e ser limpável **sem**
   tocar paciente real. Esta v1 **não escreve** dado clínico.
4. O runner **não imprime PII** da lista de pacientes (só a contagem de `items`).
5. **Não** rotacionar segredos, **não** fazer deploy, **não** mudar env do Cloud Run.
6. Conta autenticada: preferir operador dedicado (`smoke-…`), nunca credencial de
   paciente assistido.

## Códigos de saída

| Código | Significado |
|---|---|
| `0` | Casos obrigatórios e opcionais executados passaram (skips ok) |
| `1` | Falhou caso **obrigatório** (`health`, `docs-closed`, `login-invalid`, `tenant-no-token`) |
| `2` | Obrigatórios ok; falhou caso **opcional** (auth / telemedicina) |

`SKIP` no bloco autenticado **não** falha a bateria — é o modo padrão sem credenciais.

## CI

**Não** está no `ci.yml` de propósito: a bateria fala com a rede de produção e
não pode vermelhar o PR por timeout/DNS/Cloud Run. Rode localmente ou num job
manual (`workflow_dispatch`) com `continue-on-error` se quiser histórico.

`POST /auth/login` tem throttle (10 req/min + limiter por IP no `AuthService`).
Não dispare a bateria em loop.

## Inventário anti-alucinação

Controllers HTTP reais usados aqui (auditoria P0-4, 21 controllers):

- `HealthController` → `health`
- `AuthController` → `auth`
- `PacientesController` → `pacientes` (`JwtAuthGuard`, `TenantRequiredGuard`, `RolesGuard`)
- `ProdutosController` → `produtos` (`JwtAuthGuard`, `TenantRequiredGuard`)
- `SuperAdminController` → `super-admin` (`JwtAuthGuard`, `SuperAdminGuard`)
- `TelemedicinaAcessoController` → `telemedicina/acesso` (público, token da sala)

Documentação da suíte: [`docs/SMOKE_PROD_v1.md`](../../docs/SMOKE_PROD_v1.md).
