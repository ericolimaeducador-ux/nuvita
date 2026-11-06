# Nuvita Estomaterapia — Integration Progress & Handoff

Last updated: 2026-11-06 (stage 5c)

## What this project is
Turning the production `nuvita` repo (real patients, GitHub ericolimaeducador-ux/nuvita) into the new Nuvita Estomaterapia, using the nuvita-psi codebase as the FULL base (security, access rules, tenancy, audit, redirects, automatic messages, screen structure). Only clinical/typing screens and clinical content change from Psychology to Stomatherapy. nuvita-psi is the premium reference. Master plan (source of truth) lives in the Claude.ai project doc "Plano mestre"; THIS file is the engineering handoff — read it FIRST.

## INCIDENT — main (read this)
- main contém a base nova desde 05/11 (PR #26, merge acidental, sem deploy). Produção = 7520a9b = branch producao/2026-10-21. Nunca fazer deploy a partir da main antes da Fase 4.
- Only CI ran on main after the merge (deploy workflows are `if: ${{ false }}` / workflow_dispatch). Do NOT revert and do NOT touch main. Any production hotfix branches off `producao/2026-10-21`.

## HARD RULES (do not break)
- NEVER push to or merge into `main`. Production (nuvita-api, real patients) deploys from main.
- All work goes through PRs into `estomaterapia/integracao`. Merge with "Create a merge commit" — NEVER squash or rebase (would flatten the junction commit and lose history).
- Deploy workflows (deploy-api.yml, deploy-web.yml, deploy-pages.yml) are DISABLED on purpose (`if: ${{ false }}` + only workflow_dispatch). Do NOT re-enable. They point at the PSI service/WIF; re-enabling with this tree on main would overwrite the live PSI service. Reactivate only in Phase 4.
- Read the OLD nuvita code from the first parent of the junction commit: `git show b908c02^1:<path>`.
- Compliance: regulatory entities are never hard-deleted — soft-delete/version + audit trail. audit_logs validates its event enum on write: new events must be added to the enum.
- Anti-invention: never invent regulatory facts, product data, lengths, codes, or legal basis. If unknown, leave blank and flag for Erico.

## Branch / PR state
- PR #18 merged: base import. Junction commit b908c02 (two parents), tree identical to nuvita-psi@125d189. Deploys disabled, CI enabled for estomaterapia/**.
- PR #19 merged: roles. PSICOLOGO -> ENFERMEIRO (no PSICOLOGO as a role anywhere), crp -> coren, no MEDICO. Roles: SUPER_ADMIN, ADMIN, ENFERMEIRO, SECRETARIA, PACIENTE. Authorization matrix green, no row relaxed.
- PR #20 merged: clinical flow foundation. Patient field `classificacoes` (array IU/FA/OT, multiple, at least one). Flow eligibility = classificacoes is exactly {IU}. EtapaFluxoClinico (9 stages) kept as the IU pipeline. avancarEtapaFluxo = single mutation point (forward-only, swallows errors, ignores non-eligible). Manual advance: ADMIN/SECRETARIA/ENFERMEIRO/SUPER_ADMIN. Audit PIPELINE_STAGE_CHANGED + PACIENTE_CLASSIFICACAO_ALTERADA. FluxoClinicoPage lists IU-only patients. Automatic triggers and per-patient FluxoPacientePage NOT ported yet.
- PR #21 merged: produtos + entregas. Operational catalog (empty, no boot seed) + deliveries. confirmarEntrega -> avancarEtapaFluxo CONCLUIDO (ignores non-IU). Audit PRODUTO_* and ENTREGA_*.
- PR #22 merged: catalog. Product `tipo` freed from fixed enum to validated string (old values still valid). Two Cure Dextra catheters in scripts/seed-sondas-cure-dextra.mjs (NOT executed): codigo ICC 510795/510796, tipo cateter_cure_dextra, sexo universal, embalagem standard, projeto SIGMA (ProjetoCatalogo enum gained SIGMA), french 12/14, comprimentoCm absent, no regulatory data.
- PR #23 merged: checklist-documentos (all items RECEBIDO -> AGUARDANDO_CONSULTA_MEDICA; soft delete) and followup (ELEGIVEL -> eligibility notice + APTO_AGUARDANDO_CONTATO; NAO_ELEGIVEL -> NAO_ELEGIVEL). Eligibility notice only for patients inside the flow (same criterion as avancarEtapaFluxo). Web sections in the patient page.
- PR #24 merged: captacao (public PIN form, fail-closed guard; collection `capitacao_paciente` kept; lead -> patient [IU] at AGUARDANDO_ATENDIMENTO; PATCH /captacao/:id to complete a lead before export) and avaliacao-iu (create -> AVALIACAO_IU; collection `avaliacoes_iu`). avaliacaoIuId now validated in followup and entregas. Follow-up form has an origin-assessment picker.
- PR #25 merged: cobrancas — patient charge REGISTRY + notices (no payment processing; mercado-pago untouched). Per-clinic evaluation value (default R$ 220,00 in one constant), derived `vencida`, manual mark-paid, logical cancel, monthly summary, e-mail/WhatsApp notice (template TODO(conteudo)).
  - NOTE: commit 044deb6 (clinic-level GET /cobrancas list + payment-method dialog on mark-paid) was pushed to `estomaterapia/etapa4b-financeiro` AFTER #25 was merged, so it is NOT in integracao. Needs its own PR if wanted.
- PR #26 merged by accident: `estomaterapia/integracao` -> `main` (see INCIDENT above).
- PR #27 merged: stage 5a — nursing consultation core (docs/etapas/ETAPA-5A-CONSULTA.md).
- PR #28 merged: commit 044deb6 (clinic-level charge list + payment method on mark-paid), merged with integracao, no conflicts.
- PR #29 merged: charge type `consulta_enfermagem`; manual "consulta de avaliação" charge REMOVED (double-charge risk); setting renamed
  to `valorConsultaCentavos` (default `VALOR_CONSULTA_PADRAO_CENTAVOS` = 22000).
- PR #30 merged: stage 5b — IU and anal-incontinence assessment modules + consultation attachments (docs/etapas/ETAPA-5B-IU-ANAL.md).
- Stage 5c PR (branch `estomaterapia/etapa5c-feridas`): lesion registry (`lesoes`), FERIDA module (classification FA), ABI, image consent
  (`consentimentos_imagem`), photo measurement (geometry only, zero AI), read-only lesion history — see docs/etapas/ETAPA-5C-FERIDAS.md.
- CLASSIFICATION MEANING (corrected in 5b, confirmed by Erico): IU = incontinência urinária E anal; FA = feridas; OT = ostomias.
  Stage 2 had recorded FA = "incontinência fecal" and OT = "outras áreas" (a deduction). Enum values/data unchanged.

## NEXT ACTIONS (in order)
1. Review/merge the stage 5c PR into estomaterapia/integracao (merge commit). Owner to confirm the ABI boundary inclusivity (0.80/1.20/1.30/1.40)
   and provide the image-consent term text (TODO(legal)).
2. Stage 5d: OSTOMIA module (classification OT) — mapped in CLASSIFICACAO_DO_MODULO, no module yet. Content only from a cited source; otherwise
   TODO(conteudo). Stage 5e: itemised instruments (ICIQ, Wexner, PUSH, RESVECH, Braden…) — licensing first.
3. Stage 5f: AI suggestions for diagnoses (origem IA_ACEITA / IA_EDITADA already modelled, not writable yet).
4. Automatic trigger: evaluation-appointment charge on the first consultation (CobrancasService.criarConsultaAvaliacao is ready).
5. Stage 6: laudo-medico (decide Gemini vs PSI Anthropic AI infra). Server-side recompute of delivery totals is still open.

## Pending items / risks
- Migrations written but NOT executed: migrar-etapa2-classificacao.mjs (classificacoes=['IU'] for all; all current patients are IU-only, confirmed) and seed-sondas-cure-dextra.mjs. Run only in the Phase 3 rehearsal on a copy, never on production.
- At cutover the new service MUST reuse the SAME keys as the current one (PATIENT_DATA_ENCRYPTION_KEY, PATIENT_DATA_HASH_KEY, PRONTUARIO_SIGNATURE_SECRET) via Secret Manager — rotating them breaks encrypted data / CPF search / signatures.
- New PSI env vars missing from the real service (Phase 4): IA_USO_ENCRYPTION_KEY, ANTHROPIC_*, REMINDER_SCHEDULER_*.
- Real DB: 5 active users (1 SUPER_ADMIN, 1 ENFERMEIRO, 3 ADMIN); 11 prontuarios, 0 signed; 20 patients with cpfHash. No role migration needed.
- CPF unique index in PSI does not filter by ativo:true (old one did) — would block re-registering a deactivated patient. Review in Phase 3.
- Catalog brand names/codes are kept (manufacturer-authorized exception). AI/recommendation layer must stay brand-neutral.
- Old ci.yml lint is non-blocking (|| true); PSI CI runs blocking ESLint + npm audit. Consider making lint blocking later.
- Some jest suites (lembretes-agendamento, documentos R2) flake under load locally — pass isolated; investigate machine performance.
- Consulta de enfermagem: "assina primeiro, cobra depois" (no Mongo transaction — no repository takes a session and local Mongo is standalone). A failed charge leaves the consultation ASSINADA with cobranca.status=PENDENTE_GERACAO; POST /consultas/:id/cobranca regenerates it idempotently (unique partial index on cobrancas_paciente.consultaId). Indexes are created by autoIndex only in development: create them manually in production (cobrancas_paciente {consultaId} unique partial; consultas_enfermagem_adendos {consultaId, numero} unique).
- INDEXES TO CREATE BY HAND IN ATLAS AT CUTOVER (autoIndex is development-only):
  - cobrancas_paciente: { consultaId: 1 } unique, partialFilterExpression { consultaId: { $type: 'string' } } (5a); plus { clinicaId: 1, pacienteId: 1, vencimento: -1 }, { clinicaId: 1, vencimento: 1 }, { clinicaId: 1, pagaEm: 1 } (4b).
  - financeiro_config: { clinicaId: 1 } unique (4b).
  - consultas_enfermagem: { clinicaId: 1, pacienteId: 1, criadoEm: -1 }, { clinicaId: 1, 'cobranca.status': 1 } (5a).
  - consultas_enfermagem_adendos: { consultaId: 1, numero: 1 } unique (5a).
  - consultas_enfermagem_anexos: { clinicaId: 1, consultaId: 1, criadoEm: 1 } (5b).
  - lesoes: { pacienteId: 1, numero: 1 } unique; { clinicaId: 1, pacienteId: 1, status: 1 }; { clinicaId: 1 } (5c).
  - consentimentos_imagem: { clinicaId: 1, pacienteId: 1 } unique, partialFilterExpression { revogadoEm: { $type: 'null' } }, name
    consentimento_vigente_unico; { clinicaId: 1, pacienteId: 1, criadoEm: -1 }; { clinicaId: 1 } (5c).
- Documents size limit: `MAX_DOCUMENT_SIZE_BYTES` is 10 MB but the documents module's error message says "50MB". Consultation attachments use the constant (10 MB). Fix the message (documents module) when convenient.
- Legacy prontuarios (registroPsicologico, relatorioJudicial, old records) stay READ-ONLY in the old `prontuarios` collection; the new consultation lives in `consultas_enfermagem`. Nothing was migrated or deleted.
- registroPsicologico exists in 1 old prontuario; fichaAvaliacaoIU/registroEnfermagem/relatorioJudicial exist in old data but not in the PSI schema (strict mode ignores, does not delete) — handle in Phase 3.
- Stage 5c: lesion status is applied AFTER the signature without a transaction (same decision as the charge). A failed write leaves the
  consultation signed and audits LESAO_STATUS_NAO_APLICADO; there is no reprocessing route yet (fix by hand or add one if it ever happens).
- Stage 5c: the measurement tool draws on an SVG layer over the photo (not a <canvas>): same interactions, native image coordinates, testable.
