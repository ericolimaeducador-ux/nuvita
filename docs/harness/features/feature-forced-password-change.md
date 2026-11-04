## Feature: Forced Password Change

### Depends on

Feature files: none. This is the generic mechanism; other features depend on
it rather than the other way around. Current and expected consumers:

- [[feature-super-admin-clinic-onboarding]] — the only flow today that will
  set the flag to true (the clinic admin created with a temporary password).
- Future flows (e.g. an admin-initiated password reset) can reuse this
  mechanism without rebuilding anything.

Code-level surfaces this feature builds on (not feature files):

- the `User` schema — gains one new field
- the `POST /auth/login` flow and its response shape
- the frontend router / app shell **and** the per-request access-token
  validation — the two interception points (see the amendment under
  *Solution and trade-offs*)
- base docs (`architecture_rules.md`, `coding_convention.md`,
  `forbidden_patterns.md`, `domain_invariantes.md`, `testing_expectation.md`)
  still do not exist, only their templates

### Description

Answer to mandatory question 1 — *"Como você descreve a feature?"* — recorded
verbatim (Portuguese) as given by the user:

> Quando um usuário recebe uma senha temporária (hoje, o único caso é o admin
> de uma clínica nova criada pelo super admin), o sistema exige que ele defina
> uma senha própria antes de conseguir usar qualquer parte do produto. No
> primeiro login com essa senha temporária, em vez de cair direto no painel,
> ele vê uma tela obrigatória de "definir nova senha" — só depois de trocar é
> que o sistema libera acesso normal.

### Problem

Answer to mandatory question 2 — *"Qual problema objetivamente ela resolve?"* —
recorded verbatim (Portuguese) as given by the user:

> Hoje, nenhum dos dois produtos (nuvita, nuvita-psi) tem esse mecanismo —
> confirmado por investigação: o User entity não tem nenhum campo de rotação
> forçada, e não existe tela que intercepte login pra isso. Sem essa trava,
> uma senha temporária gerada e repassada por WhatsApp (que é como o fluxo de
> onboarding de clínica vai funcionar) pode ficar sendo usada permanentemente,
> sem o usuário nunca definir uma senha própria — um risco de segurança real,
> já que essa senha passou por um canal informal (WhatsApp) e potencialmente
> por mais gente além do dono da conta.

### Solution and trade-offs

Answer to mandatory question 3 — *"Qual a solução esperada e quais trade-offs
ela envolve?"* — recorded verbatim (Portuguese) as given by the user:

> Campo novo no User schema: deveTrocarSenha: boolean, default false (segue a
> convenção de nome em português já usada no resto do schema — criadoEm,
> ativo, etc.). Nasce true só para usuários criados com senha temporária
> (hoje, só o fluxo de onboarding de clínica vai setar isso; nasce
> false/ausente para todo usuário já existente, preservando o comportamento
> atual pra quem já usa o sistema).
> Onde a interceptação acontece: no fluxo de login do backend — a resposta de
> POST /auth/login já inclui os dados do usuário; adiciona um campo
> deveTrocarSenha nessa resposta. O frontend, ao receber login bem-sucedido
> com essa flag true, redireciona pra uma tela de troca de senha obrigatória
> antes de renderizar qualquer rota do app (nível de roteador, não guard
> individual por página — mais simples e não há como escapar navegando direto
> pra uma URL).
> O que fica bloqueado: toda a aplicação, exceto a própria tela de troca de
> senha e a ação de logout. O usuário não consegue ver nenhum dado (paciente,
> agendamento, etc.) até trocar a senha.
> Novo endpoint: algo como POST /auth/trocar-senha-obrigatoria (nome a
> definir), que recebe a nova senha, valida força mínima, atualiza
> passwordHash, e vira deveTrocarSenha: false.
> Comportamento pra usuários existentes: nenhuma mudança — a migração/schema
> precisa garantir que usuários já existentes tenham esse campo ausente ou
> false por padrão (não pode haver nenhum cenário em que um usuário que já usa
> o sistema hoje seja forçado a trocar senha sem ter recebido uma nova).
> Trade-off de escopo: essa feature cobre só o mecanismo genérico (campo +
> interceptação + tela de troca). Ela não decide sozinha quando deveTrocarSenha
> é setado como true — isso é responsabilidade de quem cria o usuário (no
> caso, a feature de onboarding de clínica, que depende desta). Deixa a porta
> aberta pra outros fluxos futuros (ex.: reset de senha feito por um admin)
> reaproveitarem o mesmo mecanismo sem reconstruir nada.

**Amendment (2026-09-11) — scope extends to PSICOLOGO creation by the
clinic admin and by the platform super-admin.**

The verbatim answer above scopes who sets `deveTrocarSenha = true` to "quem
cria o usuário" without naming a specific creation path beyond clinic
onboarding. That scope is amended, not replaced: two additional creation
points now set it too, both confirmed to already use the same
`CreateUserInput` port this feature introduced (no new infrastructure):

- `ClinicasService.createUsuario()` (`POST /clinicas/:clinicaId/usuarios`) —
  the endpoint a clinic `ADMIN` uses to create a `PSICOLOGO` or `SECRETARIA`
  under their own clinic. Sets `deveTrocarSenha: true` when the role created
  is `PSICOLOGO`; `SECRETARIA` is unaffected.
- `SuperAdminService.createUsuario()` (the platform super-admin's generic
  user-creation endpoint, unrestricted by role) — same rule: `true` when the
  role created is `PSICOLOGO`, regardless of clinic.

