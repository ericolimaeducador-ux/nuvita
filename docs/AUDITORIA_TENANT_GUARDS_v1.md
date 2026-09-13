# AUDITORIA P0-4 — Multi-tenancy / guards HTTP (Nuvita)

| Campo | Valor |
|---|---|
| Auditoria | P0-4 — cobertura de multi-tenancy / guards |
| Plano | P0 Hardening v1 (assinado por Erico Henrique de Lima Araujo, 2026-09-12) |
| Data | 2026-09-12 |
| Repo | este (branch de entrega desta auditoria) |
| Escopo | `apps/api` — superfície HTTP NestJS |
| Método | Inventário estático de `*controller*.ts` + registro de providers; sem deploy |
| Correção de código | Nenhuma — **não** há GAP P0 óbvio do tipo “rota tenantizada sem auth/tenant” |

**Legenda da coluna Risco**

| Valor | Critério usado nesta auditoria |
|---|---|
| **OK** | Rota tenantizada com `JwtAuthGuard` + `TenantRequiredGuard` (e `RolesGuard` quando o controller declara papéis); **ou** rota pública/plataforma com credencial alternativa explícita no código (health, sessão, token de sala, super-admin). |
| **GAP** | Rota que lê/escreve dado de clínica **sem** `JwtAuthGuard`/`TenantRequiredGuard` **e sem** credencial alternativa documentada no próprio controller/serviço. |
| **REVISAR** | Decisão consciente, risco de fail-open futuro, ou camada incompleta (roles/módulos/`APP_GUARD`). Não é GAP P0 de tenant nesta leitura. |

Nenhum **GAP** foi classificado nas 113 rotas HTTP inventariadas.

---

## 1. Inventário de controllers

21 arquivos `*controller*.ts` em `apps/api`. Não há `*gateway*.ts`, GraphQL resolver nem outro `@Controller` fora desta lista. A API **não** usa `setGlobalPrefix` (`apps/api/src/main.ts`). Bootstrap de clínica **não** é rota HTTP: fica em `apps/api/src/cli/bootstrap-admin.command.ts` (protegido por `BOOTSTRAP_SECRET`).

| # | Controller | Path do arquivo | Prefixo `@Controller` |
|---|---|---|---|
| 1 | `HealthController` | `apps/api/src/modules/health/health.controller.ts` | `health` |
| 2 | `AuthController` | `apps/api/src/modules/auth/presentation/auth.controller.ts` | `auth` |
| 3 | `ClinicasController` | `apps/api/src/modules/clinicas/presentation/clinicas.controller.ts` | `clinicas` |
| 4 | `SuperAdminController` | `apps/api/src/modules/super-admin/super-admin.controller.ts` | `super-admin` |
| 5 | `PacientesController` | `apps/api/src/modules/pacientes/presentation/pacientes.controller.ts` | `pacientes` |
| 6 | `ObservacoesPacienteController` | `apps/api/src/modules/observacoes-paciente/presentation/observacoes-paciente.controller.ts` | `observacoes-paciente` |
| 7 | `ProntuariosController` | `apps/api/src/modules/prontuarios/presentation/prontuarios.controller.ts` | `prontuarios` |
| 8 | `DocumentosController` | `apps/api/src/modules/documentos/presentation/documentos.controller.ts` | `documentos` |
| 9 | `ChecklistDocumentosController` | `apps/api/src/modules/checklist-documentos/presentation/checklist-documentos.controller.ts` | `checklist-documentos` |
| 10 | `AgendamentosController` | `apps/api/src/modules/agendamentos/presentation/agendamentos.controller.ts` | `agendamentos` |
| 11 | `FinanceiroController` | `apps/api/src/modules/financeiro/presentation/financeiro.controller.ts` | `financeiro` |
| 12 | `PsicologiaFinanceiroController` | `apps/api/src/modules/financeiro/presentation/psicologia-financeiro.controller.ts` | `financeiro/psicologia` |
| 13 | `NotificacoesController` | `apps/api/src/modules/notificacoes/presentation/notificacoes.controller.ts` | `notificacoes` |
| 14 | `TelemedicinaController` | `apps/api/src/modules/telemedicina/presentation/telemedicina.controller.ts` | `telemedicina` |
| 15 | `TelemedicinaAcessoController` | `apps/api/src/modules/telemedicina/presentation/telemedicina-acesso.controller.ts` | `telemedicina/acesso` |
| 16 | `AnalyticsController` | `apps/api/src/modules/analytics/presentation/analytics.controller.ts` | `analytics` |
| 17 | `ProdutosController` | `apps/api/src/modules/produtos/presentation/produtos.controller.ts` | `produtos` |
| 18 | `AvaliacaoIUController` | `apps/api/src/modules/avaliacao-iu/presentation/avaliacao-iu.controller.ts` | `avaliacao-iu` |
| 19 | `FollowUpController` | `apps/api/src/modules/followup/presentation/followup.controller.ts` | `followup` |
| 20 | `LaudoMedicoController` | `apps/api/src/modules/laudo-medico/presentation/laudo-medico.controller.ts` | `laudo-medico` |
| 21 | `EntregasController` | `apps/api/src/modules/entregas/presentation/entregas.controller.ts` | `entregas` |

