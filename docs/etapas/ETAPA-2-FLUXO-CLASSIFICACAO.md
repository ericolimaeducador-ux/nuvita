# Stage 2 — Clinical-flow foundation + patient area classification

Branch: `estomaterapia/etapa2-fluxo-classificacao` (base: `estomaterapia/integracao`). Deploys remain disabled.
Reference code: the old Nuvita (`git show b908c02^1:<path>`).

## A. Area classification (new)

- `ClassificacaoArea` enum: `IU`, `FA`, `OT` (`packages/shared/src/paciente/classificacao.ts`, mirrored in `apps/web/src/types.ts`).
- Patient field `classificacoes: ClassificacaoArea[]` (several allowed). **At least one is required on create**
  (`CreatePacienteDto` `@ArrayNotEmpty/@ArrayUnique/@IsEnum each`, plus a service-level check). On PATCH it is optional, but if
  sent it cannot be empty.
- **Eligibility is derived, never stored**: `elegivelFluxoClinico(classificacoes)` = exactly one element and it is `IU`
  (shared function, mirrored in the web). No redundant boolean is persisted.
- Every change to `classificacoes` writes the audit event `PACIENTE_CLASSIFICACAO_ALTERADA` with `valorAnterior` / `valorNovo`
  (added to the `AuditEvent` enum, which is validated on write). Re-sending the same set (any order) writes nothing.
- No IU-derivations sub-field in this stage.

## B. Flow foundation (generic mechanics ported from the old Nuvita)

- `packages/shared/src/fluxo-clinico`: `EtapaFluxoClinico` (the 9 stages, names/values/order unchanged), `ORDEM_ETAPAS_FLUXO`,
  `PRAZO_DIAS_POR_ETAPA`, `podeAvancarPara`, `PROXIMA_ETAPA_MANUAL`, `PAPEIS_AVANCO_MANUAL`, `calcularPrazoEtapa`.
  Two deliberate deviations from the old file: (1) `podeAvancarPara` accepts an absent current stage (a patient that is not in the
  flow yet ranks before the first stage); (2) `PAPEIS_AVANCO_MANUAL` now lists `SECRETARIA` **and** `ENFERMEIRO`.
- Patient fields `etapaFluxo` (optional enum, **no schema default**) and `etapaFluxoDesde`; index `{ clinicaId, etapaFluxo, criadoEm }`.
- `PacientesService.avancarEtapaFluxo` is the **single mutation point** (through a private `aplicarEtapa`): writes
  `etapaFluxo` + `etapaFluxoDesde` and audits `PIPELINE_STAGE_CHANGED` (this event already existed in the enum). Same behaviour as the old
  code: forward-only by position, and errors are swallowed (logged, never thrown). New: it is a no-op for patients that are not eligible.
  **Nothing calls it yet** (no automatic trigger is ported; stages 3 and 4 will).
- `PacientesService.avancarEtapaManual` + `PATCH /pacientes/:id/fluxo/avancar`: next stage from `PROXIMA_ETAPA_MANUAL` only;
  400 when the stage does not allow manual advance or the patient is outside the flow; 403 when the role cannot close that stage.
  Allowed: ADMIN (always), SECRETARIA, ENFERMEIRO (and SUPER_ADMIN, who passes every role guard in the platform).
- On create: classification exactly `[IU]` => `etapaFluxo = AGUARDANDO_ATENDIMENTO` (+ `etapaFluxoDesde`); otherwise the field is absent.
- If an edit makes the patient stop being exactly `[IU]`, the stored `etapaFluxo` is **kept** (not cleared); the patient just leaves the flow list.
  If an edit makes a patient with no stage become exactly `[IU]`, it enters `AGUARDANDO_ATENDIMENTO` (through `avancarEtapaFluxo`).

## C. Web

- `FluxoClinicoPage` (`/fluxo-clinico`, module PACIENTES, menu "Fluxo Clínico"): stage filter, name search, stage chip, deadline badge.
  It requests `GET /pacientes?fluxoClinico=true`, so only eligible patients are listed. Clicking a row opens the patient detail
  (`FluxoPacientePage` is **not** ported; it depends on the step components of the stage 3/4 modules).
- Multi-select `ClassificacaoAreaSelector` (IU, FA, OT) in the patient create form and in the edit dialog; the detail page shows the
  classification and, when present, the stored stage ("fora do fluxo" if the patient is no longer eligible).
- Not ported: `ProgramaIUToggle`, the "jurídico" subtitle and other leftovers.

## D. Authorization

- New route `PATCH /pacientes/:id/fluxo/avancar` => `'AES'` in `authorization-matrix.expected.ts` (ADMIN, ENFERMEIRO, SECRETARIA; SUPER_ADMIN always).
- Flow list and classification changes use the existing `GET /pacientes`, `POST /pacientes`, `PATCH /pacientes/:id` (no new route; roles unchanged).
- Web route `/fluxo-clinico` added to the web route matrix (e2e `matriz-rotas`).

## E. Migration (written, NOT executed)

`scripts/migrar-etapa2-classificacao.mjs` — dry-run by default, `--apply` to write, idempotent. Sets `classificacoes = ['IU']` where missing/empty
(all current data is IU only), keeps any existing `etapaFluxo`, gives `AGUARDANDO_ATENDIMENTO` (`etapaFluxoDesde = criadoEm`) to eligible patients
without a stage, reports out-of-enum stages without touching them, and creates the new index (auto-index is off outside development).
Run it on the Phase 3 rehearsal database first.

## Pending / not in this stage

- Automatic triggers and the modules that fire them (avaliacao-iu, followup, checklist-documentos, laudo-medico, entregas, produtos) and the
  agenda types `ENTREVISTA` / `ATENDIMENTO_ENFERMAGEM`: stages 3 and 4.
- Patients without `classificacoes` (not migrated yet) are treated as not eligible, and the edit form asks for a classification before saving.
- The psi unique CPF index has no `ativo: true` in its partial filter (the old Nuvita had it): not changed here.
