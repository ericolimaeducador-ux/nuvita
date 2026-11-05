## Feature: the agenda refuses overlapping appointments of the same professional

### Depends on
- `AgendamentosService.create` / `update` and the `AgendamentoRepository` port.
- BUG-028 in `docs/levantamento-sistema/BUGS-ENCONTRADOS.md`; #52 (BUG-022) only prevents two records for the SAME appointment.

### Description

Answer to mandatory question 1 — *"Como você descreve a feature?"* — recorded verbatim (Portuguese) as given by the user:

> o servidor recusa agendamento do mesmo profissional que se sobreponha a um atendimento ativo (agendado, confirmado ou concluído), na criação e na edição, e recusa fim <= início.

### Problem

Answer to mandatory question 2 — *"Qual problema objetivamente ela resolve?"* — recorded verbatim (Portuguese):

> a agenda aceitou dois agendamentos do mesmo profissional e paciente às 14:00, o que gera ciclo de cobrança duplicado, dois prontuários para a mesma hora e declaração emitida duas vezes.

### Solution and trade-offs

Answer to mandatory question 3 — *"Qual a solução esperada e quais trade-offs ela envolve?"* — recorded verbatim (Portuguese):

> 409 no servidor, intervalos que encostam não contam; sem encaixe (o psicólogo remarca); bloqueios de agenda e concorrência ficam para depois do beta.

Decisions taken by the user (2026-10-27):
1. Per professional (`medicoId`); the patient does not matter. All roles, secretary included (the rule is the server's).
2. Active appointments count: `agendado`, `confirmado` and `concluido`. `cancelado` and `falta` free the slot.
3. Overlap means `inicioA < fimB && inicioB < fimA`; touching intervals (end 14:50, start 14:50) do not overlap.
4. 409 "Você já tem atendimento neste horário" on create and on update (an update excludes the appointment itself and only checks when
   professional, start or end change, and only while the appointment is active).
5. `dataHoraFim <= dataHoraInicio` answers 400, on create and update.
6. No "encaixe" (squeeze-in). Agenda blocks (`bloqueios`) are OUT of this rule; concurrency (two simultaneous requests) is post-beta. Both are recorded in PROGRESS.
7. Existing overlaps are not corrected.

### Flow (given/when/then)
- **Given** a professional with an active appointment 14:00–14:50 **When** an appointment for the same professional at 14:30–15:20 is created or moved there **Then** 409.
- **Given** the same appointment cancelled or marked as a no-show **Then** the slot is free.
- **Given** 14:50–15:40 **Then** accepted (touching).

### Error cases
- Overlap → 409. End not after start → 400. Nothing is created or changed.

### Acceptance criteria
- [ ] Test: create overlapping an `agendado`/`confirmado`/`concluido` → 409; touching → ok; against `cancelado`/`falta` → ok; another professional → ok
- [ ] Test: update that moves into an overlap → 409; update that does not touch time/professional does not check; the appointment does not collide with itself
- [ ] Test: `fim <= inicio` → 400 on create and update
- [ ] Test: the Mongo query uses the strict overlap condition and the active statuses

### Example / context

Answer to mandatory question 4 — *"Qual exemplo ou contexto concreto temos do problema?"* — recorded verbatim (Portuguese):

> agendamentos de teste de 27/10/2026 às 14:00.
