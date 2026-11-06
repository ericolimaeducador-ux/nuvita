# Nuvita Estomaterapia — Integration Progress & Handoff

Last updated: 2026-11-06 (stage R1 — reliability)

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
- PR #31 merged: stage 5c — lesion registry (`lesoes`), FERIDA module (classification FA), ABI, image consent (`consentimentos_imagem`),
  photo measurement (geometry only, zero AI), read-only lesion history, outcome re-apply route — see docs/etapas/ETAPA-5C-FERIDAS.md.
- Stage R1 PR (branch `estomaterapia/r1-confiabilidade`): reliability fixes from an external review — see the "Stage R1" section below.
- CLASSIFICATION MEANING (corrected in 5b, confirmed by Erico): IU = incontinência urinária E anal; FA = feridas; OT = ostomias.
  Stage 2 had recorded FA = "incontinência fecal" and OT = "outras áreas" (a deduction). Enum values/data unchanged.

## NEXT ACTIONS (in order)
1. Review/merge the stage R1 PR (#32) into estomaterapia/integracao (merge commit). Owner decisions for the R1 stops are applied (see the
   "R1 — owner decisions" block below). Still pending from 5c: image-consent term text (TODO(legal)).
2. Content stage: redesign the Estomaterapia module list + server guard (per-module permissions), and remove/rewrite the legacy psi screens
   (Atendimento psicológico, Prescrição de cuidados, Prontuários) whose write/AI controls are now hidden and blocked.
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
- Stage 5c: lesion status is applied AFTER the signature without a transaction (same pattern as the charge). A failed write leaves the
  consultation signed with desfechoLesoesStatus = PENDENTE_APLICACAO; POST /consultas/:id/lesoes/aplicar-desfecho re-applies it idempotently
  (never overwrites a lesion closed by another consultation — returned as a conflict).
- Stage 5c: the measurement tool draws on an SVG layer over the photo (not a <canvas>): same interactions, native image coordinates, testable.

## Stage R1 — reliability (confirmed findings of an external review)
1. **Consultation signature with version + integrity seal.** `consultas_enfermagem.versao` (default 1; documents without the field count as 1)
   is incremented on every draft save; `PATCH /consultas/:id` and `POST /consultas/:id/assinar` REQUIRE `versao` (web contract changed:
   `salvarRascunho(id, conteudo, versao)`, `assinar(id, cobranca, versao)`). Divergent version -> 409 "A consulta foi alterada em outra tela",
   nothing overwritten; the web keeps the local text and offers "Carregar versão atual". The HMAC is computed over the content of THAT version
   and the conditional write filters `{ status: RASCUNHO, versao }`. Signing stores `identificacoesLesoes` (copy of each evaluated lesion's
   identification + `versaoCadastro`), covered by the seal; the signed screen shows "identificação registrada neste atendimento" and, if
   different, "identificação atual". Reads (GET one / list) recompute the HMAC and expose `integridade: VALIDA | FALHA` (FALHA audited as
   CONSULTA_INTEGRIDADE_FALHA and highlighted). Wording: "selo de integridade" — never "assinatura digital"/ICP-Brasil. After the signature is
   persisted nothing becomes an error: audit / charge / lesion-outcome failures become persisted pendings (`auditoriaAssinaturaPendente`,
   cobranca PENDENTE_GERACAO, desfechoLesoesStatus PENDENTE_APLICACAO) and the response is 200 with `pendencias`. A pending signature audit is
   re-written on the next read of the consultation.
2. **Server-side access revocation.** The JWT is accepted only while its `papel` and `clinicaId` are the user's CURRENT values in the DB (the
   per-request `findById` already existed for `ativo`/`tokensValidosApartirDe`); any administrative change of role or clinic -> 401 on the next
   call (access and refresh). Chosen over a session counter: no write path needs to remember to bump anything. Module permissions are NOT in the
   token. Per-module permissions: see the owner decision (A) below.
3. **Web cache per session.** Login, logout, cross-tab logout and clinic switch cancel in-flight queries and clear the React Query cache; every
   query key is hashed with the session scope (user id + active clinic) through `queryKeyHashFn` (`apps/web/src/lib/cache-sessao.ts`), so all
   140 keys are covered and prefix invalidation keeps working.
4. **Legacy read-only / old AI off.** `TestesPsicologicosModule` unregistered from AppModule (code kept), its 2 matrix rows removed, the
   "Testes psicológicos" patient section and its client removed from the web. Prontuário writes and `ia-clinica`: see owner decision (B).
