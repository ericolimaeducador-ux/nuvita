# Lessons learned — 2026-10-22: protected dialogs and the web deploy failure

PRs: #36 (protected dialogs), #37 (pin firebase-tools), #38 (dialog hoist + "Solicitar correção").

## 1. Never run a CLI with `@latest` in CI

Evidence levels are labeled in each bullet.

- `deploy-web.yml` ran `npx --yes firebase-tools@latest deploy ...`, so the CLI version floated.
- **OBSERVED:** the #36 deploy (run 39800844178, 2026-10-22 15:03Z) failed with
  `HTTP Error: 403, Permission denied to get service [firebasehosting.googleapis.com]` from
  `serviceusage.googleapis.com`. The error names the permission `serviceusage.services.get`. The deploy
  service account `github-hosting-deployer@` holds `roles/firebasehosting.admin` and does not hold that
  permission.
- **OBSERVED:** pinning `firebase-tools@15.34.0` in `.github/workflows/deploy-web.yml` (#37) restored
  successful deploys: the runs for `3cadd32` (#37) and `fdfeb98` (#38) both concluded `success`
  (`gh run list`, 2026-10-22).
- **INFERRED (publication dates only, NOT verified against the changelog):** that the new permission
  requirement was introduced in 15.34.1. Basis: npm shows 15.34.0 published 2026-10-14, 15.34.1 published
  2026-10-21 22:18Z; the green #35 deploy (2026-10-21 18:22Z) preceded 15.34.1 and the failing #36 deploy
  followed it. The workflow logs do not print the CLI version, so which version each run used is itself
  inferred. A green deploy after the pin is also consistent with other explanations.
- To upgrade this to CONFIRMED, check the firebase-tools 15.34.1 release notes / commit history for the
  added serviceusage call. Not done as of 2026-10-22.
- **Before bumping the version:** grant `roles/serviceusage.serviceUsageViewer` to the SA first. A
  comment in the workflow says the same.
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

- **OBSERVED by this session:** deploys of `3cadd32` (#37) and `fdfeb98` (#38) concluded `success`.
- **Attributed to Erico:** manual smoke test performed by Erico in production on 2026-10-22.
  Not verified by automated test and not verified by this session.
