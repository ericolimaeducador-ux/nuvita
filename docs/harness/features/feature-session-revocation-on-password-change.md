## Feature: Session Revocation on Password Change

### Depends on

Feature files:

- [[feature-forced-password-change]] — a real causal relationship, not mere
  juxtaposition: that feature's `trocarSenhaObrigatoria()` endpoint is the
  only password-change path that exists today, and this feature must hook
  into it (and into any future password-change path) to stamp the new
  revocation field. Its 2026-09-11 amendment (extending `deveTrocarSenha` to
  `PSICOLOGO` accounts created by a clinic admin and by the platform
  super-admin) also widens who benefits from this feature — more accounts
  now go through a temporary-password handoff, so more accounts get the
  stale-session protection once this ships.
- [[feature-terms-of-service-acceptance]] — not a hard dependency: both
  features touch `validateAccessPayload()`, but for orthogonal reasons — one
  reads pending acceptance/password-change state, the other compares a token
  timestamp. There is no required execution order between them, only
  juxtaposition in the same method. This differs from
  `feature-forced-password-change`, where there is a real causal
  relationship (an event there triggers the need for action here).
- [[feature-super-admin-clinic-onboarding]] — context of origin (the
  WhatsApp temporary-password handoff this feature closes a residual
  exposure window for), not a hard dependency.

Code-level surfaces this feature builds on (not feature files):

- the `User` schema — gains one new field, `tokensValidosApartirDe: Date`
- `AuthTokenPayload` (`packages/shared/src/auth`) — does not currently
  declare `iat` (issued-at); the claim exists at runtime on every JWT but is
  untyped, so the interface needs `iat?: number` added
- `AuthService.validateAccessPayload()` — access-token check point, already
  loads the full `User`
- `AuthService.refresh()` / `verifyRefreshToken()` — refresh-token check
  point, already loads the full `User`
- `AuthService.trocarSenhaObrigatoria()` — the write side; must stamp the
  new field on a successful password change
- base docs (`architecture_rules.md`, `coding_convention.md`,
  `forbidden_patterns.md`, `domain_invariantes.md`, `testing_expectation.md`)
  still do not exist, only their templates

### Description

Answer to mandatory question 1 — *"Como você descreve a feature?"* —
recorded verbatim (Portuguese) as given by the user:

> Quando um usuário troca a senha (seja pela troca obrigatória de senha
> temporária, seja por qualquer troca de senha futura), todas as sessões
> dele — inclusive as que já estavam ativas antes da troca, em qualquer
> dispositivo — deixam de funcionar. A pessoa (ou qualquer invasor que
> tivesse conseguido acesso antes) precisa logar de novo com a senha nova.

### Problem

Answer to mandatory question 2 — *"Qual problema objetivamente ela
resolve?"* — recorded verbatim (Portuguese) as given by the user:

> O mecanismo de revogação hoje existe só por token individual (jti →
> revogado no Redis, via TokenRevocationService) — funciona pra "essa
> sessão específica" (logout()), mas não existe forma de revogar "todas as
> sessões deste usuário". Investigação confirmou: se alguém obtiver a
> senha temporária de um psicólogo antes do dono legítimo conseguir logar
> (cenário real dado que a senha é repassada via WhatsApp), essa pessoa
> mantém acesso válido por até 7 dias mesmo depois do dono trocar a senha —
> a troca de senha hoje não invalida nada além da própria requisição que a
> fez.

### Solution and trade-offs

Answer to mandatory question 3 — *"Qual a solução esperada e quais
trade-offs ela envolve?"* — recorded verbatim (Portuguese) as given by the
user:

> Campo novo no User schema: tokensValidosApartirDe: Date, atualizado toda
> vez que a senha muda (não só na troca obrigatória — em qualquer troca de
> senha, se existir outro fluxo no futuro). Checagem: em toda validação de
> access token E de refresh token, comparar o iat (issued-at) do JWT contra
> tokensValidosApartirDe do usuário — se o token foi emitido antes dessa
> data, é rejeitado, mesmo com assinatura válida e não estando na blocklist
> do Redis.
>
> Trade-off de custo: isso exige carregar o User do banco a cada validação
> de token pra comparar a data — mas validateAccessPayload já faz esse
> findById hoje (mesma constatação já usada pra justificar o guard de
> gates sem round-trip extra). Pro refresh token, precisa confirmar se o
> fluxo de refresh já carrega o User também, ou se essa seria uma consulta
> nova ali.
>
> Escopo: aplica a todo usuário, não só os criados por onboarding — é
> comportamento de segurança geral do sistema (trocar senha sempre devia
> derrubar sessões antigas, universalmente). Não invalida no logout comum
> — isso já é coberto pelo mecanismo de jti existente; esta feature é
> especificamente sobre troca de senha.

