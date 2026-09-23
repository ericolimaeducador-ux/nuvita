## Feature: Patient Identity Correction (SUPER_ADMIN)

### Depends on

Feature files:

- [[feature-tickets-superadmin]] — the ticket is the usual origin of a
  correction request. This feature must accept a reference to the originating
  ticket, but it also works without a ticket (the SUPER_ADMIN may be the
  requester). Build order: this feature first, the ticket link is optional
  until the ticket feature exists.

Code-level surfaces (not feature files): `PacientesService.update()`,
`PacienteRepository`, the patient field-level encryption service, `AuditEvent`,
`traduzirCpfDuplicado()` (existing unique index `{clinicaId, cpfHash}`), the
signed-record addendum pattern in `prontuarios.service.ts`.

### Description

Verbatim answer from the user (question 1):

> Apenas o SUPER_ADMIN pode alterar Nome, CPF e Data de Nascimento de um paciente já cadastrado. Toda alteração exige justificativa de quem solicitou a mudança (não necessariamente quem executa — o SUPER_ADMIN pode estar executando a pedido de outro usuário, via ticket). A versão anterior do dado é preservada, nunca sobrescrita silenciosamente.

### Problem

Verbatim answer from the user (question 2):

> Hoje, pacientes.update sobrescreve esses campos diretamente, sem exigir justificativa nem preservar o valor anterior — e qualquer usuário com permissão de editar paciente pode alterar dado de identidade sem controle extra. Erros de digitação no cadastro inicial (CPF trocado, nome com erro, data de nascimento errada) são reais e acontecem, mas hoje não há trilha de quem pediu a correção, por quê, nem preservação do valor anterior — o que viola o requisito de integridade (NGS1.12) e dificulta investigar um erro histórico.

### Solution and trade-offs

Verbatim answer from the user (question 3):

> - Nome, CPF e Data de Nascimento passam a ser editáveis somente por SUPER_ADMIN — remove essa capacidade de PSICOLOGO/SECRETARIA/ADMIN no fluxo normal de edição de paciente (os demais campos continuam editáveis normalmente por quem já tem permissão).
> - Toda alteração desses 3 campos exige: (a) justificativa de texto, (b) identificação de quem solicitou (pode ser o próprio SUPER_ADMIN, ou uma referência ao ticket de origem — ver Feature tickets-superadmin), (c) quem executou (sempre o SUPER_ADMIN autenticado), (d) timestamp do servidor.
> - O valor anterior é preservado (nova versão, não sobrescrita), consistente com o padrão já usado em prontuarios.service.ts para correção de registro assinado.
> - Trade-off aceito: isso adiciona fricção — mesmo um erro trivial de digitação exige acionar o SUPER_ADMIN, não pode ser autocorrigido pelo psicólogo/secretária. Isso é intencional: esses 3 campos são os que mais importam para identidade legal do paciente (CPF é usado, inclusive, na regra de bloqueio de duplicidade já existente).

Design decisions derived by the agent and **pending user confirmation**
(not part of the verbatim answers):

1. The normal edit flow (`update()`) rejects with 403 any request that
   *changes* nome, cpf or dataNascimento (a field sent with a value equal to
   the stored one is not a change), for every role including SUPER_ADMIN, who
   must use the dedicated correction operation so the justification is never
   skipped.
2. The correction is a dedicated operation (`corrigirIdentidade`) reachable
   only by SUPER_ADMIN, acting inside the clinic selected via the existing
   `x-clinica-id` mechanism.
3. Requester identification: optional `ticketId` and optional
   `solicitanteUserId`; when neither is given the requester is the executor.
4. The audit trail records only ids and field *names*, never the old or new
   values nor the free-text justification (NGS1 audit rule: no
   identification/clinical data inside the log). Old values, new values and
   the justification live in the encrypted version record.

### Flow (given/when/then)

- Given a SECRETARIA, PSICOLOGO or ADMIN editing a patient
- When the request changes nome, cpf or dataNascimento
- Then it is rejected with 403 and nothing is written; other fields still update normally

- Given a SUPER_ADMIN correcting identity data
- When they submit at least one of nome/cpf/dataNascimento with a non-empty justification
- Then the previous values are preserved as a version record, the patient is updated, and the record carries requester, executor (the authenticated SUPER_ADMIN) and a server-generated timestamp

### Error cases (explicit, not left implicit)

- Caller is not SUPER_ADMIN → 403, nothing written.
- Justification missing, empty or whitespace-only → 400, nothing written.
- No identity field to correct → 400.
- New CPF already used by another patient of the clinic → 409 with the existing duplicate-CPF message; nothing written.
- Patient not found in the tenant → 404.
- Failure while preserving the previous version → the correction must not be applied (no silent overwrite).

### Acceptance criteria (what proves it is done)

- [ ] Test: update() by SECRETARIA/PSICOLOGO/ADMIN that changes nome, cpf or dataNascimento → 403, repository not called.
- [ ] Test: update() that only sends unchanged identity values plus other fields still succeeds.
- [ ] Test: corrigirIdentidade by any non-SUPER_ADMIN role → 403.
- [ ] Test: missing/blank justification → 400, repository not called.
- [ ] Test: successful correction stores previous values, requester, executor and a server timestamp, and never goes through the plain overwrite path.
- [ ] Test: audit metadata contains no old/new value and no justification text.
- [ ] Test: duplicate new CPF → 409.

### Example / context

Verbatim answer from the user (question 4):

> A secretária percebe que digitou o CPF do paciente errado no cadastro (um dígito trocado). Ela não tem mais permissão para corrigir isso sozinha — abre um ticket para o SUPER_ADMIN explicando o erro. O SUPER_ADMIN corrige o CPF, com a justificativa do ticket vinculada à alteração, e o CPF anterior (errado) fica registrado como versão anterior, não apagado.

### Suggested Design Patterns (Gang of Four)

- Memento — the preserved previous state of the identity fields.
- Command — the correction as an explicit, auditable operation with requester/executor/justification.
