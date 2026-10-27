## Feature: Signed-only session count for the billing cycle (and a two-case cycle alert)

### Depends on

- The psychologist's billing panel (`PsicologiaFinanceiroService.painel`, `StatusCiclo`, `SESSOES_POR_CICLO = 4`): the
  cycle is pre-paid, sessions are counted from the medical records of psychotherapy.
- The medical-record signature (`Prontuario.assinado`, set by `sign`): the act that closes the clinical record.
- BUG-020/021/022 (record anchored to the agenda, one record per appointment): same family, "the number of sessions does
  not match what happened".
- BUG-025 in `docs/levantamento-sistema/BUGS-ENCONTRADOS.md` (the investigation that led here).

### Description

Answer to mandatory question 1 — *"Como você descreve a feature?"* — recorded verbatim (Portuguese) as given by the user:

> O contador de sessões do ciclo de cobrança passa a considerar apenas prontuários assinados, e o alerta do painel passa a
> distinguir "ciclo fechado, renovar" de "sem cobrança no ciclo atual".

### Problem

Answer to mandatory question 2 — *"Qual problema objetivamente ela resolve?"* — recorded verbatim (Portuguese):

> Hoje qualquer prontuário de psicoterapia conta como sessão, rascunho incluído. Um rascunho vira "sessão 1", adianta o
> ciclo de cobrança e infla o "N sessões" que o laudo afirma a terceiros. Em paralelo, a mesma frase de alerta cobre dois
> casos diferentes, e a versão errada ("fechou o ciclo, hora de renovar") pode levar a uma cobrança sobre quem nunca
> completou um ciclo. É a mesma família do BUG-022: o número de sessões não corresponde ao que aconteceu.

### Solution and trade-offs

Answer to mandatory question 3 — *"Qual a solução esperada e quais trade-offs ela envolve?"* — recorded verbatim
(Portuguese):

> Contar só o que tem assinatura, porque a assinatura é o ato que fecha o registro clínico; rascunho é trabalho em
> andamento. O servidor passa a devolver as duas contagens separadas, em vez de a tela decidir. Trade-off: onde rascunhos
> já inflaram a contagem, o ciclo exibido recua, e uma cobrança adiantada que já exista continua válida, bloqueando o
> botão até ser cancelada. Nada de dado financeiro é reescrito. Hoje só há dado de demonstração em produção, então o
> impacto real é nulo — e é exatamente por isso que a correção entra antes de 29/10.

Decisions taken by the user while the design was presented (2026-10-25):

1. A patient who has only drafts **appears** in the panel, with 0 sessions. Disappearing is worse: the psychologist has
   started attending and has an open draft, and the patient would vanish from the financial screen.
2. `RegistroSessao` (first consultation × follow-up) is **in the same PR**: it is the same defect (a draft treated as a
   session). Two different criteria for the same question is how these bugs are born.

### Flow (given/when/then)

- **Given** a patient with N psychotherapy records of which S are signed
- **When** the billing panel is computed
- **Then** `sessoesRealizadas = S`; `cicloAtual = floor(S / 4) + 1`; `sessoesNoCiclo = S mod 4`. The first/last session
  dates are those of the signed records. A patient with records but S = 0 still gets a row (0 sessions).

- **Given** a patient whose current cycle has no charge
- **When** the panel classifies the patient
  - `S > 0` and `sessoesNoCiclo = 0` (a multiple of 4 was just completed) → **cycle closed, renew**
  - any other case (cycle in progress, or S = 0 with an open draft) → **no charge in the current cycle**
- **Then** the server returns `ciclosFechadosARenovar` and `ciclosSemCobranca` separately; `ciclosACobrar` stays and is
  their sum (no consumer breaks).

- **Given** the dashboard and the financial screen
- **Then** each sentence shows only when its own count is greater than zero (both can show together):
  - renew: "Um paciente fechou o ciclo de 4 sessões — hora de renovar o pagamento." / "N pacientes fecharam o ciclo de 4
    sessões — hora de renovar o pagamento." (financial screen: "Um paciente fechou o ciclo e ainda não foi cobrado." /
    "N pacientes fecharam o ciclo e ainda não foram cobrados.")
  - no charge: "Um paciente está sem cobrança no ciclo atual." / "N pacientes estão sem cobrança no ciclo atual." (financial
    screen: "Um paciente está atendendo sem cobrança no ciclo atual." / "N pacientes estão atendendo sem cobrança no ciclo
    atual.")

- **Given** the registration form of a session (`RegistroSessao`)
- **Then** "first consultation" × "follow-up", the "N previous sessions" number, the first-consultation complaint and the
  pre-filled stable fields all come from the patient's SIGNED psychotherapy records only. A draft (including the draft of
  the very session being edited) never turns the form into a follow-up.

### Error cases (explicit, not left implicit)

- A draft is signed later → it counts from then on (not retroactively by date).
- A charge already issued for a cycle the patient is no longer in (because drafts stopped counting) is kept and stays
  valid; the "charge cycle N" action is refused ("already has a charge") until that charge is cancelled. No financial
  record is rewritten.
- Records of other types (not psychotherapy), of another professional or of another clinic never count (unchanged).

### Out of scope, reported (needs a decision)

- `ProntuariosService.resumoAcompanhamento` (the "since X, N sessions" that the laudo states to third parties) also counts
  drafts. It is the same defect, but its existing test fixtures are unsigned records, so changing it requires editing an
  existing test. Not touched here; reported to the user.

### Acceptance criteria (what proves it is done)

- [ ] Test: the sessions summary counts only records with a signature; a patient with only drafts still yields a row with
  total 0; first/last dates are those of signed records
- [ ] Test: the panel returns the two counts separately; `ciclosACobrar` is their sum
- [ ] Test: S = 4 with no charge for cycle 2 → renew; S = 1 with no charge → no charge; S = 0 with a draft → listed, no
  charge; S = 4 with cycle 2 charged → neither
- [ ] Test: dashboard and financial screen show each sentence only for its own count
- [ ] Test: `RegistroSessao` treats a draft-only history as "first consultation" and counts only signed records

### Example / context

Answer to mandatory question 4 — *"Qual exemplo ou contexto concreto temos do problema?"* — recorded verbatim
(Portuguese):

> No ambiente de ensaio, o paciente Bruno aparecia com "Ciclo 1 · 1/4 sessões" e, na mesma tela, o alerta "Um paciente
> fechou o ciclo de 4 sessões — hora de renovar o pagamento", enquanto "Atendimentos realizados" mostrava 0. A sessão
> contada era um rascunho sem assinatura.

### Amendment (2026-10-27) — the laudo's "since X, N sessions" counts only signed records too

The "Out of scope, reported" item above is now done, by the same decision (only a SIGNED record counts as a session).
`ProntuariosService.resumoAcompanhamento` — the facts the laudo states to third parties — counts only psychotherapy
records of the psychologist that are anchored on the agenda AND signed. A draft counts neither in the total nor in the
"since" date; with only drafts the answer is `{ desde: null, totalSessoes: 0 }`. No new feature doc: it is the same
decision, applied to the remaining place that still counted drafts. The existing fixtures in `prontuarios.ancora.spec.ts`
(unsigned records) were updated, with the user's explicit authorization, to be signed.
