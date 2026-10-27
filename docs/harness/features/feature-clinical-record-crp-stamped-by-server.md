## Feature: CRP stamped by the server on the signed clinical record (and one label set / order / "not filled" in the record)

### Depends on

- `ProntuariosService.sign` and the signed-record immutability (`Prontuario.assinado`).
- `user.crp`: the CRP of the psychologist's profile (filled once, corrected only by the super-admin). It is the single source.
- #50 (`DocumentosEmitidosService.emitirAtestado`): the server stamps the CRP from the profile and answers 422 without one.
  This feature applies the same criterion to the medical record.
- BUG-026 and BUG-027 in `docs/levantamento-sistema/BUGS-ENCONTRADOS.md` (the investigation that led here).

### Description

Answer to mandatory question 1 — *"Como você descreve a feature?"* — recorded verbatim (Portuguese) as given by the user:

> O servidor carimba o CRP do perfil no prontuário ao assinar.

### Problem

Answer to mandatory question 2 — *"Qual problema objetivamente ela resolve?"* — recorded verbatim (Portuguese):

> O corpo do registro aceita qualquer número de conselho, digitado ou pré-preenchido, e divergiu da assinatura no mesmo
> documento; no teste apareceu o COREN do Erico.

### Solution and trade-offs

Answer to mandatory question 3 — *"Qual a solução esperada e quais trade-offs ela envolve?"* — recorded verbatim
(Portuguese):

> Fonte única no servidor, 422 sem CRP; custo: toda conta precisa de CRP antes da primeira assinatura.

Decisions taken by the user while the design was presented (2026-10-26):

1. On signing, the server reads `user.crp` from the profile and stamps it in the signature (`assinado.crp`). The body field
   `registroPsicologico.crp` leaves the DTO and becomes read-only on screen (it shows the profile CRP).
2. Signing without a CRP in the profile answers **422** (same criterion as #50). A draft without CRP is still allowed.
3. `registroProfissional` stays as registration data only (the council number the super-admin types at account creation,
   any council). It never enters the clinical record and no longer pre-fills anything in it.
4. **No CRP format validation.** The format of a council number needs an official CFP source and does not go from memory.
   Only "not empty" is required. Format validation is recorded as PENDING, to be verified against an official source.
5. The account creation forms (super-admin and clinic admin) ask for the CRP when the role is psychologist; otherwise every
   psychologist would hit the 422 on the first signature. It is stored as `user.crp` at creation.
6. Old records are not rewritten. A legacy signed record has no `assinado.crp`: its print keeps today's behaviour.
7. In the same PR, the record screen/PDF gets one label set shared by the form, the reading dialog and the print; the PDF
   follows the order of the form; and the fields of the used form that stayed empty print "Não preenchido". Until the
   form type is stored in the record (the next PR), the "used form" is inferred: the complete form if any complete-only
   field is present, otherwise the follow-up form (the patient's line-specific fields + free notes).

### Flow (given/when/then)

- **Given** a psychologist whose profile has a CRP
- **When** they sign a draft
- **Then** the signature stores that CRP (`assinado.crp`), it is part of the signed hash payload, and the print shows it in
  the signature block, taken from the record and not from whoever is logged in.

- **Given** a psychologist without a CRP in the profile
- **When** they try to sign
- **Then** the server answers 422 ("Informe o CRP no seu perfil para assinar o prontuário.") and nothing is signed; the web
  blocks "Salvar e assinar" with the same message before creating a draft, and still allows "Salvar rascunho".

- **Given** the form of the session
- **Then** the CRP is shown read-only (profile value) and is never sent in the payload; a client that still sends
  `registroPsicologico.crp` is refused by the server (`forbidNonWhitelisted`).

- **Given** a super-admin or a clinic admin creating a psychologist
- **Then** the CRP is required (non-empty) and saved in the new account; creating a secretary or another role does not ask.

### Error cases (explicit, not left implicit)

- Profile without CRP → 422 on sign (draft allowed).
- The user cannot be loaded at sign time → fail closed (error, nothing signed).
- Record already signed → 409 (unchanged).

### Acceptance criteria (what proves it is done)

- [ ] Test: sign stamps the profile CRP into the signature and into the hash payload
- [ ] Test: sign without a CRP in the profile → 422 and the repository is not called
- [ ] Test: `registroPsicologico.crp` is refused by the DTO
- [ ] Test: creating a psychologist without CRP is refused (both services' DTOs); a secretary does not need one; the CRP is saved
- [ ] Test: the form shows the profile CRP read-only, never sends it, blocks "Salvar e assinar" without CRP (draft allowed)
- [ ] Test: the print shows the CRP of the record's signature; labels equal the form's; empty fields of the used form read
  "Não preenchido"
- [ ] Test: both creation forms ask for the CRP when the role is psychologist

### Example / context

Answer to mandatory question 4 — *"Qual exemplo ou contexto concreto temos do problema?"* — recorded verbatim
(Portuguese):

> PDF de 26/10 com "CRP: 0152482" no corpo e "CRP 5287723" na assinatura.
