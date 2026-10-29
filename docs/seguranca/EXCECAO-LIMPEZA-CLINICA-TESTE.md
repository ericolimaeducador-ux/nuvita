# Exception record: removal of the test clinics and patients from production

> Written on 2026-10-28 by the agent, from what Erico reported in chat. It records a deviation that ALREADY happened. It does not authorize anything and was NOT backdated.

## What happened (as reported by Erico)
- Erico deleted the test clinics and test patients from the production database through the shell.
- What remains: the super-admin and the clinic renamed "Gerenciadora".
- The `inscricoes_teste` collection (beta sign-ups) was not part of this removal. **Erico to confirm.**

## Deviation from the planned procedure
The procedure agreed for this exception was: exception document, confirmed backup, dry-run count, then execution scoped by `clinicaId`.
The deletion was executed **BEFORE the backup, BEFORE the count and BEFORE this document**. The order of the planned steps was not followed.
This record was written after the fact. The date of the execution below is the real one, informed by Erico; it is not the date of this document.

## Reason
No real data existed in production: only test clinics and fictitious patients. This remains true as reported by Erico. The principle of never deleting regulatory entities (signed medical records, issued documents with protocol, audit log) was set aside only for that reason.

## Fields for Erico to fill in
| Field | Value |
|---|---|
| Real date and time of the execution | _(Erico)_ |
| Who executed it | _(Erico)_ |
| Database and cluster | _(Erico)_ |
| Backup taken? Where, when, snapshot identifier | _(Erico, blank if none)_ |
| Count before: clinics / users / patients / appointments / medical records / issued documents / notifications | _(Erico, blank if not counted)_ |
| Count after, same collections | _(Erico)_ |
| Audit log (`audit_logs`) touched? | _(Erico; the schema forbids it through Mongoose, but a shell bypasses that)_ |
| Files in the storage bucket removed? | _(Erico)_ |
| `inscricoes_teste` untouched confirmed? | _(Erico)_ |

## Update 2026-10-28 (by Erico): second cleanup and the issued documents
- Protocol NV-FGD5CBG86P was confirmed by Erico as a TEST document issued on 2026-10-26, BEFORE the first cleanup, with the `clinicaId` of the "Gerenciadora" clinic (the clinic that stays). There is no pending question about its origin.
- The 5 `documentos_emitidos` records are part of the SECOND cleanup.
- **Storage detail for any count or filter:** `documentos_emitidos` stores `clinicaId` as an **ObjectId**. The other collections must be counted both ways (**ObjectId and string**), because a filter by one form silently misses the other.
- Nothing was executed in production by the agent for this update.

## MANDATORY step before the second cleanup (decision of Erico, 2026-10-28)
The production cluster is Atlas M0 and has NO backup (accepted risk, see `docs/PROGRESS_BETA_PRELAUNCH.md`). Therefore, before the second cleanup:
1. **Export `inscricoes_teste`, `users` and `clinicas`** to files kept outside the database host.
2. **Check the export (MANDATORY, before ANY deletion):** compare, against Atlas, (a) the document count of each collection and (b) the size of each file. Every file must open and be readable. Record counts and sizes in the table above. If any number differs, stop: nothing is deleted.
3. Only then run the cleanup, scoped by `clinicaId` (count the `clinicaId` as ObjectId AND string, see the update above), with `inscricoes_teste` never touched.
An export is not a backup and must not be recorded as "backup confirmed".

## Consequences to keep in mind
- Signed medical records and issued documents of the test clinics no longer exist, and no backup is confirmed. If a backup exists, record it above.
- The protocols NV-NCXJG4YZ6L and NV-XWLU65KMJG (declaration and attestation issued during the 2026-10-27 production test) were among the removed data, if the clinic was removed. **Erico to confirm.**
- A check of what is left can use the LIST script, when Erico provides the database URI in his own environment. The agent does not receive or use the URI.

## Update 2026-10-28, night (written by the agent from what Erico reported; not backdated): the second cleanup was done MANUALLY

- **What happened:** Erico ran the second cleanup by hand in the Atlas Data Explorer on 2026-10-28, between about 18:08 and 18:22 (time as reported by Erico). The cleanup script (`scripts/limpeza-clinicas-teste.mjs`) and its runbook were **not used**: they were prepared and tested only against a local Mongo and stay unused in production.
- **Order actually followed (deviation from the planned order, "children before clinics"):** clinics A and B were deleted BEFORE their children. The planned guards (clinic-scoped filters on both forms of `clinicaId`, orphan check before and after) therefore did not apply.
- **Deleted:** `agendamentos`, `prontuarios`, `documentos_emitidos` (4 from the test clinics and 5 leftovers that carried the Gerenciadora's `clinicaId`), `pacientes`, `users` (4), `notificacoes`, `clinicas` (2).
- **Deliberately NOT deleted:** `documentos` (15 rows, and the files in the R2 storage, still pending), `audit_logs`, `inscricoes_teste`, the super-admin user, the Gerenciadora clinic and its document.
- **Possible side effect to check:** because the clinics went first, any child document not matched by the filters used (for example `prontuario_addendums` and `sinais_telemedicina`, which have no `clinicaId`, or a `clinicaId` stored in a third form) can now be an orphan. **Erico to check.**

| Field | Value |
|---|---|
| Export of `inscricoes_teste`, `users`, `clinicas` taken and checked (counts and sizes) before the deletion? | Manual copy of `inscricoes_teste`, `users` and `clinicas` made by Erico before the production test of 2026-10-28; numbers checked. |
| Copy redone before the deletion? | To be confirmed by Erico |
| Count before: clinics / users / patients / appointments / medical records / issued documents / notifications | not recorded |
| Count after, same collections | Confirmed by Erico on 2026-10-29: `users` 1, `clinicas` 1, `inscricoes_teste` 8, `audit_logs` 1428. Other collections: not recorded |
| `documentos`: rows left, files left in R2 | _(Erico; expected 15 rows, plus the files)_ |
| `audit_logs` and `inscricoes_teste` counts unchanged? | `audit_logs`: 1428 on 2026-10-29, equal to the count of 2026-10-28 around 17:00 (did not decrease). `inscricoes_teste`: 8 on 2026-10-29; comparison with the earlier count not recorded |
| Orphans left (`prontuario_addendums`, `sinais_telemedicina`, any `clinicaId` of a clinic that no longer exists) | not recorded |
