## Feature: no recording, concluding or attendance document for an appointment that has not happened yet

### Depends on
- `ProntuariosService.create` (record anchored on the appointment, #52) and `AgendamentosService.conclude`.
- `DocumentosEmitidosService` (declaration and certificate of attendance, #50).
- The audit log (`AuditEvent`).

### Description

Answer to mandatory question 1 — *"Como você descreve a feature?"* — recorded verbatim (Portuguese) as given by the user:

> o servidor recusa registrar, concluir ou emitir documento de comparecimento para atendimento que ainda não começou (ou, na declaração, que ainda não terminou).

### Problem

Answer to mandatory question 2 — *"Qual problema objetivamente ela resolve?"* — recorded verbatim (Portuguese):

> declaração (14:00 às 14:50) e atestado foram emitidos com registros assinados às 13:49 e 13:53, afirmando presença que ainda não tinha acontecido.

### Solution and trade-offs

Answer to mandatory question 3 — *"Qual a solução esperada e quais trade-offs ela envolve?"* — recorded verbatim (Portuguese):

> 422 no servidor; quem precisa registrar um atendimento fora do horário ajusta o horário do agendamento, e essa edição passa a ser auditada.

Rules decided by the user (2026-10-27):

1. `ProntuariosService.create` and `AgendamentosService.conclude`: `dataHoraInicio <= now`, otherwise 422 "O atendimento ainda não começou."
2. Certificate (atestado): `dataHoraInicio <= now`, otherwise the same 422 (it states the attendance at a time).
3. Declaration: `dataHoraFim <= now`, otherwise 422 "O atendimento ainda não terminou." (it states the whole interval).
4. The session-record screen stops listing future appointments as recordable.
5. Changing `dataHoraInicio` or `dataHoraFim` of an appointment writes an audit event with who, when, the previous value and
   the new one. Without it a psychologist could bypass the rule by editing the time.

### Flow (given/when/then)
- **Given** an appointment that starts in the future **When** the psychologist records it, or it is concluded, or a certificate is issued **Then** 422.
- **Given** an appointment that has started but not ended **When** a declaration is issued **Then** 422 "O atendimento ainda não terminou."
- **Given** an appointment whose time is edited **Then** an `APPOINTMENT_TIME_CHANGED` audit event holds the previous and new values.

### Error cases
- Future start → 422 (record, conclude, certificate). Not ended → 422 (declaration). The appointment is not changed.

### Acceptance criteria
- [ ] Test: record creation for a future appointment → 422, nothing created, appointment not concluded
- [ ] Test: conclude for a future appointment → 422
- [ ] Test: certificate for a future start → 422; declaration before the end → 422; both pass after the time
- [ ] Test: editing start or end writes the audit event with previous and new values; editing other fields does not
- [ ] Test: the record screen does not list future appointments as recordable

### Example / context

Answer to mandatory question 4 — *"Qual exemplo ou contexto concreto temos do problema?"* — recorded verbatim (Portuguese):

> agendamento de 27/10/2026 às 14:00, documentos emitidos às 13:55.
