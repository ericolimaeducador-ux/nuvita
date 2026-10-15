## Feature: Super Admin Clinic Onboarding

### Depends on

Feature files:

- [[feature-forced-password-change]] — the forced first-login password change
  is a system-wide auth change (new `User` field + login interception) that
  outgrows "create a clinic from the UI". It is mapped as its own feature and
  this onboarding flow is the first consumer of it: the admin created here is
  the first account that will carry the "must change password" flag set to
  true. **That feature file still needs its own four mandatory answers from
  the user before either feature can be implemented.**

Code-level surfaces this feature builds on (not feature files):

- `ClinicasService.onboard()` — already implemented and tested; reused as-is,
  not rewritten
- `SuperAdminController` + `SuperAdminGuard` — the new `POST /super-admin/clinicas`
  route lives here
- the one-time 2FA display dialog in `SuperAdminPage.tsx` — reused to show the
  new admin's 2FA key
- base docs (`architecture_rules.md`, `coding_convention.md`,
  `forbidden_patterns.md`, `domain_invariantes.md`, `testing_expectation.md`)
  still do not exist, only their templates

### Description

Answer to mandatory question 1 — *"Como você descreve a feature?"* — recorded
verbatim (Portuguese) as given by the user:

> O super admin, pela própria interface, cria uma clínica nova e o usuário
> admin dela, informando os dados básicos e recebendo uma senha temporária
> gerada automaticamente — que ele passa manualmente pro cliente (hoje via
> WhatsApp). Substitui o processo manual via CLI (bootstrap-admin) que exige
> acesso ao servidor. O novo usuário admin é obrigado a trocar essa senha
> temporária no primeiro login, antes de acessar qualquer outra parte do
> sistema.

### Problem

Answer to mandatory question 2 — *"Qual problema objetivamente ela resolve?"* —
recorded verbatim (Portuguese) as given by the user:

> Hoje, cada clínica nova exige que alguém com acesso ao servidor/GCP rode o
> comando bootstrap-admin manualmente. Isso não escala — cada cliente novo
> depende de disponibilidade técnica, e não existe fluxo de onboarding
> real pelo produto. Confirmado por investigação: nuvita-psi é fork do
> nuvita (produto original de estomoterapia), e os dois compartilham a mesma
> lacuna — SuperAdminPage.tsx em ambos só lista/edita clínicas e cria
> usuários vinculados a clínicas já existentes; a criação de clínica+admin
> (ClinicasService.onboard()) existe nos dois backends mas nunca foi exposta
> via HTTP, só via CLI.

### Solution and trade-offs

Answer to mandatory question 3 — *"Qual a solução esperada e quais trade-offs
ela envolve?"* — recorded verbatim (Portuguese) as given by the user:

> Solução: novo endpoint POST /super-admin/clinicas no SuperAdminController,
> chamando o ClinicasService.onboard() já existente e testado (sem
> reescrever a lógica de criação de clínica). Novo dialog "Nova clínica" na
> aba Clínicas de SuperAdminPage.tsx, reaproveitando o componente de
> exibição de 2FA que já existe e já é usado no fluxo de criação de usuário
> (mostra o base32 uma vez, texto selecionável, aviso de que não será
> exibido de novo — sem QR code, mesmo padrão atual).
>
> Campos do formulário: mínimos — nome da clínica, CNPJ, plano, fuso
> horário, duração padrão de consulta, mais nome/e-mail do admin. Mesmos
> campos que a CLI bootstrap-admin já usa hoje. Endereço, logo, cor e
> WhatsApp (que o DTO já suporta mas a CLI não usa) ficam fora desta
> versão — podem ser adicionados depois sem mudança estrutural, já que o
> DTO já aceita esses campos.
>
> Trade-offs, incluindo dois desvios deliberados do padrão atual do
> produto:
>
> - Senha gerada automaticamente pelo backend, nunca digitada pelo super
>   admin — diverge do padrão atual (que sempre é senha digitada por quem
>   cria o usuário, tanto no nuvita quanto no nuvita-psi). Decisão
>   consciente: evita reaproveitamento de senha entre clientes diferentes
>   por conveniência/pressa do super admin.
> - Troca de senha obrigatória no primeiro login — feature de comportamento
>   que NÃO existe em nenhum dos dois produtos hoje (confirmado: o User
>   entity não tem nenhum campo de rotação forçada, e não há tela que
>   intercepta login pra isso). Exige campo novo no schema de usuário e
>   lógica nova no fluxo de login. Trade-off de risco: essa mudança toca a
>   autenticação de TODOS os usuários do sistema, não só os criados por
>   esta feature — o campo precisa nascer ausente/false para usuários
>   existentes, e true só para os criados por este fluxo novo, para não
>   quebrar login de quem já usa o sistema hoje.
> - Cobrança/assinatura fica inteiramente fora do escopo — decisão
>   consciente de sequenciamento. A intenção declarada é uma landing page
>   futura (Nuvita como marca guarda-chuva, onde o cliente escolhe entre
>   Nuvita Estomoterapia e Nuvita Psicologia, faz o pagamento recorrente
>   via cartão ali), construída só depois que os dois produtos estiverem
>   100% estáveis em produção sem falhas. Esta feature não deve antecipar
>   nenhuma integração de gateway de pagamento.

