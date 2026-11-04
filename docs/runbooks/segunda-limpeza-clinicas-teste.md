# Runbook: second cleanup of the test clinics (Erico executes; the agent runs nothing in production)

> **STATUS (2026-10-28, night): prepared and tested on the LOCAL Mongo, NOT used in production.** The second cleanup was done by hand by Erico in the Atlas Data Explorer (see `docs/seguranca/EXCECAO-LIMPEZA-CLINICA-TESTE.md`, PR #79). **Still pending:** the 15 rows of `documentos` and their files in R2 (deliberately kept). Keep this runbook and the script `scripts/limpeza-clinicas-teste.mjs` for a future cleanup; before any use, read the limits below and run the count-only mode first.

> Prepared 2026-10-28 after the production test. Nothing here was executed. Cluster is Atlas M0 **without backup** (accepted risk): the export in step 1 is a mitigation, **never** "backup confirmed". Related: `docs/runbooks/copia-manual-atlas-m0.md`, `docs/seguranca/EXCECAO-LIMPEZA-CLINICA-TESTE.md`.

## What goes (list D2 of the production test, all created 2026-10-28)
| Kind | Name | Note |
|---|---|---|
| Clinic | `Clinica A` | no ZZ-TESTE prefix: confirm the id in Atlas before listing it |
| Clinic | `ZZ-TESTE Clinica B` | |
| Users (4) | `ZZ ADMIN A`, `ZZ Psi A`, `ZZ-ADMIN-B`, `ZZ Psi B` | the ids come from Atlas (the interface does not show them) |
| Patients (2) | `ZZ-TESTE Paciente`, `ZZ-TESTE Paciente B` | |
| Expected minimum | 6 appointments, 3 signed records, 4 issued documents (protocols NV-S9WFVQDYGD, NV-KXD4EHYJSX, NV-VRS76X7ULV, NV-CXB7V98ASR) | notifications: unknown |

The pre-count may show MORE than the minimum (leftovers under the same clinics). Anything unexplained: stop and ask.

## What stays (the script never touches it)
The super-admin user, the clinic `Gerenciadora` and its document, `audit_logs`, `inscricoes_teste`.

## Steps, in this order
1. **Checked export** (reading only), `$MONGODB_URI` set by you in your own terminal, never pasted anywhere: export `inscricoes_teste`, `users`, `clinicas` as in `copia-manual-atlas-m0.md` section 1, plus, for the evidence of what is being removed, `pacientes`, `agendamentos`, `prontuarios`, `documentos_emitidos`.
2. **Check the export (mandatory before any deletion):** per collection, compare the document count and the file size against Atlas; every file must open. Write the numbers in `EXCECAO-LIMPEZA-CLINICA-TESTE.md`. Any difference: stop, nothing is deleted.
3. **Prepare the list file** outside the repository, `limpeza.json`, ids only (24 hex characters; never e-mail, CPF or document):
   `{"clinicas": ["<id>", "<id>"], "usuarios": ["<id>", "<id>", "<id>", "<id>"]}`
4. **Count before** (changes nothing):
   `node scripts/limpeza-clinicas-teste.mjs --lista <path>/limpeza.json`
   It prints, per collection, the count with `clinicaId` as **string** and as **ObjectId** and the total (a filter on one form silently misses the other; `documentos_emitidos` is known to store an ObjectId). It also prints **orphans**: documents whose `clinicaId` points to a clinic that no longer exists, per form (leftovers of the first cleanup show up here; the script reports them and never deletes them). Compare with the table above. The script **refuses** (exit 2) an empty list, any `SUPER_ADMIN`, the `Gerenciadora` clinic, an unknown id, and any user of a listed clinic that is not on the user list.
5. **Delete, children before clinics:**
   `node scripts/limpeza-clinicas-teste.mjs --lista <path>/limpeza.json --executar --export-conferida`
   Order inside the script: `prontuario_addendums` and `sinais_telemedicina` (grandchildren), then the clinic-scoped collections (`agendamentos`, `bloqueios_agenda`, `prontuarios`, `documentos`, `documentos_emitidos`, `config_psicologo`, `lancamentos_financeiros`, `decisoes_uso_ia`, `registros_uso_ia`, `notificacoes`, `notificacao_preferencias`, `observacoes_paciente`, `eventos_telemedicina`, `salas_telemedicina`, `testes_psicologicos`, `tickets`, `pacientes`), then `users` by id, then `clinicas` by id. `--executar` without `--export-conferida` is refused.
6. **Count after:** printed by the same run; everything listed must be 0 and the orphan numbers must equal the ones before (exit 3 and the names if something remains or the orphans changed). Then confirm in the interface (super-admin: the clinics tab shows only `Gerenciadora`; the users list shows only the super-admin) and that `audit_logs` and `inscricoes_teste` counts are unchanged.
7. Record before/after counts, date, who ran it and the export sizes in `EXCECAO-LIMPEZA-CLINICA-TESTE.md`.

## Limits (say them honestly)
- Signed records and issued documents of these clinics disappear for good; the export is the only copy.
- No files were uploaded by the production test (no patient documents), so the storage bucket is expected to have nothing to remove. Confirm with the `documentos` count in step 4; if it is above 0, the bucket objects must be handled separately.
- `audit_logs` stays on purpose and keeps personal data in clear (see `PROGRESS_BETA_PRELAUNCH.md`, lawyer item).
- Tests: the guards have unit tests (`node --test scripts/lib/limpeza-guardas.test.mjs`) and the whole script has an integration check against the LOCAL Mongo, database `limpeza_teste`, fictitious data (`node scripts/lib/limpeza-clinicas-teste.integracao.mjs`, 15 assertions). It has never run against Atlas. Run step 4 (count only) first and read it carefully.
- A third storage form of `clinicaId` (neither string nor ObjectId) would be invisible to the counts and to the orphan check.
