# PROGRESS — beta pre-launch

Checkpoint as of 2026-10-22. Lessons: `docs/licoes-aprendidas/2026-10-22-dialogs-deploy.md`.

## State at night of 2026-10-28 (Estado em 28/10 à noite) — resume here

**Summary (10 lines)**
1. Beta starts 2026-10-29 with 8 real psychologists (active CRP only). The production test of 28/10 was run and is closed.
2. In production: API revision `nuvita-psi-api-00059-4qm` serves 100% (includes #78, clinic CPF/CNPJ filled once at first use) and the web has #77 (bell only with the Notificações module).
3. Since the #78 merge (15:26Z) that revision logged 0 ERROR, 0 HTTP 5xx and 0 ETIMEDOUT (Redis). 4xx: 41x401, 44x403, 2x404, 1x400, 1x409 (the 409 is the overlapping-appointment test; the 400 is the CPF collision test).
4. The 44 403s are on GET `/pacientes`, `/agendamentos`, `/financeiro/psicologia/painel` and `/clinicas/minha`; not investigated (hypothesis: dashboard calls by a role or session without the clinical permission). Post-beta check.
5. Production test result: everything passed except what the interface cannot show (audit read screen, 409 on a second CPF attempt, 422 of the API); the audit was checked by Erico in Atlas.
6. The second cleanup of the test data was done MANUALLY by Erico in Atlas on 2026-10-28 (about 18:08 to 18:22); the script was not used. Record: `docs/seguranca/EXCECAO-LIMPEZA-CLINICA-TESTE.md` (#79), counts still blank.
7. Not deleted on purpose: `documentos` (15 rows and their files in R2), `audit_logs`, `inscricoes_teste`, the super-admin, the Gerenciadora.
8. Open PRs, all draft, none merged: #79 (exception record), #80 (guide), #81 (Atlas M0 risk, runbooks, cleanup script, this section), #82 (label "opcional" in Nova clínica). Erico merges on 2026-10-29.
9. Production database: Atlas M0 without backup (accepted risk), mitigated only by the manual copy.
10. Next gate: create the participants' accounts by `docs/runbooks/criar-contas-participantes.md`; the first participant account is created and used by Erico himself before any access is sent.

### In production
- API revision `nuvita-psi-api-00059-4qm` (100%); web with #77. A clinic can be created without CPF/CNPJ ("Documento pendente"); the psychologist fills it once; declaração and atestado need it.
- Not yet in production: #82 (label), docs PRs.

### With Erico
- Merge #79 to #82 (after CI) and, for #82, check Deploy Web green and `/login` 200.
- Fill the blanks of #79 (counts before/after, export sizes, orphans) and clean the remaining `documentos`: 15 rows and the R2 files.
- Confirm that the CRP pre-filled on the test psychologists is not a real person's (value not recorded here).
- Manual copy of `inscricoes_teste`, `users`, `clinicas` and the restore proof (runbook `copia-manual-atlas-m0.md`); answer the 512 MB question (usage of the M0 database).
- Create the accounts (runbook above); stop conditions in the runbook.

### With the lawyer
- Psychoanalysts: no professional council, so no verifiable registry; the beta is only for psychologists with an active CRP. Decision on admitting them later.
- LGPD: revocation of consent has no flow; retention of 5 years in the Termo versus 20 years in the code; `audit_logs` keeps e-mail and CRP in clear (section "Legal item" below); Captação terms and the privacy page (already pending).

### Post-beta debts and findings (no duplicates: each one lives in one place)
- Audit read screen for the super-admin; UX findings (draft leaves the Atend. Psicológico list, Agenda list does not refresh): sections of 2026-10-28 below.
- Added 2026-10-28 (observed or reported, not fixed): the CRP is typed freely when a user is created (format validation only with an official CFP source; see also the row "Ask for the CRP at psychologist creation"); the browser session is shared between tabs (a login in one tab changes the role in the others); the 409 and 422 of the clinic document have unit tests only (never seen in a browser); the 403s listed above.
- Atlas M0 without backup: "ACCEPTED RISK" section below.
- Post-beta idea (2026-10-29, discarded for now): a psychologist with administrator powers inside the clinic (create users, logo) so a clinic created without an admin does not depend on the super-admin. It would change roles and the authorization matrix, so it needs its own design and feature file. Today the super-admin covers it (see `docs/harness/features/feature-clinica-sem-admin.md`).

## STATE AT END OF DAY 2026-10-23 (history; the current state is the section "State at night of 2026-10-28" above)

Merged today and in production: #47 (D1 medical-record ownership), #48 (D2+D4 ownership in appointment/document/telemedicine + id validation + lint no longer decorative), #49 (password oracle closed, e-mail reset, mandatory password change), #50 (server is the source of the attendance declaration/certificate), #51 (DI hotfix that unblocked the #49 deploy), #52 (BUG-020 and BUG-022, medical record anchored to the appointment). #41 (survey) and #45 (secrets inventory) are also on main.

Item 1 of the queue is DONE: after the #52 merge the "Deploy API to Cloud Run" run was green, revision `nuvita-psi-api-00043-rkz` serves 100% of traffic, and the smoke (invented e-mail) passed: `/health` 200, login 401 "Credenciais invalidas.", esqueci-senha 201 identical message, `GET /prontuarios/resumo-acompanhamento` without token 401.

PENDING, in this order (next session):
1. **DONE 2026-10-24 (#54 merged; deploy green, revision `nuvita-psi-api-00044-xqn` at 100%, smoke OK).** **Front 3.3 — audit of user creation** (branch `feat/auditoria-criacao-usuario`, worktree `C:\Users\erico\nuvita-psi-audit33`, started from origin/main after #52). Findings so far:
   - Clinic-admin creation (`ClinicasService.createUsuario`) already audits `USER_CREATED_BY_ADMIN` (actor id/e-mail via `userId`/`email`, created user id/e-mail/role in metadata, `timestamp` is the "when"). Missing: top-level `clinicaId`, the actor's role, and the created user's CRP.
   - Super-admin creation (`SuperAdminService.createUsuario`, `POST /super-admin/usuarios`) has NO audit at all, so the screen sentence "Todas as ações são registradas no audit log" (`SuperAdminPage.tsx`) is false for it. Plan: new event `USER_CREATED_BY_SUPER_ADMIN`, optional `context` param on the service (audit only when present, so existing tests stay green), controller passes `@CurrentUser` + request ip/userAgent, via `clinicasService.registrarAuditoriaAdministrativa`.
   - CRP: neither creation DTO accepts a CRP (the psychologist fills it once later, `USER_CRP_SET`), so the audit records `createdUserCrp: user.crp ?? null`. Product question to confirm with Erico: should the admin forms accept a CRP at creation? (Not done: would be a behavior change.)
   - DONE in branch (draft PR, awaiting Erico's merge): RED spec `criacao-usuario.auditoria.spec.ts` (failed to compile, then GREEN); `USER_CREATED_BY_SUPER_ADMIN` audited with top-level `clinicaId`; clinic-admin event now carries `clinicaId` top-level, `criadorPapel`, `createdUserCrp` (null when not yet filled). `CreateAuditLogInput.clinicaId` added (repo falls back to `metadata.clinicaId`). The screen sentence was NOT left as "Todas as ações": role changes, activate/deactivate and clinic linking via `updateUsuario` are still NOT audited, so the sentence now lists only what is recorded. Open: audit those remaining actions, then the sentence can be broadened.
2. **IA front** — resolve the report contradiction (is the human decision mandatory or not, with evidence from the code) and verify/fix `clinicaId` in `decisoes_uso_ia`. STOP and report before changing any AI behavior.

AFTER BOTH, if time remains before 10-28: `PRIMEIROS-15-MINUTOS.md` in PT-BR, derived from the survey, with the corrected screens. It is the piece that goes to the 8 psychologists on 10-29 (two more sign-ups arrived on Friday).

RULES THAT STAY: one PR per front, RED before GREEN, full suite, portão with a verdict per line, PR in draft, Erico merges. After every merge touching the API: check the deploy run AND that the new revision receives traffic (green CI is not a live API). No manual `gcloud run deploy --env-vars-file`. Do not touch the `feature/inscricoes-teste-beta` worktree.

## Done and in production

| PR | What |
|----|------|
| #36 | `useSaidaProtegida`: free-text dialogs close only via Save/Cancel (6 dialogs) + "Solicitar correção" confirmation |
| #37 | `deploy-web.yml` pinned to `firebase-tools@15.34.0` (403 on `serviceusage` after the version floated to 15.34.1 — INFERRED, see lessons) |
| #38 | "Aplicar teste" dialog hoisted out of the collapsible `Secao`; `SolicitarCorrecaoDialog` protected |

Manual smoke test performed by Erico in production on 2026-10-22. Not verified by automated test and not
verified by this session. (Observed by this session: the deploy runs for #37 and #38 concluded `success`.)

## Pending

Source of every item below: Erico's instruction of 2026-10-22; not verified by this session (except the last
two rows, which come from this session's own work).

| Item | Notes |
|------|-------|
| Styled confirm modal | Replace the native `window.confirm` in `saida-protegida.ts` (pre-launch) |
| Recruiting | **8 real participants** for the beta that starts **2026-10-29**; 25 is the November target (updated 2026-10-27, by Erico) |
| G2 infra | Key rotation DONE by Erico, with the backup in the password manager. The fixed IP for Atlas is left for the hosting migration and is NOT a gate for the beta (updated 2026-10-27, by Erico) |
| LGPD draft — Captação | Terms/consent for the signup flow. Remains pending, with the lawyer (2026-10-27) |
| Privacy page | Public page. Remains pending, with the lawyer (2026-10-27) |
| Firebase CLI bump | Only after granting `roles/serviceusage.serviceUsageViewer` to `github-hosting-deployer@` |
| Select-only changes not "dirty" | Dialogs using react-hook-form with `setValue` on selects |
| AI decision enforced on the server (post-beta) | Today the decision is recorded when it exists and enforced only in the UI (Prescrição and Atendimento block regenerate/print while a suggestion is pending). Server enforcement needs a design for the psychologist who closes the browser mid-way: expiry of the pending state or implicit decision by abandonment. See the 2026-10-25 amendment in `feature-ai-usage-audit-trail.md` |
| `decisoes_uso_ia` without `clinicaId` in old docs (known, accepted) | New decisions store `clinicaId`; older ones (demo data only) do not, no backfill by decision of Erico 2026-10-25. The clinic is still derivable from the usage record |
| Address without www (decided 2026-10-28, by Erico) | `www.psi.nuvita.app.br` is NOT registered and will not be. The guide, the e-mail and the WhatsApp message give the address as `https://psi.nuvita.app.br`, without www, as a clickable link |
| Ask for the CRP at psychologist creation (post-beta) | Add a CRP field with format validation to the psychologist creation forms (clinic admin and super-admin). Deliberately NOT done now: the CRP is already required where it matters (#50 refuses certificate issuance without CRP, 422 on the server) and requiring it at creation adds friction while Erico creates the 8 accounts by hand. Until then the CRP audited at creation is `null` |
| `updateUsuario` audit (post-beta) | See BUG-023. When fixed, the sentence on the Super Admin screen can go back to being broad |

Superseded (2026-10-27): the "navigation rehearsal for the manual" item was replaced by the system survey (#41) and by the guide
(#57, #70); it is no longer a pre-2026-10-29 item.

## Backlog / known issues

- `graphify portable-check` reports failed with 517 hits, all inside `manifest.json`, which is gitignored and
  never committed. The check scope includes untracked files; it therefore fails permanently and is not
  actionable as a gate. Rescope to tracked files only. Not fixed as of 2026-10-22.
- firebase-tools: the claim that 15.34.1 introduced the `serviceusage` requirement is INFERRED, not
  confirmed (see the lessons-learned doc).
- `enforces-english` lives only as an untracked file inside the `feature/inscricoes-teste-beta` worktree.
  Rules that steer CC behaviour must be tracked in the repo so they apply across worktrees and pass review.
  Move it into the repo when that branch is next touched. (The language policy itself is now tracked in
  `CLAUDE.md`, section "Documentation language".)
- Graph semantic extraction (LLM descriptions over 46 docs and 6 images) deliberately NOT run on 2026-10-22.
  Versioned graph stays code-only: deterministic, reviewable diffs. Revisit only when there is an actual
  consumer for the semantic graph. Decision by Erico.

- Production values that look like placeholders (found 2026-10-25 while validating the env file; names only, never values):
  `EVOLUTION_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`. They are identical on revision 00045, so they are what is
  deployed today. WhatsApp (Evolution) and SMS (Twilio) probably do NOT operate in the beta. Do not promise either channel
  to the participants; the provisional password is handed over by hand (WhatsApp from Erico's own phone, not from the system).
  Confirm whether the system sends WhatsApp at all in production before 2026-10-29; if it should, the real values must
  replace these in `CLOUDRUN_ENV_YAML` and be redeployed.
- Production env file (`CLOUDRUN_ENV_YAML`) must be `NAME: "value"`, one per line, 42 lines, LF, no blank lines (see
  `infra/PRODUCTION-BACKEND.md` §2). A Cloud Run console export (`- name:` / `value:` list) crashes `gcloud run deploy
  --env-vars-file` (seen 2026-10-25, run 40200434429). `npm run check:cloudrun-env` does NOT catch a malformed shape, so a
  strict line-format check should be added to the script.
- **CRP format validation: PENDING, to be verified against an official CFP source.** The CRP is required to be non-empty only
  (account creation, `user.crp`, signing). The format of a council number must not be written from memory. Until verified,
  the system accepts any non-empty text as a CRP (it could stamp a number that is not a CRP).
- **CRP at signing (2026-10-26):** the server stamps `user.crp` into `assinado.crp` when a clinical record is signed and
  answers 422 without it. `registroProfissional` stays as registration data only (council number typed by the super-admin;
  never enters the clinical record). Accounts created before this change that have no `crp` must fill it (the session form
  has a one-time field) before the first signature; new psychologist accounts need the CRP at creation.

- **Signature hash and `formulario` (#62, 2026-10-27):** records signed before #62 have no `formulario`, and the signature hash
  payload now includes `formulario ?? null`. The local simulation of an old record did NOT test hash verification. If a
  signature-integrity check is ever added, it must handle records without that field (and, in general, hash the payload
  version that was in force at signing). Today only test records exist.
- **Seed on `main` is broken (2026-10-27):** `scripts/seed-manual-psicologos.mjs` still sends `crp` in the record body and no
  `agendamentoId`, so it fails creating the sample record. The fix is in #57 (not merged yet).
- **Not verified (2026-10-27):** the browser print dialog of the record print page was not opened when #62 was verified.
- **BUG-028 (agenda overlap, HIGH):** registered in `docs/levantamento-sistema/BUGS-ENCONTRADOS.md`; design pending.
## Local environment (screenshots and manual rehearsal)

- Start the web with `npm run dev` (in `apps/web`), NEVER `vite` directly. `predev` runs `copy:legal`, which copies
  `termos-de-uso.md` and `termo-de-teste.md` into `apps/web/src/legal/` (gitignored). Running `vite` directly skips it and
  the login screen breaks with `Failed to resolve import "./termos-de-uso.md?raw"`. This happened twice (2026-10-25).
- Mongo local: `docker compose up -d mongodb` (Docker Desktop must be running). The API needs its secrets in the process
  environment (never create `.env`).
- Demo data: `MONGODB_URI=mongodb://127.0.0.1:27017/nuvita-psi-manual node scripts/seed-manual-psicologos.mjs`
  (local-only host guard, idempotent; fixed on 2026-10-25 to send the `agendamentoId` required since #52).

- **Post-beta: e-mail sending leaves no log of the provider result (2026-10-27).** The password-reset e-mail worked in
  production (confirmed by Erico: it arrived), but the code logs neither the provider status nor an error of the send, and
  the request itself did not show in the Cloud Run request log search, so the outcome could not be checked from our side
  (only in the provider dashboard). Add a structured log of the send result (status, no address, no token).
- **Attendance in the future (2026-10-27):** the server now refuses to record, conclude or issue a certificate for an
  appointment that has not started, and a declaration before it ended (422); changing an appointment's start or end is
  audited (`APPOINTMENT_TIME_CHANGED`). See `docs/harness/features/feature-attendance-not-in-the-future.md`.

- **BUG-028 fixed (2026-10-27):** the server refuses overlapping appointments of the same professional (409) and `fim <= inicio`
  (400). See `docs/harness/features/feature-agenda-no-overlap.md`. **Post-beta, deliberately left out:** (1) agenda blocks
  (`bloqueios`) do not take part in the overlap check; (2) concurrency: two simultaneous requests can both pass the check
  before either is inserted (needs a per-professional lock or a different data model); (3) existing overlaps are not
  corrected; (4) no "encaixe" (squeeze-in) exists.

- **BEFORE SENDING THE ACCESSES (raised from post-beta, 2026-10-27, by Erico): Redis behaviour when unreachable.** Second
  `ioredis` `ETIMEDOUT` in 24h, both on a freshly deployed revision (00053-z2z at 19:57 and 00056-rbj at 21:22, about 1m45
  after creation), with no 5xx on either revision. Still to answer with evidence from the running service, not only from
  the code: does the first request of a new revision fail or hang while the connection is being made? What the code says
  (read 2026-10-27, no production touched):
  - Used by: login rate limiter, password-reset limiter, token revocation (sessions), the notification queue (BullMQ) and
    the health check.
  - **Login and reset fail OPEN:** both limiters catch the Redis error and let the request through (a warning is logged).
  - **Token revocation fails CLOSED, as a 500:** `TokenRevocationService.isRevoked` has no try/catch and runs on every
    authenticated request, so with Redis down every logged-in request ends as a generic 500 (not a 401); logout and
    refresh also fail (`revoke` has no catch). `/health` answers 503 on a 2 s PING timeout (infra doc, section 4).
  - **Connection:** `new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 2 })`. No `connectTimeout`,
    `retryStrategy`, `commandTimeout` or offline-queue setting, so ioredis defaults apply (10 s connect timeout,
    backoff capped at 2 s, offline queue on). The client is created in a provider factory and is NOT awaited: the API
    starts listening before Redis is connected, and Cloud Run's default startup probe only checks the port, so a new
    revision can get traffic first. Inferred, not observed: early requests may wait on the offline queue or fail.
  - Whether production uses the Memorystore described in `infra/PRODUCTION-BACKEND.md` section 8, and whether the liveness
    probe of section 4 is applied, is NOT in the code and was not checked.

- **Redis hardening (PR `fix/redis-indisponivel-503`, 2026-10-27; applies once merged and deployed):** token revocation still
  fails closed but answers 503 "Serviço temporariamente indisponível, tente novamente" (also logout and refresh);
  `connectTimeout` 5 s, `commandTimeout` 2 s, `retryStrategy` capped at 1 s and never giving up; `main.ts` waits for the Redis
  `ready` event (15 s) before `listen`, so a revision that cannot reach Redis fails to start instead of receiving traffic.
  Still NOT answered: the Redis provider (Erico informs), whether the section-4 liveness probe is applied, and what the first
  requests of a revision saw in the two ETIMEDOUT cases.

## Documentation language policy

- Engineering docs (lessons learned, PROGRESS, ADRs): English, per `enforces-english`.
- End-user documentation (psychologist manual, onboarding, in-product copy): Brazilian Portuguese.
  `enforces-english` does NOT apply to user-facing material.

## Decisions on parked branches (2026-10-22, by Erico) — do not reopen

| Branch | Decision | Reason |
|--------|----------|--------|
| `fix/totp-script-sem-segredo-fixo` | **Approved**, squash merge | Removes a hard-coded TOTP secret from `scripts/totp.mjs`; merges clean. The secret stays in git history (see BUG-018: rotate if it was ever real) |
| `fix/erro-explicito-queries` | **Approved with a condition**: rebase onto `main` and the web `vitest` suite must run in CI **in the same PR** | Replaces "empty list" with an explicit error when a query fails (Prontuários, Dashboard, Notificações...). A test that does not run in CI does not ship |
| `fix/totp-secret-cifrado` | **Not before the beta**; stays untouched (no merge, no rebase). Revisit at G2 or later | Needs a new required secret `TOTP_ENCRYPTION_KEY` in every environment; merging without it breaks API boot, and losing the key locks out 2FA for SUPER_ADMIN/ADMIN/PSICOLOGO. Runbook in that branch must be followed in order |
| `fix/deploy-web-observa-docs-legal` | **Discarded**; do not try to resolve the conflict | `main` already has both path triggers, and `deploy-web.yml` carries the `firebase-tools` pin (not worth the risk) |
| `fix/achados-capturas` | Nothing to do | Already contained in `main` (PR #11) |

## G2 decisions (2026-10-22, by Erico) — do not reopen

The backup of all secrets was made by Erico (the 4 category-A keys in their own entries, the rest in one note, in the owner's password manager). Inventory: `docs/seguranca/INVENTARIO-SEGREDOS.md`.

| Item | Decision | Reason |
|------|----------|--------|
| Key rotation | **Out of the beta scope** | Category A keys (patient data, AI usage, prontuário signature, CPF hash) make existing data unreadable or unverifiable if swapped; rotating them needs a migration plan |
| Fixed IP for Atlas | **Out of the beta scope**; revisit with the definitive hosting migration | `0.0.0.0/0` stays during the beta, mitigated by strong credentials and TLS |
| BUG-018 (fixed TOTP secret in git history) | **Closed, no rotation** | No real patient or psychologist exists in production, so the secret never protected a real account |

## Ownership-per-resource decisions (2026-10-23, by Erico) — do not reopen

| Item | Decision | Reason |
|------|----------|--------|
| D1 Prontuário and addendum | Only the authoring psychologist reads, lists addenda and adds addenda | A psychologist reading a colleague's record breaks professional secrecy |
| D2 Appointment, document, telemedicine | Psychologist operates only on own resources; admin and secretary stay clinic-wide | Matches the appointment list, which already filters by own `medicoId` |
| D3 Patient | **Product decision:** the patient belongs to the clinic, not to a psychologist | Registration data is administrative and the secretary needs it; clinical data is protected by D1 and D2. Not a technical limitation |
| D4 IDs in create payloads | Validate that `pacienteId`, `medicoId` and `agendamentoId` belong to the clinic | Cheap hardening; reads already filter by clinic |

## Post-beta debt: secrets and infrastructure

- Secret Manager and KMS are disabled in the GCP project; the code path `CONFIG_SOURCE=gcp` is unused in production.
- The active Cloud Run revision is the only readable source of the secret values (the `CLOUDRUN_ENV_YAML` GitHub secret is write-only).
- The `infra/` docs describe Secret Manager and KMS as the official setup, but production does not use them.

## ACCEPTED RISK, taken consciously: production database on Atlas M0 with no backup (2026-10-28, by Erico)
- The production database stays on the free Atlas tier (M0) during the beta. **M0 has no backup.** Reason: cost. Erico will reassess after the beta.
- Conditions: participants use fictitious cases only (the Termo de Teste); `inscricoes_teste`, `users` and `clinicas` are exported by hand, and the export is checked, BEFORE the second cleanup (see `docs/seguranca/EXCECAO-LIMPEZA-CLINICA-TESTE.md`).
- **Gate for real data:** a backup (Flex or M10), an encrypted external copy to R2 and a documented restore test. Until all three exist, no real patient data goes in.
- **Mitigation (NOT a substitute for a backup), by Erico, 2026-10-28:** a manual copy (Export Collection or `mongodump`) of `inscricoes_teste`, `users` and `clinicas`, kept in an encrypted folder OUTSIDE the repository. Routine: before the second cleanup, after the accounts are created, and once a week during the beta. **Never paste the connection URI in a chat or in a versioned command.** Pending, NOT done yet: import the copy into the local Mongo (port 27018) to prove it restores. Commands: `docs/runbooks/copia-manual-atlas-m0.md`.
- A manual export is not a backup: do NOT write "backup confirmed" anywhere while this risk stands.
- **Open question (Erico):** the M0 limit is 512 MB of storage. What is the current usage of the production database, and how fast does it grow with 8 participants? Answer from the Atlas dashboard; nothing was read by the agent.

## Documents belong to the patient (2026-10-23, by Erico) — do not reopen

**Product decision:** a document belongs to the patient, not to whoever uploaded it. Any clinic role (psychologist, admin, secretary) opens and lists documents of any patient of the clinic. Only deletion is limited to the uploader (for the psychologist).

Reason: the secretary scans referrals, exams and insurance cards that the psychologist must open during the session; denying access would make the secretary a bottleneck for every attachment. Consistent with the patient being a clinic resource (D3). Deletion is destructive, so authorship applies there. The listing therefore shows exactly what the user can open (no leak of names or types of files they cannot open).

## Post-beta debt: authentication (found in 3.2, 2026-10-23)

- **HIGH priority, right after the beta:** login has no per-account limit across IPs. The lockout is per (IP, account) pair and the `@Throttle` is per IP, so a distributed brute force against one account is not blocked. Accepted for the beta: the password oracle is closed (a guess no longer reveals whether the password was right), which makes distributed guessing much more expensive, and only 7 known users exist.
- `POST /auth/register` answers 409 "Email ja cadastrado.", which reveals registered e-mails. Does not apply today: public registration is disabled.
- There is no e-mail confirmation flow, so there is no account-existence distinction to check there. Does not apply today.

## Post-beta debt: transitional fields in the medical record (found in BUG-020, 2026-10-23)

- Remove the optional, ignored `dataAtendimento` from `CreateProntuarioDto` (and the service-side destructuring of `dataAtendimento`/`agendamentoId` in `updateDraft`), and make sure the web no longer sends them, once the API and the web run the same version in production. Today the API accepts and ignores them only so an old screen does not break between the API and web deploys (`forbidNonWhitelisted`). An accepted-and-ignored field that stays forever is silent debt.
- Note: `UpdateProntuarioDto` already omits both fields at the type level, and the current web does not send them on update; the web stopped sending `dataAtendimento` on create in this PR.

## Lesson: green CI is not a deployed API (2026-10-23)

PR #49 merged with green CI and the Cloud Run revision `nuvita-psi-api-00040-9nv` failed to start (`failed to start and listen on PORT=8080`); production stayed on the previous revision. Cause: a constructor parameter (`options: PasswordResetOptions = {}`) that Nest cannot inject. Unit tests build services with `new`, and **CI never boots the application**, so nothing exercised the dependency-injection graph.

Rules from now on:
1. Any NEW boot-required configuration (env var, secret) goes into `CLOUDRUN_ENV_YAML` in the SAME PR that introduces it; otherwise CI passes and the deploy breaks. Never fix a deploy with a manual `gcloud run deploy --env-vars-file` (it replaces every variable).
2. Every provider/controller constructor parameter must be injectable (class, `@Inject(token)` or `@Optional()`). `di-parametros-injetaveis.spec.ts` scans all modules and fails the build otherwise.
3. A change counts as deployed only when the new Cloud Run revision is serving traffic, not when CI is green. Check the "Deploy API to Cloud Run" run after every merge that touches the API.
4. Residual risk: the scan does not catch a provider missing from a module's context; only a real boot does. A boot smoke step in CI is a post-beta item.

## Post-beta debt: read screen for audit_logs for the super-admin (found in the production test, 2026-10-28)

- The web has no screen or route to read `audit_logs`; the Super Admin page only states that actions "are recorded in the audit log". During the 28/10 production test, creation of clinics/users, document filling, cancellation and signing could not be checked through the interface; the owner checked them directly in Atlas.
- Add a read-only audit screen for the super-admin (filters by clinic, user, action and period; fiscal document always masked, never in clear). Until then, audit checks in tests are manual (Atlas export/query), not part of the interface.

## Post-beta debt: UX findings from the production test (found 2026-10-28, recorded without fixing)

- A session saved as a draft disappears from the "Atend. Psicológico" list and can only be reopened from the patient record (patient page, medical record row). The list gives no way back to the draft.
- After creating an appointment, the Agenda list does not refresh by itself; the new row only shows after a manual reload.

## Legal item (for the lawyer): `audit_logs` keeps personal data in clear (found 2026-10-28)

- Checked by the owner in Atlas during the production test: `USER_CREATED_BY_SUPER_ADMIN` records the **e-mail and the CRP, in clear**, of the user that was created; the clinic document is masked (`CLINIC_FISCAL_DOCUMENT_FILLED`).
- `audit_logs` is append-only and is never removed by the cleanup scripts, so these personal data outlive the user and the clinic. Questions for the lawyer: lawful basis and retention period for these entries, and whether the e-mail and CRP must be masked or hashed in the audit metadata (a code change, post-beta, needs its own feature document).
- Cleanup tooling prepared (not executed): `docs/runbooks/segunda-limpeza-clinicas-teste.md` and `scripts/limpeza-clinicas-teste.mjs`.

## Post-beta debt: clinic fiscal document on first use (2026-10-28, by Erico)
- A clinic can be created without CPF/CNPJ; the psychologist fills it ONCE (`PATCH /clinicas/minha/documento`) and only the super-admin corrects it afterwards. Feature doc: `docs/harness/features/feature-clinic-fiscal-document-first-use.md`.
- The server refuses declaração and atestado without the document (422). Laudo, encaminhamento, prescrição and the prontuário print are blocked on the SCREEN only (`GateDocumentoConsultorio`): same class of debt as BUG-019 (the server does not refuse them).
- A clinic without a document stores a unique placeholder `SEM-DOCUMENTO-<id>` in `cnpj` (the unique index in production is not sparse). Clean fix, post-beta: partial unique index.
