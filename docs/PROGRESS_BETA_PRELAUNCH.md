# PROGRESS — beta pre-launch

Checkpoint as of 2026-10-22. Lessons: `docs/licoes-aprendidas/2026-10-22-dialogs-deploy.md`.

## Done and in production

| PR | What |
|----|------|
| #36 | `useSaidaProtegida`: free-text dialogs close only via Save/Cancel (6 dialogs) + "Solicitar correção" confirmation |
| #37 | `deploy-web.yml` pinned to `firebase-tools@15.34.0` (403 on `serviceusage` with 15.34.1) |
| #38 | "Aplicar teste" dialog hoisted out of the collapsible `Secao`; `SolicitarCorrecaoDialog` protected |

All three smoke-tested in production on 2026-10-22.

## Pending

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
