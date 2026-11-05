# Nuvita Estomaterapia — Integration Progress & Handoff

Last updated: 2026-11-04 (session paused ~21:35 BRT)

## What this project is
Turning the production `nuvita` repo (real patients, GitHub ericolimaeducador-ux/nuvita) into the new Nuvita Estomaterapia, using the nuvita-psi codebase as the FULL base (security, access rules, tenancy, audit, redirects, automatic messages, screen structure). Only clinical/typing screens and clinical content change from Psychology to Stomatherapy. nuvita-psi is the premium reference. Master plan (source of truth) lives in the Claude.ai project doc "Plano mestre"; THIS file is the engineering handoff — read it FIRST.

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
- PR #22 OPEN, CI GREEN, AWAITING MERGE: catalog. Product `tipo` freed from fixed enum to validated string (old values still valid). Two Cure Dextra catheters in scripts/seed-sondas-cure-dextra.mjs (NOT executed): codigo ICC 510795/510796, tipo cateter_cure_dextra, sexo universal, embalagem standard, projeto SIGMA (ProjetoCatalogo enum gained SIGMA), french 12/14, comprimentoCm absent, no regulatory data.

## NEXT ACTIONS (in order)
1. Merge PR #22 (merge commit) into estomaterapia/integracao.
2. Etapa 3 part 2: port checklist-documentos (trigger AGUARDANDO_CONSULTA_MEDICA when all items RECEBIDO) and followup (trigger APTO_AGUARDANDO_CONTATO or NAO_ELEGIVEL). Keep IU-specific default document list / texts with TODO(conteudo).
3. Etapa 4: captacao, avaliacao-iu, mercado-pago. Add server-side recompute of delivery/payment totals (reject divergence; currently trusts client). Add reference validation for avaliacaoIuId once avaliacao-iu exists.
4. Etapa 5: new Stomatherapy prontuario + assessment scales (replacing testes-psicologicos), wired to the versioned scientific knowledge package.
5. Etapa 6: laudo-medico (decide Gemini vs PSI Anthropic AI infra).

## Pending items / risks
- Migrations written but NOT executed: migrar-etapa2-classificacao.mjs (classificacoes=['IU'] for all; all current patients are IU-only, confirmed) and seed-sondas-cure-dextra.mjs. Run only in the Phase 3 rehearsal on a copy, never on production.
- At cutover the new service MUST reuse the SAME keys as the current one (PATIENT_DATA_ENCRYPTION_KEY, PATIENT_DATA_HASH_KEY, PRONTUARIO_SIGNATURE_SECRET) via Secret Manager — rotating them breaks encrypted data / CPF search / signatures.
- New PSI env vars missing from the real service (Phase 4): IA_USO_ENCRYPTION_KEY, ANTHROPIC_*, REMINDER_SCHEDULER_*.
- Real DB: 5 active users (1 SUPER_ADMIN, 1 ENFERMEIRO, 3 ADMIN); 11 prontuarios, 0 signed; 20 patients with cpfHash. No role migration needed.
- CPF unique index in PSI does not filter by ativo:true (old one did) — would block re-registering a deactivated patient. Review in Phase 3.
- Catalog brand names/codes are kept (manufacturer-authorized exception). AI/recommendation layer must stay brand-neutral.
- Old ci.yml lint is non-blocking (|| true); PSI CI runs blocking ESLint + npm audit. Consider making lint blocking later.
- Some jest suites (lembretes-agendamento, documentos R2) flake under load locally — pass isolated; investigate machine performance.
- registroPsicologico exists in 1 old prontuario; fichaAvaliacaoIU/registroEnfermagem/relatorioJudicial exist in old data but not in the PSI schema (strict mode ignores, does not delete) — handle in Phase 3.
