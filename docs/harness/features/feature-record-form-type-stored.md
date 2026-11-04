## Feature: The appointment defines the record form; the record stores which form was used; screen and PDF render by it

### Depends on

- `AtendimentoPsicologicoPage` (`RegistroSessao`): the session record form (complete = initial assessment, follow-up = short).
- `TipoAgendamento` (`avaliacao_psicologica` / `sessao_psicoterapia`) on the appointment.
- `lib/registroPsicologico.ts` (shared labels/order, introduced with the CRP feature) and the print page / reading dialog.
- `feature-clinical-record-crp-stamped-by-server.md` (previous PR: the form used is inferred until this feature stores it).
- BUG-026 in `docs/levantamento-sistema/BUGS-ENCONTRADOS.md`.

### Description

Answer to mandatory question 1 — *"Como você descreve a feature?"* — recorded verbatim (Portuguese) as given by the user:

> O agendamento define qual formulário abre, o registro grava qual foi usado, tela e PDF renderizam por ele.

### Problem

Answer to mandatory question 2 — *"Qual problema objetivamente ela resolve?"* — recorded verbatim (Portuguese):

> Hoje a escolha ignora o tipo do agendamento e depende de existir algum registro anterior; um seguimento agendado abriu o
> formulário completo.

### Solution and trade-offs

Answer to mandatory question 3 — *"Qual a solução esperada e quais trade-offs ela envolve?"* — recorded verbatim
(Portuguese):

> Tipo no agendamento, validado no servidor, com seletor visível para corrigir; custo: o padrão do "Novo agendamento" passa
> a ser calculado.

Decisions taken by the user while the design was presented (2026-10-26):

1. The appointment type already exists (`avaliacao_psicologica` / `sessao_psicoterapia`); it is the source of the DEFAULT form:
   assessment → complete form, session → follow-up form.
2. The record stores the form actually used (`formulario`: `completo` | `seguimento`), validated by the server; required when the
   record is a psychotherapy record. Screen and PDF render by the stored value. Legacy records (no stored value) keep the
   inference of the previous PR.
3. A selector at the top of the form lets the psychologist correct the form before saving (it replaces the hidden "Abrir
   prontuário completo" button).
4. "Novo agendamento" (Atendimento Psicológico) no longer defaults to "Avaliação Psicológica": the default is computed from
   the patient: no signed psychotherapy record → assessment; otherwise → session. The psychologist can still change it.
5. If the appointment has no type (old data), the form default falls back to the history-based rule (no signed record → complete).

### Flow (given/when/then)

- **Given** an appointment of type "Sessão de Psicoterapia"
- **When** the psychologist opens the record, even if the patient has no earlier record
- **Then** the FOLLOW-UP form opens (and "Avaliação Psicológica" opens the COMPLETE form), with a selector at the top showing and
  allowing to change the form.

- **When** the record is saved
- **Then** the payload carries `formulario`; the server validates it and stores it on the record; the print and the reading
  dialog render the fields of THAT form (empty ones as "Não preenchido"), and the heading says which form it is.

### Error cases (explicit, not left implicit)

- Missing or invalid `formulario` on a psychotherapy record → 400 (validation).
- Content stored outside the stored form (ex.: a complete-only field in a follow-up record) is never hidden: it prints after
  the form's fields, with its label.
- Records created before this feature have no `formulario`: nothing is rewritten; they render by inference.

### Acceptance criteria (what proves it is done)

- [ ] Test: an appointment of type session opens the follow-up form even with an empty history; an assessment opens the complete form even with history
- [ ] Test: the selector is visible at the top and switches the form
- [ ] Test: the saved payload carries `formulario`
- [ ] Test: the server stores `formulario`, refuses an invalid or missing value for psychotherapy, and the stored value is part of the signed hash
- [ ] Test: print and reading dialog render by the stored form, and show the form name
- [ ] Test: the default type of "Novo agendamento" is computed from the signed history of the chosen patient

### Example / context

Answer to mandatory question 4 — *"Qual exemplo ou contexto concreto temos do problema?"* — recorded verbatim
(Portuguese):

> Seguimento agendado em 25/10 que abriu a avaliação completa.