**Investigation note (2026-09-11) — resolving the open cost question in the
answer above.** Both check points already load the full `User` before this
feature's comparison would run:

- `AuthService.refresh()` already calls `this.users.findById(payload.sub)`
  to check `user.ativo` before issuing new tokens.
- `AuthService.validateAccessPayload()` already calls the same `findById`,
  with an existing code comment documenting the same zero-round-trip
  reasoning for `deveTrocarSenha`/`termosAceitos`.

So the cost trade-off resolves to **zero extra round-trips on either path**
— confirmed, not assumed. The one real (small) addition is typing: `iat`
needs to be added to `AuthTokenPayload` (see *Depends on*).

### Flow (given/when/then)

Behavioural flow, derived by the agent from the four answers above (no
method names, no framework syntax).

**Password changed**

- **Given** a user who successfully completes any password-change flow
  (today, only the mandatory temporary-password change; any future
  self-service change flow inherits this too)
- **When** the new password hash is persisted
- **Then** `tokensValidosApartirDe` is stamped with the current time on that
  same user record

**Stale token rejected**

- **Given** a user whose `tokensValidosApartirDe` is set
- **When** a request presents an access token or a refresh token whose
  issued-at predates `tokensValidosApartirDe`
- **Then** the token is rejected — even though its signature is valid and
  it is not on the Redis revocation blocklist — and the request is treated
  as unauthenticated

**Fresh token accepted**

- **Given** the same user, now signing in again with the new password
- **When** the new access/refresh token pair is issued
- **Then** its issued-at is at or after `tokensValidosApartirDe`, and every
  subsequent validation on that pair succeeds normally

**Existing / unaffected users (regression guard)**

- **Given** a user who has never changed their password since this feature
  shipped (`tokensValidosApartirDe` absent or null)
- **When** they authenticate with any valid, non-revoked token
- **Then** validation succeeds normally — absence of the field must never
  be interpreted as a rejection condition (see the acceptance criterion
  below; this is the single most consequential edge case in this feature)

### Error cases (explicit, not left implicit)

- Persisting `tokensValidosApartirDe` fails during a password change → the
  password-change write itself must not be reported as successful while
  this stamp is missing; the two must be consistent (same failure-handling
  discipline as the rest of the auth-gate persistence path in
  `feature-forced-password-change`)
- `tokensValidosApartirDe` is absent/null → **must never** be treated as
  "token predates an infinitely-in-the-past cutoff" (i.e. always rejected);
  it means "no password change has ever invalidated a session for this
  user", i.e. always valid on this check
- A token without a readable `iat` claim reaches this check (should not
  happen with tokens issued by this system, but a malformed/foreign token
  could lack it) → treated as failing the freshness check, not as passing
  it by default
- A mass, sudden spike in legitimate users being rejected as stale-session,
  especially right after a deploy → this is the sign-inversion failure mode
  named in the acceptance criteria and monitoring sections below; the fix
  is rollback (revert + redeploy), which stops new false rejections
  immediately but does not undo the forced re-authentication already
  suffered by users caught in that window

### Acceptance criteria (what proves it is done)

- [ ] **Test (named explicitly, not just a note in prose): an existing user
  whose `tokensValidosApartirDe` is absent/null validates normally on both
  the access-token and the refresh-token checks — it must never be compared
  against `undefined`/`null` as a rejection condition.** A default in the
  wrong direction locks out every user in the system, including super
  admins, at deploy time — the same class of sign-inversion bug already
  seen in this session (the password generator, the host parser).
- [ ] Test: a token whose `iat` predates the user's `tokensValidosApartirDe`
  is rejected on the access-token check
