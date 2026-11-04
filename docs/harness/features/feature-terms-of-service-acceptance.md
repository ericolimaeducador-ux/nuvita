## Feature: Terms of Service Acceptance

### Depends on

Feature files:

- [[feature-forced-password-change]] — shares the same post-login gate
  mechanism (see *Suggested Design Patterns*). When both gates apply to the
  same login, the terms gate runs **first**, the password gate second.

Related (not a hard dependency):

- [[feature-super-admin-clinic-onboarding]] — creates the clinic `ADMIN`;
  `PSICOLOGO` accounts are created afterwards by that clinic's admin. A
  `PSICOLOGO` created with a temporary password is the case where both gates
  fire in sequence.

Code-level surfaces this feature builds on (not feature files):

- the `User` schema — gains one new field, shaped like the existing
  `ConsentimentoLGPD` sub-document already used on `pacientes`
- the `POST /auth/login` flow and its response shape
- the frontend router / app shell **and** the per-request access-token
  validation — the two interception points (same ones used by
  `feature-forced-password-change`; see the amendment under *Solution and
  trade-offs*)
- `docs/legal/termos-de-uso.md` — the published Terms text and its version;
  **the finalized file is authored by the user outside this flow and is not
  yet in the repository**
- base docs (`architecture_rules.md`, `coding_convention.md`,
  `forbidden_patterns.md`, `domain_invariantes.md`, `testing_expectation.md`)
  still do not exist, only their templates

### Description

Answer to mandatory question 1 — *"Como você descreve a feature?"* — recorded
verbatim (Portuguese) as given by the user:

> Todo PSICOLOGO deve ler e aceitar explicitamente os Termos de Uso do
> Nuvita Psi no login, antes de qualquer outra coisa — inclusive antes da
> troca de senha obrigatória, quando as duas se aplicarem juntas. O aceite
> é registrado com data e versão do termo.

### Problem

Answer to mandatory question 2 — *"Qual problema objetivamente ela resolve?"* —
recorded verbatim (Portuguese) as given by the user:

> Hoje não existe mecanismo de aceite de termos pra usuário do sistema (só
> existe consentimento LGPD do paciente, que é outra coisa — confirmado por
> investigação nesta sessão). Sem isso, um profissional pode usar a
> plataforma sem nunca ter formalmente concordado com as obrigações que o
> Termo de Uso estabelece (Seção 4, principalmente — responsabilidade dele
> perante os próprios pacientes).

### Solution and trade-offs

Answer to mandatory question 3 — *"Qual a solução esperada e quais trade-offs
ela envolve?"* — recorded verbatim (Portuguese) as given by the user:

> Campo novo no User schema: termosAceitos: { versao: string, dataAceite:
> Date } | null, seguindo o mesmo formato que já existe pro
> ConsentimentoLGPD do paciente (reaproveita padrão já validado no código,
> não inventa formato novo). Interceptação no mesmo nível de roteador que
> forced-password-change — dois gates reais em sequência definida: termos
> primeiro, depois senha. Versão do termo hoje é "1.0" (10/09/2026); se o
> termo mudar no futuro, muda a versão, e usuário que aceitou versão antiga
> precisa aceitar de novo (reaceite obrigatório a cada nova versão).
> Escopo: só PSICOLOGO. Não há nenhum PSICOLOGO cadastrado em produção
> hoje (confirmado nesta sessão) — os dois gates novos só afetam, na
> prática, usuários criados a partir de agora pelo fluxo de onboarding;
> usuários pré-existentes de qualquer papel permanecem com o campo
> ausente/null, mesma regra de segurança já estabelecida em
> forced-password-change.

**Amendment (2026-09-10) — enforcement is two-layer, not router-only.**

**Amendment (2026-09-10) — scope extends to `ADMIN`.**

The verbatim answer above scopes the terms gate to `PSICOLOGO` only
("Escopo: só PSICOLOGO"). That scope is amended, not replaced: the gate now
also applies to `ADMIN`.

- **New scope:** `PSICOLOGO` and `ADMIN`. `SECRETARIA` remains out of scope
  (and so does `PACIENTE`, `SUPER_ADMIN`).
- **Reason:** while testing the real onboarding flow, the user identified
  that the first `ADMIN` of a clinic is frequently the psychologist/
  professional responsible for the clinic themselves (see
  [[feature-super-admin-clinic-onboarding]]) — someone who should also
  formally accept the Terms of Use. It made no sense for the gate to skip
  exactly the person who, in practice, is usually the one attending
  patients.
- Both enforcement layers documented in the amendment above (frontend
  router / app shell, and the backend `AuthGatesGuard`) apply the same
  widened scope — they must stay in sync, per the existing
  ⚠️ SINCRONIA MANUAL comments in `apps/api/src/modules/auth/domain/
  auth-gates.ts` and `apps/web/src/auth/GateChain.tsx`.
- The *Flow* and *Error cases* sections below still say "PSICOLOGO" from
  the original answer; read every such reference there as "PSICOLOGO or
  ADMIN" per this amendment. The *Acceptance criteria* item "non-PSICOLOGO
  roles are never gated by the terms mechanism" is superseded by: SECRETARIA
  and PACIENTE are never gated by the terms mechanism; PSICOLOGO and ADMIN
  are.

The verbatim answer above describes the interception as being at the same
frontend router level as `feature-forced-password-change`. The approved design
(`my_docs/tdd-clinic-onboarding-and-auth-gates.md`, §2.6 and §9) makes
enforcement **two layers**, because the router alone was never a security
boundary — a holder of a valid access token can call the API directly:

