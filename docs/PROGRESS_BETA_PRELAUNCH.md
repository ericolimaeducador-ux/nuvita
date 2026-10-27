# PROGRESS — beta pre-launch

Checkpoint as of 2026-10-22. Lessons: `docs/licoes-aprendidas/2026-10-22-dialogs-deploy.md`.

## STATE AT END OF DAY 2026-10-23 (resume here)

Merged today and in production: #47 (D1 medical-record ownership), #48 (D2+D4 ownership in appointment/document/telemedicine + id validation + lint no longer decorative), #49 (password oracle closed, e-mail reset, mandatory password change), #50 (server is the source of the attendance declaration/certificate), #51 (DI hotfix that unblocked the #49 deploy), #52 (BUG-020 and BUG-022, medical record anchored to the appointment). #41 (survey) and #45 (secrets inventory) are also on main.

Item 1 of the queue is DONE: after the #52 merge the "Deploy API to Cloud Run" run was green, revision `nuvita-psi-api-00043-rkz` serves 100% of traffic, and the smoke (invented e-mail) passed: `/health` 200, login 401 "Credenciais invalidas.", esqueci-senha 201 identical message, `GET /prontuarios/resumo-acompanhamento` without token 401.

PENDING, in this order (next session):
1. **DONE 2026-10-24 (#54 merged; deploy green, revision `nuvita-psi-api-00044-xqn` at 100%, smoke OK).** **Front 3.3 — audit of user creation** (branch `feat/auditoria-criacao-usuario`, worktree `C:\Users\erico\nuvita-psi-audit33`, started from origin/main after #52). Findings so far:
   - Clinic-admin creation (`ClinicasService.createUsuario`) already audits `USER_CREATED_BY_ADMIN` (actor id/e-mail via `userId`/`email`, created user id/e-mail/role in metadata, `timestamp` is the "when"). Missing: top-level `clinicaId`, the actor's role, and the created user's CRP.
   - Super-admin creation (`SuperAdminService.createUsuario`, `POST /super-admin/usuarios`) has NO audit at all, so the screen sentence "Todas as ações são registradas no audit log" (`SuperAdminPage.tsx`) is false for it. Plan: new event `USER_CREATED_BY_SUPER_ADMIN`, optional `context` param on the service (audit only when present, so existing tests stay green), controller passes `@CurrentUser` + request ip/userAgent, via `clinicasService.registrarAuditoriaAdministrativa`.
   - CRP: neither creation DTO accepts a CRP (the psychologist fills it once later, `USER_CRP_SET`), so the audit records `createdUserCrp: user.crp ?? null`. Product question to confirm with Erico: should the admin forms accept a CRP at creation? (Not done: would be a behavior change.)
   - DONE in branch (draft PR, awaiting Erico's merge): RED spec `criacao-usuario.auditoria.spec.ts` (failed to compile, then GREEN); `USER_CREATED_BY_SUPER_ADMIN` audited with top-level `clinicaId`; clinic-admin event now carries `clinicaId` top-level, `criadorPapel`, `createdUserCrp` (null when not yet filled). `CreateAuditLogInput.clinicaId` added (repo falls back to `metadata.clinicaId`). The screen sentence was NOT left as "Todas as ações": role changes, activate/deactivate and clinic linking via `updateUsuario` are still NOT audited, so the sentence now lists only what is recorded. Open: audit those remaining actions, then the sentence can be broadened.
   - The `www.psi.nuvita.app.br` pre-beta item (below, in Pending) was added in this worktree's docs.
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
| Navigation rehearsal for the manual | Walk the app screen by screen, to feed the user manual |
| Recruiting 5 → 25 | Beta starts **2026-10-29** |
| G2 infra | Fixed IP for Atlas + rotate keys |
| LGPD draft — Captação | Terms/consent for the signup flow |
| Privacy page | Public page |
| Firebase CLI bump | Only after granting `roles/serviceusage.serviceUsageViewer` to `github-hosting-deployer@` |
| Select-only changes not "dirty" | Dialogs using react-hook-form with `setValue` on selects |
| AI decision enforced on the server (post-beta) | Today the decision is recorded when it exists and enforced only in the UI (Prescrição and Atendimento block regenerate/print while a suggestion is pending). Server enforcement needs a design for the psychologist who closes the browser mid-way: expiry of the pending state or implicit decision by abandonment. See the 2026-10-25 amendment in `feature-ai-usage-audit-trail.md` |
| `decisoes_uso_ia` without `clinicaId` in old docs (known, accepted) | New decisions store `clinicaId`; older ones (demo data only) do not, no backfill by decision of Erico 2026-10-25. The clinic is still derivable from the usage record |
| `www.psi.nuvita.app.br` (pre-beta, by Erico 2026-10-23) | DECIDED 2026-10-24: register it in Firebase Hosting. Erico executes; exact steps in the section "Runbook: www.psi.nuvita.app.br" below |
| Ask for the CRP at psychologist creation (post-beta) | Add a CRP field with format validation to the psychologist creation forms (clinic admin and super-admin). Deliberately NOT done now: the CRP is already required where it matters (#50 refuses certificate issuance without CRP, 422 on the server) and requiring it at creation adds friction while Erico creates the 8 accounts by hand. Until then the CRP audited at creation is `null` |
| `updateUsuario` audit (post-beta) | See BUG-023. When fixed, the sentence on the Super Admin screen can go back to being broad |

## Runbook: www.psi.nuvita.app.br (Erico executes)

Goal: `www.psi.nuvita.app.br` must land on `psi.nuvita.app.br` instead of erroring. We register it as a redirect to the existing domain (one canonical address). Firebase project `nuvita-499800`, Hosting site `nuvita-psi-web` (target `web` in `.firebaserc`).

1. Open https://console.firebase.google.com/ → project **nuvita-499800** → left menu **Build → Hosting** (or **Hosting** directly).
2. In the Hosting page, make sure the site selector at the top shows **nuvita-psi-web** (NOT `nuvita-psi-api`; that one serves `api-psi`).
3. In the "Domains" card click **Add custom domain**.
4. Type `www.psi.nuvita.app.br`. Open **Advanced / "Redirect to an existing website"** when offered and pick `psi.nuvita.app.br` as the destination. (If the redirect option does not appear, add it as a normal domain; it then serves the same site. Either way it works.) Click **Continue**.
5. The next screen lists the DNS records to add. Do NOT guess the values: copy them exactly from this screen. Expect:
   - a **TXT** record for ownership verification (host `www.psi` or `_acme-challenge...` / a value starting with `hosting-site=`), and
   - either two **A** records (Firebase's IPs, `199.36.158.100`-type) or a **CNAME** (`www.psi` → `nuvita-psi-web.web.app.`).
   The console shows which one applies to a subdomain.
6. At the DNS provider of `nuvita.app.br`, create exactly those records. The host field is usually the subdomain part only (`www.psi`), not the full name. If the provider proxies traffic (orange cloud), turn the proxy OFF for these records until Firebase finishes.
7. Back in the console click **Verify**. Status goes "Needs setup" → "Pending" → "Connected". The SSL certificate is issued automatically; it can take from minutes up to a few hours.
8. Check: open `https://www.psi.nuvita.app.br` in a private window; it must land on `https://psi.nuvita.app.br`. Also `curl -sI https://www.psi.nuvita.app.br` should show a 301 with `location: https://psi.nuvita.app.br/`.
9. Do NOT touch the existing `psi` and `api-psi` records. If anything in `psi` stops answering, remove only the new `www.psi` records and report.

Fallback (do in any case before 2026-10-29): make sure the welcome e-mail carries a clickable link, so nobody has to type the address.

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
