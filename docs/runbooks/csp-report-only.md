# Runbook: walking the web app under Content-Security-Policy-Report-Only

Goal: collect real CSP violations from `psi.nuvita.app.br`, adjust the policy, and only
then switch from `Content-Security-Policy-Report-Only` to the blocking
`Content-Security-Policy`. The policy lives in `firebase.json` (site `web`, `headers`).

> **Limits of this mode.** There is no `report-uri` / `report-to` endpoint. Violations are
> visible **only in the browser DevTools console** of whoever is browsing, so this walk
> must be done by hand, screen by screen. `frame-ancestors` is ignored in report-only
> mode (browsers log that); `X-Frame-Options: DENY` covers iframes until the blocking
> policy ships.

## Preconditions

- The branch that adds the headers is deployed. `firebase.json` is in the `deploy-web.yml`
  `paths` filter (added together with these headers), so a push to `main` that touches it
  redeploys; `workflow_dispatch` also works.
- Verify the header is live:

  ```bash
  curl -sI https://psi.nuvita.app.br/ | grep -i -E "content-security-policy|x-frame|permissions-policy|nosniff|referrer"
  ```

  Expect `content-security-policy-report-only` (and **no** `content-security-policy`).

## How to collect violations

1. Open a Chromium browser in a clean profile (no extensions: extensions inject scripts and
   produce false violations) and open DevTools (`F12`).
2. Console tab, tick **Preserve log**. Filter on `Content Security Policy` (or
   `violates the following Content Security Policy directive`).
3. Network tab: tick **Disable cache** for the first pass, then do a second pass with cache.
4. For every screen below: hard reload, perform the listed action, and copy each message
   (directive, blocked URL, source file/line).
5. Record results in the table at the end of this file (screen, directive, blocked URL, verdict).

Repeat once logged in as each role: `SUPER_ADMIN`, `ADMIN`, `PSICOLOGO`, `SECRETARIA`.

## Screens to walk (routes from `apps/web/src/routes.tsx`)

| # | Route | What to do | Origins to watch |
|---|-------|------------|------------------|
| 1 | `/login` | Load, log in with 2FA | Google Fonts, API |
| 2 | `/aceitar-termos` | Load as a user with a pending terms gate | Fonts, API |
| 3 | `/definir-senha` (forced password change) | Load as a user with the flag set | API |
| 4 | `/dashboard` | Load, wait for all widgets | API, `data:` images/fonts |
| 5 | `/pacientes` | List, search, open the create dialog | API |
| 6 | `/pacientes/:id` | Open a patient, expand every section, open the identity-edit dialogs, **open a document** (`window.open` to a signed R2 URL) | API, R2 |
| 7 | `/agenda` | Month/week views, create and cancel an appointment | API |
| 8 | `/prontuarios` | List, open one | API |
| 9 | `/pacientes/:id/prontuario/:prontuarioId/imprimir` | Open the print view, press print preview | inline `<style>`, API |
| 10 | `/documentos` | List; **upload a document** (PDF and image) end to end; open one | **R2 `connect-src`** (the `fetch` PUT to the presigned URL), API |
| 11 | `/pacientes/:id/documentos/atestado`, `/laudo`, `/encaminhamento`, `/prescricao` | Fill, preview, print preview | inline `<style>` (the shared print frame) |
| 12 | `/notificacoes` | Load the dashboard and filters | API |
| 13 | `/telemedicina` | Create a room, copy the link | API |
| 14 | `/tele/:token` (patient side, **no login**) | Open the link in a second browser/profile; allow camera and microphone; run a short call in both directions; end the call | `media-src` / `blob:`, `Permissions-Policy` (camera, microphone), API long-polling, STUN (not governed by CSP, but confirm the call connects) |
| 15 | `/atendimento-psicologico` | Open a session record, save, sign | API |
| 16 | `/financeiro-psicologia` | Load, open a charge | API |
| 17 | `/clinica` | Load clinic settings | API |
| 18 | `/relatorios` | Open each report, change filters | API |
| 19 | `/super-admin` | Clinics, users, create user, reset password, reset 2FA (SUPER_ADMIN only) | API |

Also check, on any screen:

- **Fonts:** the page uses Inter / Plus Jakarta Sans from Google Fonts; confirm both
  `fonts.googleapis.com` (CSS) and `fonts.gstatic.com` (files) load without violations.
- **Inline script:** the SPA-fallback script in `index.html` is allowed by hash. If the
  script text ever changes, the hash in `firebase.json` must be recomputed
  (`sha256` of the exact script body, base64).
- **Session refresh:** stay logged in past the access-token lifetime to exercise the
  refresh call to the API.

## Adjusting the policy

For each distinct violation decide, in this order:

1. **Our own code or a known provider** (for example a missing `connect-src` host): add
   that exact origin to the relevant directive in `firebase.json`.
2. **Third-party / unknown origin**: investigate before allowing anything. Do not
   whitelist to make a message go away.
3. **Inline styles** (`'unsafe-inline'` in `style-src` today): keep for now; removing it
   needs a refactor of components that use `style=` and inline `<style>`. Track separately.
4. **Wildcards** (`https://*.r2.cloudflarestorage.com`): if production uses a fixed bucket
   host, narrow the wildcard to it.

Redeploy and repeat the walk until a full pass over every screen and role produces
**zero** violations.

## Switching to the blocking policy

1. Zero violations across a full walk, with all four roles.
2. In `firebase.json`, rename the header key `Content-Security-Policy-Report-Only` to
   `Content-Security-Policy` (same value). Keep `frame-ancestors 'none'`: it is enforced
   in the blocking version.
3. Deploy, then repeat the **critical flows** at least once: login with 2FA, upload a
   document, open a document, a telemedicine call on both sides.
4. Rollback plan: revert the header rename (one line in `firebase.json`) and redeploy.

## Observation procedure

After the deploy, walk every screen with the DevTools console open (login, dashboard, patients,
patient record, clinical notes, agenda, financial, telemedicine with camera, documents, reports,
super admin) and record each CSP violation in the results table below. Only switch to the
blocking CSP after **zero violations in one complete pass**.

Future evolution (out of scope for now): a `report-to` / `report-uri` collection endpoint, so
violations from real users are gathered without a manual walk.

## Results table (fill during the walk)

| Date | Role | Screen | Directive | Blocked URL / source | Verdict (allow / fix / ignore) |
|------|------|--------|-----------|----------------------|--------------------------------|
|      |      |        |           |                      |                                |
