# PROGRESS — beta pre-launch

Checkpoint as of 2026-10-22. Lessons: `docs/licoes-aprendidas/2026-10-22-dialogs-deploy.md`.

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

## Backlog / known issues

- `graphify portable-check` reports failed with 517 hits, all inside `manifest.json`, which is gitignored and
  never committed. The check scope includes untracked files; it therefore fails permanently and is not
  actionable as a gate. Rescope to tracked files only. Not fixed as of 2026-10-22.
- firebase-tools: the claim that 15.34.1 introduced the `serviceusage` requirement is INFERRED, not
  confirmed (see the lessons-learned doc).

## Documentation language policy

- Engineering docs (lessons learned, PROGRESS, ADRs): English, per `enforces-english`.
- End-user documentation (psychologist manual, onboarding, in-product copy): Brazilian Portuguese.
  `enforces-english` does NOT apply to user-facing material.
