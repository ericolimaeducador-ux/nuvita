# Guia "Primeiros 15 minutos": notes for whoever updates it

Source: `PRIMEIROS-15-MINUTOS.md` (PT-BR, end-user). PDF generator: `gerar-pdf.mjs`. Images and PDF live OUTSIDE the repo
(`nuvita-psi-guia-15min/`, sibling of the clone), same arrangement as the survey in `docs/levantamento-sistema/`.

## Known limitations (what was NOT verified when the guide was written, 2026-10-25)

- **Addendum (adendo):** the guide only says "corrections only by addendum" (text taken from the session dialog). The
  addendum flow was never run on screen: where the button is, what it asks for, how it shows. No step-by-step in the guide.
- **Prescrição de Cuidados:** mentioned only for the AI rule ("Gerar com IA" / "Gerar prescrição" blocked while a
  suggestion is pending). The screen was never opened on screen for the guide; the menu path to reach it is not described.
- **AI suggestion (step 9):** no screenshot of a generated suggestion. The local environment has no Anthropic key, and
  nobody has exercised real generation in production. The blocking rule is covered by unit tests only
  (`RegistroSessaoIaPendente.test.tsx`, `PrescricaoIaPendente.test.tsx`), not seen in a browser.
- **Password reset / lost 2FA (step 4):** described from the login screen text; neither flow was executed.
- **"Salvar rascunho":** described by its label; not run. Only "Salvar e assinar" was run end to end.
- **Address (step 0):** "digite sem www" depends on the Firebase Hosting `www.psi.nuvita.app.br` setup being done or not;
  revise the sentence when it is.
- **PDF layout:** generated and counted (9 pages) but not looked at page by page by the author.
- Screenshots come from a local environment with fictional data, taken on the `main` after #56. Any screen that changes
  afterwards needs a new capture; never reuse an old capture of a changed screen.

## Recreating the capture environment

See "Local environment" in `docs/PROGRESS_BETA_PRELAUNCH.md`. Start the web with `npm run dev`, never `vite` directly.
The API's secrets are throwaway and generated per start: if the API is restarted with NEW keys, patient data already in the
local Mongo (encrypted with the old keys) becomes unreadable. After a restart with new keys, drop the demo database and
re-run `scripts/seed-manual-psicologos.mjs`. To capture step 9, start the API with `ANTHROPIC_API_KEY` in its process
environment (never in a file in the repo).
