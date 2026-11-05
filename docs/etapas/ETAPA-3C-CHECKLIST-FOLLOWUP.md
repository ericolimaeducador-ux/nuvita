# Stage 3c — Document checklist and follow-up

Ported from the old Nuvita (`b908c02^1`) into the psi base, re-wiring their triggers to the clinical flow
(`PacientesService.avancarEtapaFluxo`: forward-only, never throws, ignores patients not eligible for the flow, i.e.
`classificacoes` different from exactly `[IU]`).

## Triggers
| Action | Flow stage |
|---|---|
| Checklist item set to `recebido` and ALL (non-deleted) items of the patient are `recebido` | `AGUARDANDO_CONSULTA_MEDICA` |
| Follow-up created with `ELEGIVEL` | eligibility notification + `APTO_AGUARDANDO_CONTATO` |
| Follow-up created with `NAO_ELEGIVEL` | `NAO_ELEGIVEL` |
| Follow-up created with `EM_AVALIACAO` | no stage change |

A non-IU patient (e.g. `[FA]`, `[IU, FA]`, `[OT]`) still gets the item/follow-up recorded; the stage does NOT change
(covered by tests that use the real `PacientesService`).

## Access (authorization matrix; SUPER_ADMIN always passes, PACIENTE never)
- `checklist-documentos` (all 6 routes): ADMIN, ENFERMEIRO, SECRETARIA.
- `followup`: read routes (`GET /followup`, `/resumo`, `/avaliacao/:id`, `/:id`): ADMIN, ENFERMEIRO, SECRETARIA.
  Create and delete (`POST /followup`, `PATCH /followup/:id/excluir`): ADMIN, ENFERMEIRO only (eligibility is a clinical decision).

## Rules applied
- `pacienteId` is validated against the token's clinic on create (404 otherwise); DTOs use `@IsMongoId`.
- Audit events added: `CHECKLIST_ITEM_CREATED`, `CHECKLIST_ITEM_UPDATED`, `CHECKLIST_ITEM_RECEBIDO`, `CHECKLIST_ITEM_DELETED`,
  `CHECKLIST_PADRAO_CREATED`, `FOLLOWUP_DELETED` (`FOLLOWUP_CREATED` already existed). Metadata holds ids/status only.
- Deleting a checklist item is now a soft delete (`excluidoEm`/`excluidoPor`); the old code hard-deleted.
- `avaliacaoIuId` of a follow-up is optional for now (module `avaliacao-iu` is not ported yet); no reference validation yet.
- Old `FollowUpRepository.updateStatus` (unused, wrote a wrong field) was dropped; `resumo` now uses the tenant helper
  instead of `user.clinicaId ?? ''`.

## IU-specific content (TODO(conteudo))
Default document list (`packages/shared/src/checklist-documentos/documentos-padrao.ts`), the eligibility notification text
(`notificacao-template.service.ts`) and the UI labels were kept as they were.

## Web
`ChecklistSecao` and `FollowupSecao` in `PacienteDetailPage` (same pattern as `EntregasSecao`). `FluxoPacientePage` is NOT ported.
Vite proxy regex gained `checklist-documentos|followup`.
