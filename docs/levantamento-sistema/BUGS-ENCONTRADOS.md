# Bugs found during the full-system walkthrough

Engineering record (English, per `CLAUDE.md`). **Nothing is fixed in this branch.** Everything below was
observed on a LOCAL environment (web 127.0.0.1:5173, API :3000, Mongo :27018) with fictitious data, on 2026-10-22.
Severity: **blocks beta** / **gets in the way** / **cosmetic**. "Evidence" points to files under
`docs/levantamento-sistema/` (screenshots, `ensaio/resultados/*.json`) and to the scripts in `ensaio/`.

## Blocks beta

### BUG-001 — Seed/bootstrap scripts write to whatever `MONGODB_URI` is set, with no host guard
- **Found by:** reading the code (not run against anything).
- `scripts/bootstrap-direto.mjs` writes to whatever `MONGODB_URI` is set in the environment, silently falling back
  to `127.0.0.1:27017`. A shell with the production Atlas URI exported would seed demo data straight into
  production. No host guard. Same risk class applies to `scripts/seed-demo.mjs` and `scripts/seed-prontuarios.mjs`
  — audit all three (the last two talk to a hard-coded `http://localhost:3000`, so their blast radius is whatever
  Mongo that local API is pointed at; they also hard-code a `CLINICA_ID` and a `MEDICO` profile).
- **Fix:** blocking local-host guard, as in `scripts/seed-manual-psicologos.mjs`. NOT fixed in this branch.

### BUG-002 — The PACIENTE role reads clinic-wide analytics, including other patients' names
- **Repro:** log in as a user with `papel=PACIENTE`; open `/relatorios`, or call `GET /analytics/*` with that token.
- **Observed:** `/analytics/pacientes`, `/agendamentos` (per-doctor and per-day series), `/financeiro` (revenue and
  expenses by month and payment method), `/notificacoes`, `/cobrancas-psicologia`, `/pacientes-por-representante` and
  `/perda-seguimento` all return **200**. `/analytics/perda-seguimento` returns `pacienteNome`, `faltas`,
  `totalAgendamentos` of other patients. The web renders the full "Relatórios Gerenciais" page for that role.
- **Suspect:** `apps/api/src/modules/analytics` controllers have no `@Roles(...)` (the route scan found none);
  `packages/shared/src/auth/permissao.ts` gives `Modulo.ANALYTICS` to `Papel.PACIENTE` by default.
- **Evidence:** `ensaio/resultados/api-paciente.json`, `../screenshots/perfis/paciente/relatorios.png`.
- **Also:** the same endpoints are readable by SECRETARIA, ADMIN and PSICOLOGO (incl. clinic-wide financial series).

### BUG-003 — SECRETARIA and ADMIN can compose and print clinical documents by URL
- **Repro:** as SECRETARIA open `/pacientes/:id/documentos/atestado`, fill date/time, click "Gerar atestado".
- **Observed:** preview "ATESTADO DE COMPARECIMENTO … Atesto para os devidos fins que <paciente> compareceu a
  atendimento psicológico em <data>, às <hora>", clinic header (name + CNPJ), **signed with the secretary's name**,
  "Imprimir / Salvar PDF" enabled. The route is only gated by `Modulo.PACIENTES`; the menu hides the section but
  the route is open. Laudo/Encaminhamento/Prescrição and `/pacientes/:id/prontuario/:id/imprimir` also open (the
  latter renders an empty SOAP template with patient PII and the secretary's name on the signature line; the clinical
  content is correctly denied with 403 by the API). The attestation date/time is free text, never checked against
  the agenda, even for psychologists.
- **Suspect:** `apps/web/src/routes.tsx` (routes under `ProtectedRoute modulo=PACIENTES` without a `roles` gate).
- **Evidence:** `../screenshots/seguranca/02-secretaria-atestado-emitido.png`, `ensaio/resultados/17-secretaria-emite-atestado.json`.

## Gets in the way

### BUG-004 — `scripts/create-super-admin.mjs` has no local-only mode
- **Correction to the premise:** the script is **not** unguarded. It requires `MONGODB_URI`, `EXPECTED_DB_NAME` and
  `EXPECTED_DB_HOST` (no defaults) and aborts before any read/write if the real database/host differ from the
  expected ones. So it does not create a SUPER_ADMIN "in any `MONGODB_URI` of the environment" by accident.
- **Residual risk (same class as BUG-001, lower):** it is multi-environment by design, so it can create the
  highest-privilege account on any cluster when both guard variables are set to match (e.g. exported from the same
  polluted shell). No "local only" mode. It also defaults the account to a personal e-mail
  (`SUPER_ADMIN_EMAIL` default in the script) and prints the TOTP secret.