Superfície extra (não é controller Nest, mas é HTTP): `SwaggerModule.setup('docs', …)` em `apps/api/src/main.ts` (ligado fora de `production`, ou se `EXPOSE_DOCS=true`).

---

## 2. `APP_GUARD` global — **não registrado**

Busca em `apps/api/**/*.ts`: **zero** ocorrências de `APP_GUARD` e **zero** de `useGlobalGuards`.

- `apps/api/src/app.module.ts` — só `imports` de módulos; `providers` vazio.
- `apps/api/src/main.ts` — `ValidationPipe` global, `InvalidObjectIdFilter` global, Helmet, cookie-parser, CORS. Sem guards globais.

O padrão recomendado existe só como documentação, **não** como código:

```12:15:infra/multitenancy-integration.md
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: TenantRequiredGuard },
]
```

### Risco de não ter `APP_GUARD`

O modelo atual é **opt-in por controller** (`@UseGuards` no arquivo). Uma rota nova sem decorator fica **pública**. Isso é fail-open para o próximo módulo, não um furo nas rotas já listadas.

### Bloqueio para ligar `APP_GUARD` agora (por isso **não** foi corrigido nesta auditoria)

`JwtAuthGuard` (`apps/api/src/modules/auth/presentation/guards/jwt-auth.guard.ts`) autentica **sempre** que aplicado. Não existe decorator `@Public` / `IS_PUBLIC` / `AllowAnonymous` em `apps/api` (única `SetMetadata` de isenção é `AllowWithoutTenant`, e ela só é lida por `TenantRequiredGuard`).