### Flow (given/when/then)

Behavioural flow, derived by the agent from the four answers above (no method
names, no framework syntax).

**Clinic + admin creation**

- **Given** a user authenticated as `SUPER_ADMIN`, on the Clínicas tab of the
  super-admin panel
- **When** they open "Nova clínica", fill the minimal fields (clinic name,
  CNPJ, plan, timezone, default consultation duration, admin name, admin
  e-mail) and submit
- **Then** the API generates a temporary password on the backend, calls the
  existing clinic-onboarding logic to create the clinic and its first `ADMIN`
  user, marks that user as required to change the password on first login,
  provisions the ADMIN's 2FA secret, writes the clinic-created audit entry,
  and returns — once — the clinic summary, the temporary password and the 2FA
  key for the super admin to relay to the client

**First login of the new admin**

- **Given** a newly created `ADMIN` whose account is flagged "must change
  password"
- **When** they sign in for the first time with the temporary password (and,
  because the role requires it, the 2FA code)
- **Then** authentication succeeds but every part of the system except the
  change-password screen is blocked until a new password is set; once the new
  password is accepted the flag is cleared and normal access is granted

**Existing users (regression guard)**

- **Given** any user created before this feature (no "must change password"
  flag, or flag false)
- **When** they sign in
- **Then** the login flow is unchanged — no forced password change, no new
  interception

### Error cases (explicit, not left implicit)

- CNPJ already registered → reject (409), create neither clinic nor user
  (behaviour already enforced by `onboard()`)
- Admin e-mail already registered → reject (409), create nothing
- Clinic row created but first-admin creation then fails → must not leave an
  orphan clinic with no admin; the creation must be atomic or compensated
  (design-doc concern, flagged here)
- Endpoint called by a non-`SUPER_ADMIN` (or unauthenticated) → reject
  (403 / 401), create nothing
- Temporary password is returned only in the creation response; if the super
  admin loses it before relaying it, the only recovery is the existing
  reset-password action — documented, no new recovery path
- "Must change password" migration must not lock out existing accounts: the
  field is absent/false for every current user and only true for accounts
  created by this flow
- A user still flagged "must change password" calls any other API route →
  refused until the password is changed
- New password on the change screen fails the system password policy
  (length/complexity) → rejected, flag stays set

### Acceptance criteria (what proves it is done)

- [ ] Test: `POST /super-admin/clinicas` as `SUPER_ADMIN` creates the clinic
  and its first `ADMIN`, and returns a one-time temporary password
- [ ] Test: the created `ADMIN` is persisted with the "must change password"
  flag set to true
- [ ] Test: the generated temporary password satisfies the system password
  policy
- [ ] Test: the endpoint is refused (403) for any role other than
  `SUPER_ADMIN`
- [ ] Test: duplicate CNPJ creates nothing; duplicate admin e-mail creates
  nothing
- [ ] Test: the clinic-created event is written to `audit_logs`
- [ ] Test: signing in as the new `ADMIN` with the temporary password blocks
  every route except the change-password screen
- [ ] Test: after a successful password change the flag is cleared and full
  access is granted
- [ ] Test: a pre-existing user without the flag signs in normally — no
  regression in the login flow
- [ ] UI: the temporary password and the 2FA key are shown once, as
  selectable text, with a "will not be shown again" warning and no QR code
  (same pattern as the current user-creation flow)

### Example / context

Answer to mandatory question 4 — *"Qual exemplo ou contexto concreto temos do
problema e da solução?"* — recorded verbatim (Portuguese) as given by the user:

> O usuário, já logado como SUPER_ADMIN em produção (primeira conta criada
> nesta mesma sessão via create-super-admin.mjs), tentou criar uma clínica
> pela aba "Clínicas" do painel e descobriu que só existe listagem/edição,
> sem ação de criação. Investigação subsequente confirmou que isso não é
> lacuna exclusiva do nuvita-psi: nuvita-psi é fork do nuvita, e ambos os
> produtos têm exatamente a mesma lacuna, herdada da mesma base de código —
> super-admin.controller.ts é byte-idêntico entre os dois projetos.

### Suggested Design Patterns (Gang of Four)

- **Facade (descriptive, already present)** — `ClinicasService.onboard()` is
  already a facade over the multi-step creation (clinic + first admin + 2FA
  provisioning + audit entry). This feature only exposes that facade through
  a new HTTP route; it must not reimplement or bypass any of those steps. No
  new pattern is introduced on the backend.
- **Strategy (only if it earns its place)** — the temporary-password
  generator could be a small strategy so the generation policy can change
  later without touching the onboarding flow. There is one implementation
  today, so treat this as optional: extract it only if a second policy or a
  test seam actually calls for it, otherwise a plain generator function is
  enough. Not pattern-shopping either way — flagging the seam, not mandating
  the object.
- The forced first-login gate is **not** designed here — it belongs to
  [[feature-forced-password-change]] and its Chain of Responsibility.

### Amendment (2026-10-15) — QR code

O "sem QR code" deste arquivo foi revisto pelo Erico em 15/10/2026 (correção C1 do teste beta,
ver feature-acesso-teste-beta): o diálogo de clínica criada mostra QR code e chave em texto, e
`POST /super-admin/clinicas` devolve `twoFactorSetup: { base32, otpauthUrl }`.