- **Not used in the walkthrough:** the local SUPER_ADMIN was created by `ensaio/contas-locais.mjs`, which has the
  blocking host guard. **Fix:** optional `--local-only`/default-deny for non-loopback hosts. NOT fixed here.

### BUG-005 — SUPER_ADMIN "Novo usuário" writes no audit event, while the UI says everything is audited
- **Repro:** Super Admin → Novo usuário (perfil Administrador) → Criar. Query `audit_logs` afterwards.
- **Observed:** no `USER_CREATED_*` event (only the admin-created path in `clinicas.service.ts` emits
  `USER_CREATED_BY_ADMIN`). The Super Admin screen states "Todas as ações são registradas no audit log". The
  admin-created path logs who/when/IP/clinic/created id+email+papel but **not the CRP**.
- **Evidence:** `../screenshots/cadastro/02-super-admin-apos-criar-admin.png`, `../screenshots/super-admin/02-usuarios.png`.

### BUG-006 — Provisional passwords are not forced to change (ADMIN created by SUPER_ADMIN, SECRETARIA)
- **Observed (DB):** `deveTrocarSenha=false` for both; only PSICOLOGO created by an ADMIN gets `true`. The
  "Acesso criado" dialog nevertheless says "A troca de senha é pedida no primeiro acesso" for the secretary.
- **Also:** the secretary dialog shows the red text "O segundo fator não será exibido de novo…" although the role has
  no 2FA, and the toast "Usuário criado com sucesso." appears twice.

### BUG-007 — Telemedicine link: reusable, stored in clear text, professional link equals patient link in power
- `/tele/:token`: UUIDv4 (`randomUUID`), TTL 4 h (`SALA_TTL_HORAS`), **reusable** (two `entrar` calls both 201),
  entered without login from a fresh browser context, 20 req/min rate limit works (12/30 got 429).
  Tokens are stored in clear text in `salas_telemedicina` and the full `/tele/<token>` link inside the
  `notificacoes` document queued at room creation. The professional token uses the same public route.
- A 429 is shown to the user as "Link de atendimento inválido."
- **Evidence:** `ensaio/resultados/07-telemedicina-token.json`, `07b-telemedicina-anonimo.json`.

### BUG-008 — Admin/secretary can read finance endpoints the menu hides
- `GET /financeiro/lancamentos` and `/financeiro/dashboard` → 200 for SECRETARIA and ADMIN; `/financeiro/psicologia/painel`
  → 200 for ADMIN. No web route uses `/financeiro/lancamentos`.

### BUG-009 — Admin sees "Prontuários" in the menu; the API denies it and the page says "Nenhum prontuário encontrado"
- `GET /prontuarios` → 403, toast "Acesso negado para este papel.", table "Nenhum prontuário encontrado" (false).
  Same on the patient sheet: SECRETARIA/ADMIN see "Prontuários e atendimentos 0" for a patient who has 1 record.

### BUG-010 — Notifications screen: counters contradict the list
- Cards Enviadas/Entregues/Pendentes/Falhas show 0 while "Envios recentes" lists 4 rows with status "falhou" and
  destination "—". DB had `pendente` and `falhou` notifications.

### BUG-011 — IA: decision not mandatory; `decisoes_uso_ia` has no `clinicaId`; missing key returns HTTP 500
- Pending suggestions can stay undecided; nothing in the code I read forces a decision before saving the session.
  `registros_uso_ia.clinicaId` is required+immutable, but the decision document stores only registro, user and
  decision. Without `ANTHROPIC_API_KEY` both endpoints answer 500 (message is friendly; status should be 503).
- Not verifiable locally: real generation, encryption round trip, fail-closed on DB failure.

### BUG-012 — "LGPD export" is incomplete and open to SECRETARIA
- JSON has only registration data (no records, tests, agenda, documents). Audited (`PATIENT_EXPORTED`).

### BUG-013 — No self-service password/2FA recovery; no message after a forced password change
- Login page has no "forgot password". After `/definir-senha` the session is revoked and the user lands on `/login`
  with no confirmation.

### BUG-014 — Agenda "ID do profissional responsável" is a free-text field
- The new-appointment dialog asks for an internal id typed by hand.

### BUG-015 — Duplicate patients accepted
- Two "Criança Exemplo Demonstração" (same name/birth date, no CPF) were created without warning.

### BUG-016 — Dashboard fires 403 calls for the PACIENTE role
- `/pacientes` and `/agendamentos` return 403 silently on load; cards show 0 while `/analytics/pacientes` says 2.

### BUG-017 — Upload failure surfaces a raw "Failed to fetch" (environment limitation, UX issue)
- With storage unreachable the toast is "Erro — Failed to fetch" and the dialog stays open.

