## Feature: Dynamic clinical letterhead (clinic data + professional CRP)

### Depends on

Code-level surfaces (not feature files): `Clinica` entity/schema, `User` entity/schema, SUPER_ADMIN clinic create/update DTOs, `ClinicasController`, `AuthController`, clinical document pages (certificate, report, referral, prescription, medical record print), `brand.ts`.

Delivery plan: PR 1 is backend only (clinic phone/contact e-mail, user CRP, `GET /clinicas/minha`, self-update of the CRP). The web changes (letterhead, signature block, `brand.ts` cleanup) come in later PRs.

### Description

Verbatim answer from the user (question 1):

> O documento clínico (atestado/laudo/encaminhamento/receita/prontuário) passa a mostrar no cabeçalho/rodapé os dados da CLÍNICA (nome, endereço, telefone, e-mail) via GET /clinicas/minha, e no bloco de assinatura o psicólogo + CRP vindos da conta do usuário. brand.ts perde o CNPJ/endereço da 7Safe (só eram usados no timbre); fica só nome do produto e logo, para o rodapé do app. Nada de Nuvita/Dealer/7Safe no corpo clínico.

### Problem

Verbatim answer from the user (question 2):

> O CRP é guardado na CONTA DO USUÁRIO (segue o profissional), não digitado a cada documento.

### Solution and trade-offs

Verbatim answer from the user (question 3):

> Bordas: clínica sem telefone/e-mail → o campo some do timbre (sem rótulo vazio); CRP não preenchido → bloqueia a emissão com aviso "preencha seu CRP no perfil"; documento já impresso antes não muda; clínica sem logo → cabeçalho textual, nunca o logo do Nuvita.

### Flow (given/when/then)

- Given an authenticated ADMIN, PSICOLOGO or SECRETARIA
- When they call GET /clinicas/minha
- Then they receive only their own clinic's letterhead data (name, CNPJ, address, phone, contact e-mail, logo URL)

- Given an authenticated user
- When they save their own CRP
- Then it is stored on their account and never on another user's

### Error cases (explicit, not left implicit)

- Unauthenticated request to GET /clinicas/minha → 401.
- Role without access (PACIENTE) → 403.
- User without a clinic in the token → 403.
- Clinic without phone or contact e-mail → fields come back absent (the client hides them).

### Acceptance criteria (what proves it is done)

- [ ] Test: GET /clinicas/minha returns the tenant clinic with the letterhead fields.
- [ ] Test: tenant-scoped; clinic A never reads clinic B.
- [ ] Test: allowed for ADMIN/PSICOLOGO/SECRETARIA, denied without authentication.
- [ ] Test: User has an optional `crp`.
- [ ] Test: a user saves their own CRP and cannot save another user's.
- [ ] Test: Clinica has `telefone` and `emailContato`, accepted by the SUPER_ADMIN create/update.

### Example / context

Verbatim answer from the user (question 4):

> Exemplo: psicólogo da "Clínica X" emite atestado → cabeçalho "Clínica X · endereço · telefone", rodapé idem, assinatura "Fulano — CRP 06/12345". Zero menção a Nuvita/Dealer/7Safe.

### Amendment (2026-10-15): CRP lifecycle and field mutability

Decisions recorded by the repository owner (Erico) while implementing PR 1. They refine the answers above; the verbatim answers stay unchanged.

**CRP lifecycle**

- The professional fills their own CRP once, through `PATCH /auth/me` (body accepts only `crp`; the user id always comes from the token). The first fill is audited as `USER_CRP_SET` (new value).
- Once filled, the same endpoint answers `409` "CRP já definido; correção só pelo administrador" (also for the same value).
- Only the SUPER_ADMIN can correct it afterwards, through `PATCH /super-admin/usuarios/:id` (`crp`), audited as `USER_CRP_CORRECTED` (previous and new value).
- `User.crp` is optional, trimmed, with no unique index. The CRP format is NOT validated (no official CFP source yet): confirm it in a CFP source before adding a regex.

**Who can change which letterhead field (goal: prevent fraud in reports)**

| Field | Who can change it |
|---|---|
| Logo, trade name, phone (`telefone`), contact e-mail (`emailContato`) | The clinic (ADMIN) |
| Tax document (CPF/CNPJ), legal name, company data | SUPER_ADMIN only |
| CRP after the first fill | SUPER_ADMIN only |

In PR 1 the SUPER_ADMIN is the only one who edits `telefone` and `emailContato` (`PATCH /super-admin/clinicas/:id`), audited as `CLINIC_CONTACT_UPDATED` (fields, before and after).

### Contract of GET /clinicas/minha

`{ nome, documento, tipoDocumento, endereco, telefone, emailContato, logoUrl }`. Absent values are `undefined` (never an empty string). The tenant comes only from the token; no other clinic field is exposed. Guards: `JwtAuthGuard`, `AuthGatesGuard`, `TenantRequiredGuard`, `RolesGuard` (ADMIN, PSICOLOGO, SECRETARIA).

### Follow-ups (not in PR 1)

- ADMIN-facing endpoint to edit logo, trade name, `telefone` and `emailContato` of their own clinic (today only the SUPER_ADMIN can).
- Web changes (letterhead, signature block, `brand.ts` cleanup) in PR 2.
