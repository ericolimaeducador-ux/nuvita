## Feature: Account Recovery (forgot password)

### Depends on

Feature files:

- [[feature-session-revocation-on-password-change]] — completing a reset must
  revoke every active session; this feature must stamp `tokensValidosApartirDe`
  through the mechanism defined there.
- [[feature-forced-password-change]] — a reset is a second password-change path;
  it must leave `deveTrocarSenha` in a consistent state.

Code-level surfaces (not feature files): `AuthService`, `User` schema,
`AuditEvent`, `LoginRateLimiterService` / Redis, the Resend e-mail provider
already used by notifications.

Reference implementation (behavioral reference only, not authoritative): the
`nuvita` repository, commit `c7eef80`.

### Description

Verbatim answer from the user (question 1):

> Qualquer usuário do nuvita-psi (SUPER_ADMIN, ADMIN, PSICOLOGO, SECRETARIA) que esquecer a senha pode solicitar redefinição via link enviado ao e-mail cadastrado, sem precisar de intervenção manual. "Esqueci login" não é um fluxo self-service — a tela de login orienta o usuário a contatar o administrador da clínica, que pode consultar o e-mail cadastrado de qualquer usuário sob sua gestão.

### Problem

Verbatim answer from the user (question 2):

> Hoje não existe fluxo de "esqueci minha senha" no login do nuvita-psi. Um usuário travado fora da conta depende de intervenção manual de um SUPER_ADMIN (via ferramenta administrativa), o que é inviável para psicólogos autônomos sem suporte técnico disponível fora do horário comercial, e cria fricção desnecessária mesmo quando há administrador disponível.

### Solution and trade-offs

Verbatim answer from the user (question 3):

> - Canal: e-mail exclusivamente (via Resend, já usado no sistema para outras notificações).
> - Token de redefinição: validade de 1 hora (mesmo padrão já adotado no nuvita/Urologia, para consistência entre produtos), de uso único, invalidado após o primeiro uso ou expiração.
> - Mensagem de resposta sempre genérica ("se esse e-mail existir em nossa base, você receberá um link") — nunca confirma ou nega a existência da conta, para não permitir enumeração.
> - Ao completar a redefinição, TODAS as sessões ativas do usuário são encerradas (revogação de refresh tokens), sem exceção — isso corrige uma lacuna já identificada no fluxo de reset do super-admin, que hoje não faz isso.
> - 2FA: a redefinição de senha NÃO reseta nem exige reconfiguração do TOTP — são segredos independentes. Perda do dispositivo autenticador (TOTP) é um problema diferente, tratado como funcionalidade separada, fora deste escopo.
> - Trade-off aceito: "esqueci login" não é automatizado — exige contato com administrador da clínica, para evitar risco de enumeração de contas. A tela de login deve exibir essa orientação claramente (ex.: "Não lembra o e-mail cadastrado? Entre em contato com o administrador da sua clínica.").

### Flow (given/when/then)

- Given a user on the login screen who forgot the password
- When they request a reset with an e-mail address
- Then the API always answers with the same generic message and, only if the account exists and is active, e-mails a single-use link valid for 1 hour

- Given a valid, unexpired, unused token
- When the user submits a new password (minimum 10 characters, same policy as the rest of the system)
- Then the password is replaced, the token is consumed, all sessions of the user are revoked, and an audit event is recorded

- Given a user with 2FA (SUPER_ADMIN, ADMIN, PSICOLOGO)
- When they log in after the reset
- Then the existing TOTP secret is still required and unchanged

- Given the login screen
- When the user does not remember the registered e-mail
- Then the screen shows the instruction to contact the clinic administrator (no self-service flow)

### Error cases (explicit, not left implicit)

- Unknown, inactive or malformed e-mail → same generic response as success; nothing is sent.
- Expired, already used or unknown token → rejected with a generic invalid-token error; the password is not changed.
- Repeated requests for the same e-mail or from the same IP → rate limited (exact limits to be defined in the design doc).
- E-mail provider failure → the API still returns the generic response and logs a structured error; the reset request must not leak the failure to the caller.
- New password below the policy → validation error; the token is not consumed.

### Acceptance criteria (what proves it is done)

- [ ] Test: requesting a reset for an existing and a non-existing e-mail returns an identical response body and status.
- [ ] Test: a token works exactly once and stops working after 1 hour.
- [ ] Test: after a successful reset, an access token and a refresh token issued before it are rejected.
- [ ] Test: a reset does not modify or clear the user's TOTP secret.
- [ ] Test: an invalid or expired token does not change the password.
- [ ] Test: the audit trail records the request and the completion without storing the token or the password.
- [ ] Test: the login screen shows the "contact the clinic administrator" guidance.

### Example / context

Verbatim answer from the user (question 4):

> Uma psicóloga autônoma esquece a senha numa segunda de manhã, antes da primeira consulta. Ela clica em "Esqueci minha senha" na tela de login, recebe um e-mail com link válido por 1 hora, define uma nova senha, é desconectada de qualquer sessão antiga (ex.: um celular onde tinha ficado logada), e confirma o acesso com o código do autenticador (2FA) que já tinha configurado — sem precisar contatar suporte.

### Suggested Design Patterns (Gang of Four)

- Strategy — e-mail delivery behind a port, so the provider can be swapped or faked in tests.
- Facade — a single `AccountRecoveryService` hiding token issuing, validation, e-mailing and session revocation from the controller.