5. **Dangerous docs fixed.** PRODUCTION-CHECKLIST, GCP-SECRETS-KMS-SETUP, QUICK-START-SECRETS, INVENTARIO-SEGREDOS, PENDENCIAS (#12) and README
   now say: PATIENT_DATA_ENCRYPTION_KEY, PATIENT_DATA_HASH_KEY and PRONTUARIO_SIGNATURE_SECRET of the real Nuvita service are REUSED at cutover
   (copied via Secret Manager), never generated again or rotated; psi-only content is marked [específico do psi]. A jest doc guard
   (`docs-segredos-migracao.spec.ts`) keeps the instruction from coming back. Scripts: see owner decision (C).
6. **Delivery total recomputed server-side**: sum of quantity × unit price; item or delivery total divergent -> 400, nothing stored; the stored
   total is the recomputed one (the web already computed it the same way).
7. **E2E in our flow**: `web-e2e.yml` also runs on PRs to `estomaterapia/integracao` and `estomaterapia/**` (harness with mocked API — no DB, no
   secret). Psych-only scenarios updated (collapsed-section dialog now uses "Novo documento") or removed ("Aplicar teste psicológico");
   CRP/psychology fixtures -> COREN/nursing. Found while running it: the harness (`e2e/vite.harness.config.ts`) had no `@shared` alias, so
   EVERY e2e has failed since stage 5b (nobody noticed — the workflow only ran on PRs to main); alias added. Full local run was stopped by the
   machine (low memory) after 13/173 passing cases — the CI run on the R1 PR is the reference.
8. **Captação**: E11000 message chosen by the violated index (`keyPattern`/`keyValue`/"index: name"); unknown index -> generic message, never
   "CPF". `CreateCaptacaoDto.cpf` now checks the check digits and rejects repeated sequences (patient registration already did). CPF
   placeholder: "Deixe em branco se não souber".
- **No new index** in R1 (the `versao` field needs none). The Atlas index list above is unchanged.

### R1 — owner decisions (applied in the same PR #32)
- **(A) Per-module permissions: permissões por módulo desativadas até a etapa de conteúdo redesenhar a lista de módulos da Estomaterapia e
  aplicar guard no servidor.** The role stays the server-side access control. The web hides the "Módulos liberados" block of the Super Admin
  user editor and no longer sends `modulosConcedidos`/`modulosRevogados` (the API only changes them when sent, so stored data is untouched).
  Flag: `apps/web/src/lib/recursos-legado.ts` (`edicaoModulosPorUsuario: false`). Code and data kept.
- **(B) Legacy prontuário and old AI blocked on the SERVER, routes and screens kept.** `POST /prontuarios`, `PATCH /prontuarios/:id`,
  `POST /prontuarios/:id/assinar`, `POST /prontuarios/:id/addendums` answer 403 "O prontuário antigo é somente leitura." BEFORE any
  validation or write, auditing PRONTUARIO_LEGADO_ESCRITA_BLOQUEADA (action + ids only). Reads unchanged; no data touched. Every `ia-clinica`
  route answers 403 "Recurso desativado." without touching the service or the AI provider. Matrix rows kept (routes exist);
  `legado-bloqueado.spec.ts` checks 403 for every role (RolesGuard or handler) and that the provider is never accessed. Web: write/AI controls
  hidden in Atendimento psicológico (Sugerir abordagem, Salvar rascunho / Salvar e assinar, "Prontuário" on the agenda list), Prescrição de
  cuidados (Gerar com IA), Prontuários (Assinar) and the prontuário dialog (Assinar) — flags `escritaProntuarioAntigo` / `iaClinicaAntiga`.
  Agenda, telemedicine and the psychology finance on the same screen keep working. The old screen tests switch the flags on locally so the
  dormant code stays tested; `RecursosLegadoOcultos.test.tsx` checks the defaults hide everything.
- **(C) Secrets scripts.** `scripts/gen-production-secrets.mjs` no longer generates the three keys (template leaves them empty with a "copy
  from the real service" note) and `scripts/rotate-secrets-worker.mjs` no longer lists them; both abort via
  `scripts/lib/segredos-reaproveitados.mjs` if the list or any argument (e.g. `--incluir=PATIENT_DATA_HASH_KEY`) includes them.
  `scripts-segredos-migracao.spec.ts` is the guard (it also runs the generator with a forbidden flag and checks it exits 1 writing nothing).
  Known, not changed: `rotate-secrets-worker.mjs` contains TypeScript syntax (`interface`) in an `.mjs`, so Node cannot run it as is;
  `scripts/init-gcp-secrets.mjs` still prompts for the three secrets (interactive; the docs say to paste the real values).
- **E2E**: the CI run of PR #32 passed (Web — E2E (Playwright)).
