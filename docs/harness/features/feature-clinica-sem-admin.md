## Feature: Clinic Without a First Administrator

### Depends on

Feature files:

- [[feature-super-admin-clinic-onboarding]] — the original flow (`POST /super-admin/clinicas`) that
  required the first administrator. It carries an amendment dated 2026-10-29 pointing here; its original
  text is kept as it was.

Code-level surfaces this feature builds on (not feature files):

- `CriarClinicaDto` (`apps/api/src/modules/super-admin/application/dto/criar-clinica.dto.ts`)
- `SuperAdminService.criarClinica` and `ClinicasService.onboard`
- the "Nova clínica" dialog in `SuperAdminPage.tsx`
- `POST /super-admin/usuarios` ("Novo usuário"), unchanged: it already creates a PSICOLOGO with CRP in any clinic

### Description

Answer to mandatory question 1, recorded verbatim (Portuguese) as given by Erico:

> Criar clínica sem o primeiro administrador; quem atende sozinho tem só a conta de psicólogo.

### Problem

Answer to mandatory question 2, recorded verbatim (Portuguese) as given by Erico:

> O formulário obriga nome e e-mail de um admin, que a participante não tem nem precisa.

### Solution and trade-offs

Answer to mandatory question 3, recorded verbatim (Portuguese) as given by Erico:

> Admin opcional; o super-admin cria o psicólogo depois; o que a clínica perde sem admin fica com o super-admin.

Rule implemented (derived from the answer above, not a fourth answer):

- `primeiroAdmin.nome` and `primeiroAdmin.email` are both optional.
- Both present: the admin is created exactly as before (temporary password, forced password change, 2FA).
- Neither present: the clinic is created alone. The response has no `admin`, no `senhaTemporaria` and no `twoFactorSetup`.
- Only one of the two: 400.
- No role, `RolesGuard` or authorization matrix change.
- Audit: `CLINIC_CREATED` is written with the acting super-admin as `userId`; `email` is omitted when there is no admin (never invented). The later creation of the psychologist is audited by `USER_CREATED_BY_SUPER_ADMIN` as today.
- Rollback: unchanged. It only covers a failure creating the admin; with no admin there is nothing to compensate.

What a clinic without an admin cannot do on its own, and who does it:

| Capability | Needs ADMIN today | Without an admin |
|---|---|---|
| Create PSICOLOGO / SECRETARIA from inside the clinic (`POST /clinicas/:clinicaId/usuarios`) | yes | the super-admin creates them in "Novo usuário" |
| Upload / remove the clinic logo | ADMIN or SUPER_ADMIN | the super-admin |
| Notifications (`/notificacoes`) | SECRETARIA or ADMIN | unchanged for the psychologist (never had access); the super-admin operates through the active-clinic header |
| Patients, agenda, documents, telemedicine | psychologist already included | unchanged |

### Example

Answer to mandatory question 4, recorded verbatim (Portuguese) as given by Erico:

> A clínica da primeira participante, criada só com o psicólogo.

### Out of scope

- A psychologist with administrator powers inside the clinic: discarded for now; recorded as a post-beta idea in `docs/PROGRESS_BETA_PRELAUNCH.md`.
- Any change to roles, `RolesGuard` or the authorization matrix.