Se `JwtAuthGuard` virasse `APP_GUARD` hoje, quebraria:

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`
- `GET /health`
- todas as rotas de `GET|POST /telemedicina/acesso/...`

Além disso, `POST /auth/refresh` e `TelemedicinaAcessoController` **não** têm `@AllowWithoutTenant()`. Se só o `TenantRequiredGuard` virasse global, essas rotas falhariam com `UnauthorizedException('Usuario autenticado ausente.')` (`apps/api/src/common/tenancy/tenant-required.guard.ts`).

---

## 3. Guards e equivalentes existentes

| Peça | Path | O que faz |
|---|---|---|
| `JwtAuthGuard` | `apps/api/src/modules/auth/presentation/guards/jwt-auth.guard.ts` | Passport JWT; sem skip. |
| `JwtStrategy` | `apps/api/src/modules/auth/presentation/guards/jwt.strategy.ts` | Bearer no header; `validate` → `AuthService.validateAccessPayload`. |
| `RolesGuard` | `apps/api/src/modules/auth/presentation/guards/roles.guard.ts` | Exige `@Roles`; `SUPER_ADMIN` passa sempre; sem `@Roles` → `true`. |
| `SuperAdminGuard` | `apps/api/src/modules/auth/presentation/guards/super-admin.guard.ts` | Só `Papel.SUPER_ADMIN`. |
| `AuthThrottlerGuard` | `apps/api/src/modules/auth/presentation/guards/auth-throttler.guard.ts` | Rate-limit por IP nas rotas `/auth`. |
| `TenantRequiredGuard` + `@AllowWithoutTenant` | `apps/api/src/common/tenancy/tenant-required.guard.ts` | Exige `request.user` + `clinicaId`; `SUPER_ADMIN` pode assumir tenant via header `x-clinica-id`; compara `params.clinicaId` com o token. |
| `TenantMiddleware` | `apps/api/src/common/tenancy/tenant.middleware.ts` | Aplicado em `*` por `TenancyModule` (`apps/api/src/common/tenancy/tenancy.module.ts`). Extrai subdomain e `clinicaId` do JWT **se** o token for válido. **Não autentica e não bloqueia.** |
| `resolveTenantClinicaId` | `apps/api/src/common/tenancy/resolve-clinica-id.ts` | Helper de serviço: query/body `clinicaId` só vale se igual ao do token. |
| `@Roles` | `apps/api/src/modules/auth/presentation/decorators/roles.decorator.ts` | Metadata `roles`. |

Não existe `PermissionsGuard` / `ModuloGuard`. `resolvePermissoes` em `packages/shared/src/auth/permissao.ts` alimenta o payload do usuário; o comentário nesse arquivo afirma que o backend usa `RolesGuard` como trava dura e o módulo é refinamento adicional — **não há guard de módulo nas rotas**.

---

## 4. Matriz rota → guards → risco

Guards de **classe** valem para todos os handlers do controller, salvo nota. `AllowWithoutTenant` só tem efeito se `TenantRequiredGuard` estiver na cadeia.

### 4.1 Superfície pública / sessão / plataforma

| Método | Rota | Guards efetivos | `@Roles` / isenção | Risco | Nota |
|---|---|---|---|---|---|
| GET | `/health` | nenhum | `@AllowWithoutTenant` (sem `TenantRequiredGuard` na cadeia — metadata inerte hoje) | **OK** | Probe Terminus + Mongo. Público intencional. |
| POST | `/auth/register` | `AuthThrottlerGuard` | `@AllowWithoutTenant`; `@Throttle` 5/min | **OK** | Sem JWT. Service recusa se `allowPublicRegistration` for false (`auth.service.ts`). Cria `PACIENTE` com `clinicaId: null`. |
| POST | `/auth/login` | `AuthThrottlerGuard` | `@AllowWithoutTenant`; `@Throttle` 10/min | **OK** | Sem JWT. |
| POST | `/auth/refresh` | `AuthThrottlerGuard` | **sem** `@AllowWithoutTenant` | **OK** | Credencial = cookie `REFRESH_TOKEN`. Sem JWT e sem tenant. **REVISAR** só se `TenantRequiredGuard` virar global. |
| POST | `/auth/logout` | `AuthThrottlerGuard` + `JwtAuthGuard` | — | **OK** | Autenticado; sem tenant (logout não é dado clínico). |
| GET | `/telemedicina/acesso/:token` | nenhum | — | **OK** | Token UUID é a credencial (`telemedicina-acesso.controller.ts` L8–12; `acessarPorToken` em `telemedicina.service.ts`). View sem PII (`toAcessoView`: `salaId`, papel, status, modalidade, datas). |
| POST | `/telemedicina/acesso/:token/entrar` | nenhum | — | **OK** | Mesmo modelo; devolve `salaId`, papel, ICE. |
| POST | `/telemedicina/acesso/:token/sinais` | nenhum | — | **OK** | Sinalização WebRTC opaca. |
| GET | `/telemedicina/acesso/:token/sinais` | nenhum | — | **OK** | Idem. |
| POST | `/telemedicina/acesso/:token/eventos` | nenhum | — | **OK** | Eventos da sala; encerrar só se o token for o do profissional. |
| GET | `/super-admin/clinicas` | `JwtAuthGuard`, `SuperAdminGuard` | `@AllowWithoutTenant` (classe) | **OK** | Plataforma; sem `TenantRequiredGuard` (cruzar clínicas é o propósito). |
| PATCH | `/super-admin/clinicas/:id` | idem | idem | **OK** | |
| GET | `/super-admin/usuarios` | idem | idem | **OK** | |
| GET | `/super-admin/usuarios/:id` | idem | idem | **OK** | |
| POST | `/super-admin/usuarios` | idem | idem | **OK** | |
| PATCH | `/super-admin/usuarios/:id` | idem | idem | **OK** | |
| POST | `/super-admin/usuarios/:id/reset-password` | idem | idem | **OK** | |
| POST | `/super-admin/usuarios/:id/reset-2fa` | idem | idem | **OK** | |

### 4.2 Rotas tenantizadas (padrão `JwtAuthGuard` + `TenantRequiredGuard`)

Salvo indicação, a classe declara `@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)`.

| Método | Rota | RolesGuard / `@Roles` | Risco | Nota |
|---|---|---|---|---|
| POST | `/clinicas/:clinicaId/usuarios` | sim — `ADMIN` | **OK** | Guards no **método**, não na classe (`clinicas.controller.ts`). `TenantRequiredGuard` compara `params.clinicaId` com o token. |
| POST | `/pacientes` | `SECRETARIA`, profissionais, `ADMIN` | **OK** | |
| GET | `/pacientes` | idem | **OK** | |
| GET | `/pacientes/representantes` | idem | **OK** | Declarado **antes** de `:id`. |
| GET | `/pacientes/:id` | idem | **OK** | |
| GET | `/pacientes/:id/export` | `SECRETARIA`, `MEDICO`, `ADMIN` | **OK** | Dump LGPD — papéis mais estreitos. |
| PATCH | `/pacientes/:id` | `SECRETARIA`, profissionais, `ADMIN` | **OK** | |
| PATCH | `/pacientes/:id/observacoes` | idem | **OK** | |
| PATCH | `/pacientes/:id/fluxo/avancar` | idem | **OK** | Papel×etapa no service. |
| PATCH | `/pacientes/:id/desativar` | `SECRETARIA`, `ADMIN` | **OK** | |
| POST | `/observacoes-paciente` | `SECRETARIA`, profissionais, `ADMIN` (classe) | **OK** | |
| GET | `/observacoes-paciente` | idem | **OK** | |
| POST | `/prontuarios` | `PAPEIS_PROFISSIONAIS` (classe) | **OK** | `ADMIN` **não** está em `PAPEIS_PROFISSIONAIS` (`packages/shared/src/auth/papel.enum.ts`). `SUPER_ADMIN` passa no `RolesGuard`. |
| GET | `/prontuarios` | idem | **OK** | |
| GET | `/prontuarios/cid10/autocomplete` | idem | **OK** | |
| GET | `/prontuarios/:id` | idem | **OK** | |
| PATCH | `/prontuarios/:id` | idem | **OK** | |
| POST | `/prontuarios/:id/assinar` | idem | **OK** | |
| POST | `/prontuarios/:id/addendums` | idem | **OK** | |
| GET | `/prontuarios/:id/addendums` | idem | **OK** | |
| POST | `/documentos/presign-upload` | `SECRETARIA`, `MEDICO`, `ENFERMEIRO`, `ADMIN` (classe) | **OK** | |
| GET | `/documentos` | idem | **OK** | |
| POST | `/documentos/:id/confirmar-upload` | idem | **OK** | |
| GET | `/documentos/:id/access-url` | idem | **OK** | |
| PATCH | `/documentos/:id/excluir` | idem | **OK** | |
| POST | `/checklist-documentos` | `SECRETARIA`, `ADMIN` | **OK** | |
| GET | `/checklist-documentos` | profissionais + `ADMIN` + `SECRETARIA` | **OK** | |
| GET | `/checklist-documentos/resumo-pendentes` | idem leitura | **OK** | |
| POST | `/checklist-documentos/padrao` | `SECRETARIA`, `ADMIN` | **OK** | |
| PATCH | `/checklist-documentos/:id` | `SECRETARIA`, `ADMIN` | **OK** | |
| DELETE | `/checklist-documentos/:id` | `SECRETARIA`, `ADMIN` | **OK** | |
| POST | `/agendamentos` | `SECRETARIA`, profissionais, `ADMIN` | **OK** | |
| GET | `/agendamentos` | idem | **OK** | |
| GET | `/agendamentos/bloqueios` | profissionais, `ADMIN`, `SECRETARIA` | **OK** | |
| POST | `/agendamentos/bloqueios` | profissionais, `ADMIN` | **OK** | |
| DELETE | `/agendamentos/bloqueios/:id` | profissionais, `ADMIN` | **OK** | |
| GET | `/agendamentos/:id` | `SECRETARIA`, profissionais, `ADMIN` | **OK** | |
| PATCH | `/agendamentos/:id` | idem | **OK** | |
| PATCH | `/agendamentos/:id/cancelar` | `SECRETARIA`, `ADMIN`, `PACIENTE` | **OK** | |
| PATCH | `/agendamentos/:id/concluir` | `SECRETARIA`, profissionais, `ADMIN` | **OK** | |
| POST | `/financeiro/lancamentos` | `SECRETARIA`, `ADMIN` | **OK** | |
| GET | `/financeiro/lancamentos` | idem | **OK** | |
| GET | `/financeiro/dashboard` | idem | **OK** | |
| GET | `/financeiro/lancamentos/:id` | idem | **OK** | |
| PATCH | `/financeiro/lancamentos/:id/receber` | idem | **OK** | |
| PATCH | `/financeiro/lancamentos/:id/cancelar` | idem | **OK** | |
| GET | `/financeiro/psicologia/painel` | `PSICOLOGO`, `ADMIN` (classe) | **OK** | |
| POST | `/financeiro/psicologia/configuracao` | idem | **OK** | |
| POST | `/financeiro/psicologia/cobrancas` | idem | **OK** | |
| PATCH | `/financeiro/psicologia/cobrancas/:id/receber` | idem | **OK** | |
| PATCH | `/financeiro/psicologia/cobrancas/:id/cancelar` | idem | **OK** | |
| POST | `/notificacoes` | `SECRETARIA`, `ADMIN` | **OK** | |
| GET | `/notificacoes/dashboard` | idem | **OK** | |
| PATCH | `/notificacoes/preferencias/:pacienteId/opt-out` | `PACIENTE`, `SECRETARIA`, `ADMIN` | **OK** | |
| POST | `/telemedicina/salas` | profissionais, `ADMIN` | **OK** | |
| GET | `/telemedicina/salas` | idem | **OK** | |
| GET | `/telemedicina/salas/agendamento/:agendamentoId` | idem | **OK** | |
| GET | `/telemedicina/salas/:id` | profissionais, `PACIENTE`, `ADMIN` | **OK** | |
| POST | `/telemedicina/salas/:token/entrar` | profissionais, `PACIENTE` | **OK** | |
| GET | `/telemedicina/salas/:id/eventos` | profissionais, `ADMIN` | **OK** | |
| PATCH | `/telemedicina/salas/:id/encerrar` | profissionais, `ADMIN` | **OK** | |
| GET | `/analytics/pacientes` | **sem `RolesGuard`** | **OK** | Auth + tenant. Comentário no controller: RolesGuard removido de propósito; `PACIENTE` tem módulo `ANALYTICS` em `PERMISSOES_PADRAO_POR_PAPEL`. |
| GET | `/analytics/agendamentos` | sem roles | **OK** | idem |
| GET | `/analytics/financeiro` | sem roles | **OK** | Qualquer usuário autenticado **com `clinicaId`** vê o agregado financeiro da clínica. Alinhado ao comentário; **REVISAR** produto se PACIENTE não deveria ver caixa. |
| GET | `/analytics/notificacoes` | sem roles | **OK** | |
| GET | `/analytics/pacientes-por-cateter` | sem roles | **OK** | |
| GET | `/analytics/pacientes-por-representante` | sem roles | **OK** | |
| GET | `/analytics/entregas-no-mes` | sem roles | **OK** | |
| GET | `/analytics/sondas-no-mes` | sem roles | **OK** | |
| GET | `/analytics/aguardando-relatorio` | sem roles | **OK** | |
| GET | `/analytics/pacientes-por-etapa` | sem roles | **OK** | |
| GET | `/produtos` | **sem `RolesGuard`** | **OK** | Auth + tenant. Catálogo global (`produtos.service.ts`), não dado de outra clínica. |
| GET | `/produtos/:codigo` | sem roles | **OK** | idem |
| POST | `/avaliacao-iu` | mutação: profissionais + `ADMIN` | **OK** | |
| PATCH | `/avaliacao-iu/:id` | idem | **OK** | |
| PATCH | `/avaliacao-iu/:id/excluir` | idem | **OK** | |
| GET | `/avaliacao-iu/minhas` | só profissionais | **OK** | |
| GET | `/avaliacao-iu/count` | leitura: profissionais + `ADMIN` + `SECRETARIA` | **OK** | |
| GET | `/avaliacao-iu` | idem leitura | **OK** | |
| GET | `/avaliacao-iu/:id` | idem leitura | **OK** | |
| POST | `/followup` | mutação: profissionais + `ADMIN` | **OK** | |
| PATCH | `/followup/:id/excluir` | idem | **OK** | |
| GET | `/followup/resumo` | leitura pipeline | **OK** | |
| GET | `/followup` | idem | **OK** | |
| GET | `/followup/avaliacao/:avaliacaoIuId` | idem | **OK** | |
| GET | `/followup/:id` | idem | **OK** | |
| POST | `/laudo-medico` | mutação: profissionais + `ADMIN` | **OK** | |
| POST | `/laudo-medico/pre-preenchimento` | idem | **OK** | |
| GET | `/laudo-medico/pendentes-revisao` | `MEDICO`, `ADMIN` | **OK** | |
| GET | `/laudo-medico` | leitura pipeline | **OK** | |
| GET | `/laudo-medico/:id` | idem | **OK** | |
| PATCH | `/laudo-medico/:id` | mutação | **OK** | |
| PATCH | `/laudo-medico/:id/excluir` | mutação | **OK** | |
| POST | `/laudo-medico/:id/encaminhar` | mutação | **OK** | |
| POST | `/laudo-medico/:id/assinar` | `MEDICO`, `ADMIN` | **OK** | |
| POST | `/entregas` | profissionais + `ADMIN` + `SECRETARIA` (classe) | **OK** | Comentário no controller: GAP antigo (PACIENTE criava entrega) **já fechado**. |
| GET | `/entregas` | idem | **OK** | |
| GET | `/entregas/:id` | idem | **OK** | |
| POST | `/entregas/:id/confirmar` | idem | **OK** | |

**Contagem:** 21 controllers, **113** handlers HTTP. GAP = 0.

---

## 5. Achados (não são GAP P0 de rota tenantizada aberta)

### A1 — Fail-open sem `APP_GUARD` — **REVISAR** (risco sistêmico)

Qualquer controller futuro sem `@UseGuards` nasce público. `ClinicasController` já aplica guards só no método: um segundo handler no mesmo arquivo herdaria **zero** guards.

### A2 — `JwtAuthGuard` sem isenção pública — **REVISAR** (pré-requisito de hardening)

Ligar o snippet de `infra/multitenancy-integration.md` **quebra** login, health e telemedicina por token. Precisa de `@Public()` (ou equivalente) **antes** de `APP_GUARD`.

### A3 — `@AllowWithoutTenant` incompleto para um futuro guard global — **REVISAR**

Presente em: `POST /auth/register`, `POST /auth/login`, `GET /health`, classe `super-admin`.

Ausente em: `POST /auth/refresh`, 5 rotas de `/telemedicina/acesso/*`.

Hoje a metadata é inerte nesses pontos (não há `TenantRequiredGuard` na cadeia).

### A4 — `TenantMiddleware` não é enforcement — **OK** (contexto)

`consumer.apply(TenantMiddleware).forRoutes('*')` preenche `TenantContextService` a partir do JWT, mas **não** recusa anônimo. A trava é o `TenantRequiredGuard` nos controllers tenantizados.

### A5 — Sem guard de `Modulo` — **REVISAR** (autorização, não tenant)

Usuário com papel permitido e módulo revogado no super-admin ainda passa no `RolesGuard`. Isolamento de clínica continua intacto.

### A6 — `GET /analytics/financeiro` visível a qualquer papel com tenant — **REVISAR** (produto)

Auth + tenant: **OK**. Se PACIENTE autenticado com `clinicaId` da clínica não deve ver caixa, isso é regra de papel/módulo, não furo de tenant.

### A7 — Swagger `/docs` — **REVISAR** (staging)

`apps/api/src/main.ts`: docs sobem se `NODE_ENV !== 'production'` **ou** `EXPOSE_DOCS=true`. Sem auth no setup.

### A8 — Telemedicina por token sem throttle — **REVISAR** (abuso)

Modelo “UUID fora de banda = credencial” está documentado e a view pública não inclui nome/CPF. Não há `AuthThrottlerGuard` nesse controller. Enumeração de UUID v4 é cara; ainda assim vale rate-limit se a superfície crescer.

---

## 6. Recomendações (sem implementar nesta entrega)

1. **Manter** o opt-in atual até existir `@Public()` no `JwtAuthGuard` **e** `@AllowWithoutTenant()` em `refresh` + `telemedicina/acesso`. Só então registrar `APP_GUARD` na ordem JWT → Tenant (como em `infra/multitenancy-integration.md`).
2. **Checklist de PR** para todo `@Controller` novo: `JwtAuthGuard` + `TenantRequiredGuard` na classe, **ou** justificativa + `@AllowWithoutTenant` + `@Public`.
3. Preferir guards na **classe** (`ClinicasController` hoje é exceção).
4. Decidir se analytics financeiro deve ganhar `@Roles` (secretaria/admin) ou se o comentário do controller permanece a política.
5. Se `EXPOSE_DOCS` for usado em staging, proteger `/docs` (basic auth / IP allowlist) — fora do escopo desta matriz de tenant.
6. Teste de regressão sugerido (não escrito aqui): request sem Bearer em cada prefixo tenantizado → 401; JWT sem `clinicaId` (não SUPER_ADMIN) → 403; SUPER_ADMIN sem `x-clinica-id` → 403; `x-clinica-id` em MEDICO → 403 (`tenant-required.guard.spec.ts` já cobre parte do guard isolado).

---

## 7. Decisão de correção

Critério da tarefa: *“GAP P0 óbvio (rota tenantizada sem auth/tenant) → pode corrigir; se incerto, só documente.”*

**Nenhuma rota tenantizada está sem auth/tenant.** As únicas superfícies sem `JwtAuthGuard` têm credencial ou propósito explícitos no código (`/health`, `/auth/*` de sessão, `/telemedicina/acesso/*`). Ligar `APP_GUARD` sem `@Public` seria regressão, não hardening.

**Código de produção não foi alterado.** Este arquivo é o entregável.

---

## 8. Fontes lidas (paths reais)

- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `apps/api/src/common/tenancy/tenancy.module.ts`
- `apps/api/src/common/tenancy/tenant-required.guard.ts`
- `apps/api/src/common/tenancy/tenant-required.guard.spec.ts`
- `apps/api/src/common/tenancy/tenant.middleware.ts`
- `apps/api/src/common/tenancy/tenant-context.service.ts`
- `apps/api/src/common/tenancy/resolve-clinica-id.ts`
- `apps/api/src/modules/auth/presentation/guards/jwt-auth.guard.ts`
- `apps/api/src/modules/auth/presentation/guards/jwt.strategy.ts`
- `apps/api/src/modules/auth/presentation/guards/roles.guard.ts`
- `apps/api/src/modules/auth/presentation/guards/super-admin.guard.ts`
- `apps/api/src/modules/auth/presentation/guards/auth-throttler.guard.ts`
- `apps/api/src/modules/auth/presentation/decorators/roles.decorator.ts`
- `apps/api/src/modules/auth/presentation/auth.controller.ts`
- `apps/api/src/modules/auth/application/auth.service.ts` (register)
- `apps/api/src/modules/auth/auth.module.ts`
- 21 controllers listados na §1
- `apps/api/src/modules/telemedicina/application/telemedicina.service.ts` (`acessarPorToken` / `toAcessoView`)
- `apps/api/src/modules/produtos/application/produtos.service.ts`
- `apps/api/src/cli/bootstrap-admin.command.ts`
- `packages/shared/src/auth/papel.enum.ts`
- `packages/shared/src/auth/permissao.ts`
- `infra/multitenancy-integration.md`
