# Lessons learned — 2026-10-22: protected dialogs and the web deploy failure

PRs: #36 (protected dialogs), #37 (pin firebase-tools), #38 (dialog hoist + "Solicitar correção").

## 1. Never run a CLI with `@latest` in CI

- `deploy-web.yml` ran `npx --yes firebase-tools@latest deploy ...`.
- `firebase-tools` went from **15.34.0** (published 2026-10-14) to **15.34.1** (published
  2026-10-21 22:18Z). The #35 deploy (2026-10-21 18:22Z, green) resolved `@latest` to 15.34.0; the #36
  deploy (2026-10-22 15:03Z) resolved it to 15.34.1 and failed with:
  `HTTP Error: 403, Permission denied to get service [firebasehosting.googleapis.com]`
  (`serviceusage.googleapis.com`).
- The deploy service account `github-hosting-deployer@` (role `roles/firebasehosting.admin`) lacks
  `serviceusage.services.get`. The 15.34.1 → 403 link is inferred from publish dates (the logs do not
  print the CLI version); the green deploy after the pin is what confirms it.
- **Fix (#37):** pin `firebase-tools@15.34.0` (exact, no caret) in `.github/workflows/deploy-web.yml`.
- **Before bumping the version:** grant `roles/serviceusage.serviceUsageViewer` to the SA first.
  A comment in the workflow says the same.
- Rule: every tool executed in CI by `npx`/`curl | sh` gets an exact version.

## 2. Green CI is not a deployed change

- PR checks (API build/test, Web type-check/build, Web E2E) and **"Deploy Web to Firebase Hosting"** are
  separate gates. The latter only runs on `push` to `main`; the PR was green while the deploy failed.
- Confirm the deploy run is green **before** any production smoke test; otherwise the smoke test hits the
  old version.
- The duration shown by `gh run list` can be the run's `updatedAt`, not the job time: the failed run showed
  47m37s while the job took ~3 minutes. Read the job's `startedAt`/`completedAt`.
- The workflow also triggers on changes to `deploy-web.yml` itself (it is in `paths`) and has
  `workflow_dispatch` for manual runs.

## 3. `useSaidaProtegida` — opt-in protection for free-text dialogs

- File: `apps/web/src/lib/saida-protegida.ts`. Pattern originally from `RegistroSessaoDialog`.
- Click-outside and ESC never close the dialog. Cancel / the X with pending changes asks
  "Descartar alterações?". Discarding clears the draft. Saving closes normally.
- Usage: `const saida = useSaidaProtegida(sujo, aoFechar)`; then `onOpenChange={saida.onOpenChange}`,
  `<DialogContent {...saida.contentProps}>` and the Cancel button `onClick={saida.solicitarFechar}`.
  `sujo` is `formState.isDirty` (react-hook-form) or a check on the typed state.
- Do **not** use it on confirmation dialogs.
- Known limits: changing only a `<Select>` (no typing) is not "dirty" in react-hook-form dialogs; the
  confirmation is the native `window.confirm`. A styled in-app modal is a pre-launch item.
- Protected: Editar cadastro, Aplicar teste, Novo agendamento, Novo paciente, Novo usuário, Nova clínica,
  Solicitar correção. Left out on purpose: dialogs with only selects/short numeric fields and edit dialogs
  for data already saved on the server.

## 4. Collapsible `Secao`: dialogs go OUTSIDE the children

- `Secao` renders `{open && children}`. A `Dialog` inside the children is not mounted while the section is
  collapsed (`defaultOpen={false}`), so a header-bar button that only calls `setOpen(true)` shows nothing;
  collapsing the section with the dialog open unmounts it and loses the text.
- Rule: a dialog triggered from a `Secao` header button lives in the component's fragment, next to the
  `Secao`, never inside its children. Fixed in #38 ("Aplicar teste"). The other sections already complied
  (Documentos, Prontuários e atendimentos, Dados cadastrais).

## 5. Test method that worked

- RED first with the existing Playwright harness (`apps/web/e2e/harness/`, `*.pw.ts`, `web-e2e.yml`). Say
  which RED tests failed for behavior and which "pass for free" (regression guards).
- Read the code from `origin/main`, not from a stale checkout: the first diagnosis was made on an old
  feature branch and wrongly concluded there were no e2e tests.

## 6. Production state (2026-10-22)

#36, #37 and #38 are shipped and smoke-tested.
