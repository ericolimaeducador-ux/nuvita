# Stage 1 — Roles: ENFERMEIRO replaces PSICOLOGO, `coren` replaces `crp`

Branch: `estomaterapia/etapa1-papeis` (base: `estomaterapia/integracao`). Deploys remain disabled.

## What changed

- **Roles**: `Papel` is now `SUPER_ADMIN, ADMIN, ENFERMEIRO, SECRETARIA, PACIENTE`. `ENFERMEIRO` takes the place of
  `PSICOLOGO` everywhere: shared enum, `PAPEIS_PROFISSIONAIS`, `PAPEIS_COM_2FA_OBRIGATORIO`, default module permissions,
  the web copy of the enum (`apps/web/src/types.ts`), `auth-gates.ts` and its mirror `GateChain.tsx`, every `@Roles`,
  DTO validators (`IsIn`, `ValidateIf`), clinicas/super-admin user creation, tickets, telemedicine, agenda, financeiro,
  documentos, analytics, routes and menus. No `MEDICO` role exists in this version.
- **Professional register**: user field `crp` -> `coren` (entity, Mongo schema, repository, `PATCH /auth/me`,
  `atualizarMeuCoren`, super-admin correction, audit events `USER_COREN_SET` / `USER_COREN_CORRECTED`, stamp on the signed
  record `assinado.coren`, signed payload, issued-document `emissor.coren`, `GateCorenEmissao`, forms and print pages).
- **Authorization matrix**: letter `P` (psychologist) became `E` (enfermeiro). Every route keeps exactly the same set of
  allowed roles as before (only the letter and the role changed); no line was relaxed. Web e2e route matrix updated the same way.
- **Renamed files** (git mv, no route affected): `GateCrpEmissao.tsx` -> `GateCorenEmissao.tsx`; specs/tests
  `*crp*` / `*Psicologo*Crp*` -> `*coren*` / `*Enfermeiro*Coren*`.
- **Legal text**: wording about CRP/CFP rules was replaced by "COREN" as a field label only. Where a format or norm is
  unverified, the comment says `TODO(legal)`. No resolution, article or norm is cited for COREN.

## Data compatibility

- `coren` is optional on read: the existing real ENFERMEIRO (no `coren`, no `termosAceitos`) can still log in.
- `coren` is required only where `crp` was required: signing a record, issuing a clinical attendance certificate
  (API answers 422 "Informe o COREN no seu perfil ..."), and creating a new ENFERMEIRO user (same rule the psi had for PSICOLOGO).
- No role migration is needed (no PSICOLOGO user exists in the real database). The existing user will be asked to accept the
  terms on the next login (the terms gate now applies to ENFERMEIRO and ADMIN).

## Intentionally NOT changed (pending)

- Clinical psychology content: `registroPsicologico`, therapeutic line, psychological attendance pages, laudo/encaminhamento/
  prescription texts, psychology financial module (names such as `ConfigPsicologo`, collection `config_psicologo`,
  `CONFIG_PSICOLOGO_REPOSITORY`), `testes-psicologicos`, IA system prompt text, product brand "Nuvita Psi".
- `inscricoes-teste` still has the applicant field `crpNumero` (public beta signup, decision C07 of the inventory).
- References to CFP resolutions that belong to psychology content or to the minor-patient rule
  (`prontuario.entity.ts`, `soap.dto.ts`, `pacientes.service.ts`, `PacientesPage.tsx`, `AtendimentoPsicologicoPage.tsx`,
  `paciente-idade.ts`, `idade.ts`) -> TODO(legal) when that content is replaced.
- Existing generic field `registroProfissional` is untouched; it is not used as a fallback for `coren`.
- `medicoId` keeps its name (meaning: responsible professional).
- Role nouns inside user-facing texts were changed from "psicologo" to "enfermeiro"; some sentences around clinical content
  still say "psicológico" and will be rewritten in the clinical-content stage.
