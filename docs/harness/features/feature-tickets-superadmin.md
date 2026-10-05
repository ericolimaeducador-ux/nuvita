## Feature: Internal Tickets to SUPER_ADMIN (identity data correction only)

### Depends on

Feature files:

- [[feature-correcao-identidade-paciente]] — the ticket exists to request that
  correction; resolving a ticket executes it and links the change back to the
  ticket. Scope is deliberately restricted to that single ticket type.

Code-level surfaces (not feature files): patient detail screen, SUPER_ADMIN
page, `AuditEvent`, tenancy (`clinicaId`).

### Description

Verbatim answer from the user (question 1):

> Qualquer usuário autenticado (PSICOLOGO, SECRETARIA, ADMIN) pode abrir um ticket direcionado ao SUPER_ADMIN, vinculado a um paciente específico, solicitando correção de Nome/CPF/Data de Nascimento, com justificativa obrigatória. O SUPER_ADMIN visualiza os tickets pendentes numa aba própria e, ao atender, executa a correção (Feature correcao-identidade-paciente) referenciando o ticket de origem.

### Problem

Verbatim answer from the user (question 2):

> Não existe hoje nenhum canal dentro do sistema para um usuário sinalizar ao SUPER_ADMIN a necessidade de uma ação restrita (como a correção de identidade). Sem isso, a comunicação teria que acontecer fora do sistema (WhatsApp, e-mail), sem rastro formal dentro do próprio Nuvita-psi.

### Solution and trade-offs

Verbatim answer from the user (question 3):

> - Ticket contém: paciente referenciado, tipo (fixo por enquanto: "Correção de dados de identidade"), justificativa/descrição de texto, autor (quem abriu), status (aberto/atendido/recusado), timestamp de abertura e de resolução.
> - Aba visível só para SUPER_ADMIN, listando tickets abertos, com acesso ao paciente referenciado.
> - Ao SUPER_ADMIN atender um ticket, ele executa a correção (Feature correcao-identidade-paciente) e marca o ticket como atendido, com a alteração vinculada ao ticket (rastreabilidade completa: ticket → justificativa → alteração → versão anterior preservada).
> - SUPER_ADMIN também pode recusar um ticket (com motivo), caso julgue a solicitação inválida.
> - Trade-off aceito: escopo restrito a esse único tipo de solicitação por enquanto — não é um sistema de suporte genérico. Se surgir necessidade de outros tipos de ticket no futuro, isso é extensão de escopo, não retrabalho (o desenho de dados já comporta um campo "tipo").

Open points for the design doc (not decided here): whether the secretary sees
ticket status on the patient screen only or also in a list; retention of
ticket text, which may contain patient identification and therefore needs the
same protection as patient data.

### Flow (given/when/then)

- Given an authenticated PSICOLOGO, SECRETARIA or ADMIN viewing a patient
- When they open a ticket with a justification
- Then a ticket with status "open", author and server timestamp is created and appears to the SUPER_ADMIN

- Given an open ticket
- When the SUPER_ADMIN executes the correction referencing it
- Then the ticket becomes "attended", linked to the change, with resolution timestamp

- Given an open ticket
- When the SUPER_ADMIN refuses it with a reason
- Then the ticket becomes "refused" with the reason and resolution timestamp

### Error cases (explicit, not left implicit)

- Empty justification → 400.
- Patient outside the author's clinic → 404.
- Non-SUPER_ADMIN trying to list, attend or refuse → 403.
- Refusal without a reason → 400.
- Attending or refusing an already resolved ticket → 409.

### Acceptance criteria (what proves it is done)

- [ ] Test: any of the three roles can open a ticket; PACIENTE cannot.
- [ ] Test: justification is mandatory.
- [ ] Test: only SUPER_ADMIN lists open tickets and resolves them.
- [ ] Test: attending a ticket links the identity correction to it.
- [ ] Test: refusal requires a reason and stores it.
- [ ] Test: a resolved ticket cannot be resolved again.

### Example / context

Verbatim answer from the user (question 4):

> Mesmo cenário da Feature correcao-identidade-paciente: a secretária identifica o CPF errado, abre o ticket pela tela do paciente ("Solicitar correção de dados"), preenche a justificativa ("CPF digitado incorretamente no cadastro inicial, correto é XXX"), e o ticket aparece na aba do SUPER_ADMIN. Ele revisa, corrige o CPF, e o ticket é marcado como atendido — a secretária pode ver, na tela do paciente, que a correção foi feita.

### Suggested Design Patterns (Gang of Four)

- State — ticket lifecycle open / attended / refused with guarded transitions.
