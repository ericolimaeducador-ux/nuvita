# SMOKE_PROD v1 — bateria de produção (Nuvita)

| Campo | Valor |
|---|---|
| Versão | v1 |
| Data | 2026-09-13 |
| Repo | `ericolimaeducador-ux/nuvita` |
| Alvo padrão | `https://api.nuvita.app.br` |
| Runner | `scripts/smoke-prod/run.mjs` (`npm run smoke:prod`) |
| Como rodar | [`scripts/smoke-prod/README.md`](../scripts/smoke-prod/README.md) |
| Postura | **Não destrutiva.** Sem DELETE/remove em pacientes. Sem deploy, sem rotação de segredos, sem mudança de env Cloud Run. |

Product owner: **Erico Henrique de Lima Araujo / Orquestrador 7Safe**.

## Objetivo

Checar, em minutos e sem mutar dado clínico, se a API de produção está:

1. de pé e com MongoDB respondendo;
2. com Swagger fechado;
3. recusando login inválido;
4. recusando rota tenantizada sem JWT;
5. (opcional) autenticando um operador smoke e listando pacientes / contexto de clínica;
6. (opcional) recusando token público inválido de telemedicina.

Não substitui testes de unidade/e2e locais. Não aponta `MONGODB_URI` de produção
a partir de um script de seed. Não é job do CI padrão (rede externa).

## Superfície real (anti-alucinação)

A API Nest **não** usa `setGlobalPrefix`. Paths abaixo são os `@Controller` de
`apps/api/src/modules/**`. Inventário completo: `docs/AUDITORIA_TENANT_GUARDS_v1.md`.

| Caso | Módulo / arquivo | Método + path | Guard | Mutação |
|---|---|---|---|---|
| Health + Mongo | `health.controller.ts` | `GET /health` | `@AllowWithoutTenant` | nenhuma |
| Swagger fechado | `main.ts` (`SwaggerModule.setup('docs')` só se `!production \|\| EXPOSE_DOCS=true`) | `GET /docs`, `GET /docs-json` | n/a | nenhuma |
| Login inválido | `auth.controller.ts` + `auth.service.ts` | `POST /auth/login` | `@AllowWithoutTenant` + throttle | sessão nenhuma (401) |
| Tenant sem token | `pacientes.controller.ts`, `produtos.controller.ts` | `GET /pacientes`, `GET /produtos` | `JwtAuthGuard` (+ tenant) | nenhuma |
| Telemedicina token | `telemedicina-acesso.controller.ts` → `acessarPorToken` | `GET /telemedicina/acesso/:token` | token da sala (público) | nenhuma |
| Login smoke | idem login | `POST /auth/login` | 2FA se `exigeTwoFactor(papel)` | emite JWT |
| Lista pacientes | `pacientes.controller.ts` `list()` | `GET /pacientes?limit=1` | JWT + tenant + roles | **somente leitura** |
| Contexto clínica | **não existe `GET /clinicas/me`** | login `user` + `GET /produtos` **ou** `GET /super-admin/clinicas` | ver abaixo | somente leitura |
| Logout | `auth.controller.ts` | `POST /auth/logout` | `JwtAuthGuard` | revoga JWT da sessão smoke |

`ClinicasController` só tem `POST /clinicas/:clinicaId/usuarios` (cria usuário —
**fora** desta bateria). Equivalente de “clínica atual”:

- payload `user` do login (`id`, `papel`, `clinicaId`, `permissoes`);
- `GET /produtos` para papel de clínica (catálogo + `TenantRequiredGuard`);
- `GET /super-admin/clinicas` para `SUPER_ADMIN` (sem `clinicaId` no token;
  `TenantRequiredGuard` exigiria `x-clinica-id` nas rotas tenantizadas).

## Casos e critério de aceite

### Obrigatórios (exit 1 se falhar)

| ID | Aceite |
|---|---|
| `health` | HTTP 200, `body.status === "ok"`, `info.mongodb.status === "up"` (Terminus `MongooseHealthIndicator`) |
| `docs-closed` | `/docs` **e** `/docs-json` com status ≠ 200 (404 típico em prod) |
| `login-invalid` | HTTP 401 para `smoke-invalid@example.com` / `SMOKE_TEST_wrong_password` (corpo só `email`+`password` — `ValidationPipe` com `forbidNonWhitelisted`) |
| `tenant-no-token` | HTTP 401 em `GET /pacientes?limit=1` e `GET /produtos` sem `Authorization` |

### Opcionais (exit 2 se executados e falharem; SKIP não falha)

| ID | Aceite | Quando roda |
|---|---|---|
| `telemedicina-token-invalido` | HTTP 4xx para token `SMOKE_TEST_token_invalido` (`NotFoundException`: “Token de sala invalido.”) | sempre |
| `auth-login` | HTTP 200, `accessToken` string, `user.id` + `user.papel` | `SMOKE_EMAIL` + `SMOKE_PASSWORD` |
| `auth-pacientes-list` | HTTP 200 e `items` array; **não** chama `GET /pacientes/:id` nem `PATCH …/desativar` | após login |
| `auth-clinica-context` | login `user` coerente + GET de leitura tenant/plataforma | após login |
| `auth-logout` | HTTP 200 `{ ok: true }` | após login |

`SUPER_ADMIN` sem `SMOKE_CLINICA_ID`: lista de pacientes sai `SKIP` (403
“Selecione uma clinica” é o guard correto, não um furo).

Papéis com 2FA obrigatório (`SUPER_ADMIN`, `ADMIN`, `MEDICO`, `ENFERMEIRO`,
`PSICOLOGO` — `exigeTwoFactor`): informar `SMOKE_TOTP` ou `SMOKE_TOTP_SECRET`.

## O que esta v1 recusa fazer

- Qualquer `DELETE` / `PATCH …/desativar` / `…/excluir` / `remove`.
- `POST /pacientes`, seeds, bootstrap, `scripts/remove-advocacia.mjs`.
- `GET /pacientes/:id` e `GET /pacientes/:id/export` (dump LGPD).
- Rotação de `JWT_*`, `PATIENT_DATA_*`, secrets GCP.
- Deploy Cloud Run / mudança de `cloudrun.env.yaml`.
- Ligar a suíte no job obrigatório de `.github/workflows/ci.yml`.

O runner aborta **antes** do `fetch` se o path/método violar a allowlist
(`GET` + `POST /auth/login` + `POST /auth/logout`).

## Extensão futura (se precisar escrever)

Somente dados claramente fake:

- e-mail `smoke-…@…` ou prefixo `SMOKE_TEST_`;
- nomes com o mesmo prefixo;
- limpeza só desses registros, **nunca** `deleteMany` amplo em `pacientes`.

v1 não implementa essa escrita.

## Relação com outros docs

- Checklist de go-live (Swagger fechado, `/health`): `infra/PRODUCTION-CHECKLIST.md`
- Matriz de guards: `docs/AUDITORIA_TENANT_GUARDS_v1.md`
- Instruções operacionais: `scripts/smoke-prod/README.md`