### BUG-018 — The fixed TOTP secret removed by `fix/totp-script-sem-segredo-fixo` stays in git history
- `scripts/totp.mjs` had a hard-coded base32 TOTP secret as a fallback (a demo ADMIN's). The approved branch
  removes it from HEAD and requires `TOTP_SECRET` from the environment. **Removal from HEAD does not remove it
  from history.** If that secret was ever used by a real account, it must be **ROTATED** (regenerate the 2FA key for
  that user), not just deleted from the file.
- **Status: CLOSED (2026-10-22, by Erico), resolved without rotation.** There is no real patient or psychologist in production, so that secret never protected a real account.

### BUG-020 — Prontuário `dataAtendimento` is free and `agendamentoId` is optional (severity: HIGH)
- `CreateProntuarioDto.dataAtendimento` is any ISO date typed by the psychologist and `agendamentoId` is optional, so
  the primary clinical record can assert any date with no check against the agenda. Everything derived from it
  (psychotherapy report "in follow-up since X, N sessions", session counts) inherits that.
- Same class as the free-date attendance certificate (BUG-021), through another door. The report cannot be fixed
  without fixing the record: both go together.
- **Status: CLOSED by the BUG-020 front.** `agendamentoId` is now required on create; the server derives
  `dataAtendimento` from the SCHEDULED start of the appointment (the client date is ignored); the anchor is
  immutable on draft edits; cancelled / no-show appointments are refused (422); another psychologist's or another
  patient's appointment is refused (403/404). The report facts ("since X, N sessions") now come from
  `GET /prontuarios/resumo-acompanhamento`, computed on anchored sessions of the caller only. No migration: legacy
  records without `agendamentoId` stay as they are and are simply not counted.

### BUG-021 — Protection in the wrong layer: attendance rule enforced only in the browser (severity: HIGH)
- The rule "only with an attendance concluded in the agenda" for the attendance declaration and the clinical
  attendance certificate lived only in the web pages (date was a free `datetime-local` or composed client-side).
- **Status: CLOSED for these two documents by front 4.** The server (`documentos-emitidos`) now takes only ids,
  reads the agenda, refuses anything not concluded (422) or not owned (403/404), builds the text, and records each
  issuance (protocol, who, when, patient, appointment) with an audit event. The report and the record are BUG-020.

### BUG-022 — The same session could be recorded twice (severity: HIGH)
- Nothing stopped two records for the same appointment, so the session count (billing cycle, session numbering and
  the "N sessions" the psychotherapy report states to third parties) could be inflated by a double click or a retry.
- **Status: CLOSED by the BUG-020 front.** Creating a record for an appointment that already has one answers
  409; a non-unique index on (clinic, appointment) supports the check.

### BUG-023 — `updateUsuario` does not audit role change, account (de)activation or clinic link (severity: MEDIUM)
- `SuperAdminService.updateUsuario` records only the CRP correction (`USER_CRP_CORRECTED`). Changing a user's role,
  activating/deactivating an account and linking a user to a clinic leave no trace. Promoting a secretary to admin
  leaves no record.
- Same family as BUG-005, which #54 closed for user creation (`USER_CREATED_BY_SUPER_ADMIN`). Because of this gap the
  Super Admin screen no longer says "Todas as ações são registradas" and lists only what is recorded.
- **Fix (post-beta):** audit event(s) with actor, target, before/after of `papel`/`ativo`/`clinicaId`, top-level
  `clinicaId`. When done, the screen sentence can go back to being broad.

## Cosmetic
- CPF shown unformatted in Atendimento Psicológico and on the printed record; formatted elsewhere.
- Signature line "CRP CRP 00/00000" when the stored value already contains the prefix (test-data artifact; no normalisation).
- Silent redirect to `/dashboard` for forbidden and unknown routes (no "access denied" message).
- Confirmation dialogs use the native `window.confirm` (known; styled modal is a pre-launch item).

## Regression #36/#38 — result
All free-text dialogs tested (Novo paciente, Editar cadastro, Solicitar correção, Aplicar teste, Novo agendamento,
Registro de sessão): click-outside and ESC do **not** close; typed text is preserved; Cancel/Fechar with content asks
for confirmation. **No divergence.** "Aplicar teste" opens with the section collapsed.

## Not verified (see `00-MAPA-COMPLETO.md` §10)
File upload/download/delete, clinic logo, real e-mail/WhatsApp, real AI output, real camera/NAT/TURN, clinic
creation, ticket attend/refuse, payment receipt, password/2FA reset by super-admin, record addenda, agenda blocks,
isolation between two psychologists, responsive layouts.