- **Frontend router / app shell — the UX layer.** Redirects a `PSICOLOGO`
  whose `termosAceitos.versao` is stale or absent to the mandatory
  accept-Terms screen and hides every other route. This is the user-facing
  experience of the guarantee, not the guarantee itself.
- **Backend guard in the per-request access-token validation — the security
  layer.** While a `PSICOLOGO`'s recorded Terms version is not the current
  one, every authenticated request is rejected **except** the gate's own
  endpoints (`aceitar-termos`, `trocar-senha-obrigatoria`) and `logout`. The
  full `User` is already loaded on every request during token validation, so
  this check adds no extra round-trip.

Both layers read the same `termosAceitos` field against the same published
version constant; the backend is authoritative. The gate ordering (terms
before password) holds in both layers.

### Flow (given/when/then)

Behavioural flow, derived by the agent from the four answers above (no method
names, no framework syntax).

**Terms gate at login**

- **Given** a `PSICOLOGO` whose `termosAceitos` is null, or whose
  `termosAceitos.versao` differs from the currently published Terms version
- **When** they authenticate successfully
- **Then** before any application route renders — and before the
  forced-password-change screen, when that also applies — the frontend shows
  a mandatory "read and accept the Terms of Use" screen with the current
  version's text; only that screen and the logout action are reachable

**Accepting**

- **Given** that `PSICOLOGO` on the mandatory terms screen
- **When** they take an explicit accept action for the version shown
- **Then** the acceptance is persisted as `{ versao, dataAceite }` and the
  next gate in the sequence takes over — the forced-password-change screen if
  it applies, otherwise normal access

**Re-acceptance on a new version**

- **Given** a `PSICOLOGO` who previously accepted version X
- **When** a newer version Y is published and they next sign in
- **Then** the gate fires again and acceptance of Y is required before access

**Roles outside scope / existing users**

- **Given** a user who is not a `PSICOLOGO`
- **When** they sign in
- **Then** the terms gate never fires, regardless of `termosAceitos`
- **Given** any pre-existing account (all non-`PSICOLOGO` today; field
  absent/null)
- **When** they sign in
- **Then** no terms interception — consistent with the
  forced-password-change regression rule

### Error cases (explicit, not left implicit)

- The `PSICOLOGO` refuses or abandons the terms screen → stays blocked; only
  logout is available; no partial access to any data. A direct API call from a
  token holder in this state is rejected by the backend guard (see the
  amendment under *Solution and trade-offs*) — the router redirect is the UX,
  the backend guard is the boundary
- `termosAceitos.versao` is present but does not match the currently
  published version (older version, or an unknown value) → treated as not
  accepted; the gate fires
- Persisting the acceptance fails → the user is **not** let through; fail
  closed
- A newer Terms version is published while a `PSICOLOGO` already has an
  active session → the gate is evaluated at login, so the running session is
  not interrupted; re-acceptance is required at their next login (recorded
  here so it is not left implicit — whether active sessions must be
  invalidated is a design-doc decision)
- A non-`PSICOLOGO` account somehow carries a `termosAceitos` value → ignored;
  no gate, no side effect
- The published Terms file / version is unavailable to the app at gate time →
  fail closed (block), never let the user through without showing a version
  to accept

### Acceptance criteria (what proves it is done)

- [ ] Test: a `PSICOLOGO` with `termosAceitos` null is gated at login
- [ ] Test: the backend rejects an authenticated request to any non-gate
  route from a `PSICOLOGO` whose recorded Terms version is stale/absent, and
  allows `aceitar-termos`, `trocar-senha-obrigatoria` and `logout`
- [ ] Test: when both gates apply, the terms screen is shown before the
  forced-password-change screen
- [ ] Test: an explicit accept persists `{ versao, dataAceite }` matching the
  currently published version
- [ ] Test: a `PSICOLOGO` who accepted an older version is gated again after
  the version is bumped
- [ ] Test: non-`PSICOLOGO` roles are never gated by the terms mechanism
- [ ] Test: a pre-existing (non-`PSICOLOGO`) user signs in with no terms
  interception — no regression in the login flow
- [ ] Test: the schema/migration leaves every existing user with
  `termosAceitos` absent or null
- [ ] Test: acceptance below the gate (refusal / persist failure) never
  grants access to application data
- [ ] UI: the acceptance screen shows the current Terms text and version in
  full; acceptance requires an explicit action and is not pre-selected

### Example / context

Answer to mandatory question 4 — *"Qual exemplo ou contexto concreto temos do
problema e da solução?"* — recorded verbatim (Portuguese) as given by the user:

> Motivado pela criação do documento de Termos de Uso nesta mesma sessão
> (docs/legal/termos-de-uso.md), que precisa de mecanismo de aceite pra ter
> efeito real — termo escrito sem aceite registrado não vale nada na
> prática.

### Suggested Design Patterns (Gang of Four)

- **Chain of Responsibility** — the post-login gates form an ordered chain:
  terms acceptance → forced password change → (future gates). Each handler
  inspects the authenticated user and either passes control to the next
  handler or intercepts, redirecting to its own mandatory screen. This is now
  a concrete need, not speculation: there are two known gates with a defined
  order (terms first, password second), and the chain is the natural place to
  keep that order and let future gates slot in without touching the router
  logic. This is the **shared mechanism** — `feature-forced-password-change`
  documents the same chain from the password-gate end.
- Not proposing Strategy or State — the gates are not interchangeable
  implementations of one interface chosen at runtime; they are a fixed,
  ordered pipeline where every applicable gate must pass. Forcing Strategy or
  a State object graph here would be pattern-shopping.