Reason: a psychologist created through either path also receives a
system-generated password handed over through an informal channel (the same
WhatsApp-handoff exposure this feature was built to close for the clinic
admin case) — there is no reason the mandatory-change guarantee should stop
at the first admin of a clinic when the same exposure exists for every
psychologist created afterward, by either an admin or the platform
super-admin.

**Amendment (2026-09-10) — enforcement is two-layer, not router-only.**

The verbatim answer above describes the interception as frontend router-level.
The approved design (`my_docs/tdd-clinic-onboarding-and-auth-gates.md`, §2.6
and §9) makes enforcement **two layers**, because the router alone was never a
security boundary — a holder of a valid access token can call the API
directly:

- **Frontend router / app shell — the UX layer.** Redirects a user with
  `deveTrocarSenha = true` to the mandatory change-password screen and hides
  every other route. This is the user-facing experience of the guarantee, not
  the guarantee itself.
- **Backend guard in the per-request access-token validation — the security
  layer.** While `deveTrocarSenha = true`, every authenticated request is
  rejected **except** the gate's own endpoints (`trocar-senha-obrigatoria`,
  `aceitar-termos`) and `logout`. The full `User` is already loaded on every
  request during token validation, so this check adds no extra round-trip.

Both layers read the same `deveTrocarSenha` field; the backend is
authoritative.

### Flow (given/when/then)

Behavioural flow, derived by the agent from the four answers above (no method
names, no framework syntax).

**Intercepted first login**

- **Given** a user whose account has `deveTrocarSenha` set to true
- **When** they authenticate successfully through the normal login flow (with
  a 2FA code if the role requires it)
- **Then** the login response carries `deveTrocarSenha: true`, and the
  frontend — before rendering any application route — redirects to a
  mandatory change-password screen; only that screen and the logout action
  are reachable

**Completing the change**

- **Given** that user on the mandatory change-password screen
- **When** they submit a new password that meets the minimum-strength policy
- **Then** the password hash is updated, `deveTrocarSenha` becomes false, and
  the application becomes accessible

**Existing users (regression guard)**

- **Given** any user created before this feature (`deveTrocarSenha` absent or
  false)
- **When** they sign in
- **Then** the login flow is unchanged — no interception, no forced change

### Error cases (explicit, not left implicit)

- New password fails the minimum-strength policy → rejected; `deveTrocarSenha`
  stays true; the app stays blocked
- User navigates directly to an application URL while `deveTrocarSenha` is
  true → the router sends them back to the change-password screen; there is
  no route that renders app content in this state
- The mandatory-change endpoint is called by a user whose `deveTrocarSenha`
  is already false → rejected; it is not a generic "change my password"
  endpoint and must not bypass the normal current-password check
- Migration must leave every pre-existing user with the field absent or
  false — there must be no path by which a user already using the system is
  forced to change a password they were never reissued
- A client holding a valid access token calls a non-gate API route while
  `deveTrocarSenha` is true → **rejected by the backend guard** (see the
  amendment under *Solution and trade-offs*); only `trocar-senha-obrigatoria`,
  `aceitar-termos` and `logout` are reachable until the password is changed.
  The frontend router redirect is the UX for this; the backend guard is the
  actual boundary.

### Acceptance criteria (what proves it is done)

- [ ] Test: a user with `deveTrocarSenha` true receives that flag in the
  login response
- [ ] Test: the frontend blocks every route except the change-password
  screen and logout while the flag is true, including direct URL navigation
- [ ] Test: the backend rejects an authenticated request to any non-gate
  route while `deveTrocarSenha` is true, and allows `trocar-senha-obrigatoria`,
  `aceitar-termos` and `logout`
- [ ] Test: a successful password change updates the hash and sets
  `deveTrocarSenha` to false
- [ ] Test: a new password below the minimum-strength policy is refused and
  the flag is unchanged
- [ ] Test: a pre-existing user without the flag signs in with no
  interception — no regression in the login flow
- [ ] Test: the schema/migration leaves every existing user with
  `deveTrocarSenha` absent or false
- [ ] Test: the mandatory-change endpoint refuses a user whose
  `deveTrocarSenha` is already false

### Example / context

Answer to mandatory question 4 — *"Qual exemplo ou contexto concreto temos do
problema e da solução?"* — recorded verbatim (Portuguese) as given by the user:

> Motivado diretamente pela feature de onboarding de clínica: o super admin
> vai gerar uma senha aleatória e repassá-la manualmente via WhatsApp pro
> admin da clínica nova. Sem um mecanismo de troca obrigatória, essa senha
> (que passou por um canal de comunicação informal) poderia continuar sendo a
> senha permanente da conta, sem o dono nunca ser forçado a defini-la de forma
> privada e própria.

### Suggested Design Patterns (Gang of Four)

- **Chain of Responsibility** — the post-login gates form an ordered chain:
  terms acceptance ([[feature-terms-of-service-acceptance]]) → forced password
  change → (future gates such as an admin-initiated reset). Each handler
  inspects the authenticated user and either passes control to the next
  handler or intercepts, redirecting to its own mandatory screen. With the
  terms feature confirmed there are now **two concrete gates with a defined
  order** (terms first, password second), so this is a real need, not a
  hypothetical single gate — the chain is where that order lives and where a
  future gate slots in without changing the router logic. This is the
  **shared mechanism**; `feature-terms-of-service-acceptance` documents the
  same chain from the terms-gate end.
- Not proposing State or Strategy — the account is not modelled as a formal
  State object graph for one boolean, and the gates are not interchangeable
  strategies selected at runtime; they are a fixed ordered pipeline where
  every applicable gate must pass.