- [ ] Test: a token whose `iat` predates the user's `tokensValidosApartirDe`
  is rejected on the refresh-token check
- [ ] Test: a token issued after the password change (iat ≥
  `tokensValidosApartirDe`) is accepted on both checks
- [ ] Test: a successful password change stamps `tokensValidosApartirDe`
  with the current time
- [ ] Test: a failed password-change attempt (e.g. rejected by
  `trocarSenhaObrigatoria`'s own validation) does not stamp the field
- [ ] Test: the Redis `jti` revocation check (existing mechanism) and the
  `tokensValidosApartirDe` check (this feature) are independent — either
  one failing is sufficient to reject a token; neither masks the other
- [ ] Test: a rejection caused specifically by this check emits the
  `token_rejected_stale_session` structured event (see *Monitoring*),
  distinguishable from a rejection caused by `jti` revocation or an invalid
  signature

### Rollback

Additive change, same simple-rollback category already accepted for the
two sibling features — no new infrastructure to undo. `tokensValidosApartirDe`
is one more field on the `User` document; reverting the code (redeploy the
previous image) makes both check points stop reading it, and any values
already written stay inert and harmless. No cleanup migration is required;
re-shipping the feature later picks up any values written while it was
active.

The rollback trigger that matters here is not "an obvious bug shipped" —
it is the inverse of the acceptance criterion fixed above: if a deploy
ships with the sign inverted (absence treated as invalid) and that is only
noticed after a wave of users has already been forced to log in again,
reverting stops new false rejections immediately, but it does not undo the
inconvenience already inflicted on users caught in that window. That
failure mode — an abnormal, sudden rate of legitimate users rejected as
stale-session — is exactly what monitoring below exists to catch fast
enough to shrink that window, not something the rollback mechanic itself
can address.

### Monitoring

A rejection caused by this check is **not**, by itself, a sign of a bug —
it is the feature working as intended (e.g. a user with a second device
still logged in after changing their password elsewhere). The anomaly
signal is the **rate**: a single user hitting this is normal; a sudden
spike across many different users at once, especially right after a
deploy, is the sign-inversion failure mode described in *Rollback*.

This needs a structured event distinguishable from other auth rejections
by name, the same pattern already used in this session to separate
`notification_trigger_failed` from `notification_data_enrichment_failed`:
a dedicated `event: 'token_rejected_stale_session'`, emitted at the point
of rejection in `validateAccessPayload()` / `verifyRefreshToken()`, carrying
enough to spot a pattern (`userId`/`sub`, `typ`) without logging sensitive
data.

Same decision already made for the two sibling features: **structured log
+ audit_logs, no automated alert channel** — that channel does not exist in
the project yet; it is infrastructure debt of the project, not of this
feature. What this feature is accountable for is honest visibility: the
event name must be specific enough that a manual log review right after a
deploy can spot the spike without hunting through unrelated auth
rejections. A numeric alert threshold is explicitly out of scope until an
alerting channel exists.

### Example / context

Answer to mandatory question 4 — *"Qual exemplo ou contexto concreto temos
do problema e da solução?"* — recorded verbatim (Portuguese) as given by
the user:

> Motivado pela investigação da troca de senha obrigatória desta mesma
> sessão: confirmamos que o mecanismo de revogação existente
> (TokenRevocationService, por jti) não cobre o cenário de "invalidar
> todas as outras sessões", só a sessão que fez a própria ação. Sem isso,
> uma senha temporária vazada via WhatsApp mantém uma janela de exposição
> de até 7 dias mesmo depois da vítima legítima trocar a senha.

### Suggested Design Patterns (Gang of Four)

- **None proposed.** Unlike the two sibling features — which use Chain of
  Responsibility to model an ordered sequence of post-login screens — this
  feature adds no screen to any sequence. It rejects a token at
  authentication time; structurally it is one more guard clause alongside
  the checks `validateAccessPayload()` and `verifyRefreshToken()` already
  perform (`typ !== 'access'`, `isRevoked(jti)`). A Specification-style
  encapsulation of these three short predicates was considered and
  discarded: they read clearly as plain conditionals in a small function
  today, and wrapping them in Specification objects would add indirection
  without a real payoff — pattern-shopping for a problem that is not there.
