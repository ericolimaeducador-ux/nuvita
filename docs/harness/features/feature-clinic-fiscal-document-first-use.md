## Feature: the clinic can be created without a fiscal document; the psychologist fills it once on first use

### Depends on
- `ClinicasService.onboard`, `ClinicasService.contextoDeEmissao`, `ClinicaRepository`, the super-admin clinic creation flow (`CriarClinicaDto`).
- `DocumentosEmitidosService` (declaração and atestado de comparecimento) and the clinical document screens (`GateCrpEmissao` pattern).
- The unique index on `clinicas.cnpj` already in production (see "Storage decision").

### Description

Answer to mandatory question 1 — *"Como você descreve a feature?"* — recorded verbatim (Portuguese) as given by the user:

> a clínica pode ser criada sem documento fiscal, e o psicólogo o informa uma vez no primeiro uso; sem ele o servidor bloqueia a emissão de documentos.

### Problem

Answer to mandatory question 2 — *"Qual problema objetivamente ela resolve?"* — recorded verbatim (Portuguese):

> o formulário de inscrição do beta coletou nome, e-mail e CRP, mas não o CPF do consultório, que a criação exige e que sai no cabeçalho dos documentos.

### Solution and trade-offs

Answer to mandatory question 3 — *"Qual a solução esperada e quais trade-offs ela envolve?"* — recorded verbatim (Portuguese):

> a própria psicóloga informa; o psicólogo ganha permissão de escrita restrita ao próprio consultório, uma única vez e auditada. Depois só o super-admin altera. Laudo e prontuário ficam com bloqueio só de tela, registrado como dívida.

Conditions set by the user (2026-10-28):
1. The super-admin creates a clinic without `documento`/`tipoDocumento`.
2. The psychologist fills it ONCE (`PATCH /clinicas/minha/documento`); afterwards only the super-admin corrects it (existing flow).
3. The write is ATOMIC: the update filter only matches a clinic whose document is still empty. A second attempt (or a race) changes nothing and answers 409.
4. The screen asks for a confirmation before saving (the value is permanent for the psychologist).
5. Audit event with who, when (log `timestamp`) and the MASKED value; never the full document.
6. The server blocks issuing declaração and atestado de comparecimento: 422 "Informe o CPF/CNPJ do consultório".
7. Laudo and prontuário are blocked on the screen only (same gate), recorded as debt of the same class as BUG-019: the server does not refuse them.

Sentinel conditions (confirmed by Erico, 2026-10-28), each with named tests:
- (a) NO path exposes `SEM-DOCUMENTO-`: every reader of the field goes through `ClinicaMongoRepository.toEntity` (findById, findByDocumento, findAll, create, update, preencherDocumentoSeVazio) and returns an empty document. Tests: `clinica-mongo.sentinela.spec.ts`, `clinicas.sentinela-leitores.spec.ts` (GET /clinicas/minha, emission context, 422, super-admin list and edit, audit, compensation) and `clinicas.sentinela-fonte.spec.ts` (only the repository knows the prefix and reads the raw model).
- (b) the atomic write filters by the prefix: `preencherDocumentoSeVazio: o filtro do update exige o prefixo (atômico) e grava normalizado`.
- (c) collision: a document that belongs to ANOTHER clinic (or the unique index, E11000) answers 400 with the generic message "Não foi possível salvar. Confirme o número ou fale com o suporte.", never revealing that the value exists elsewhere, never the Mongo message, and the log carries only the clinicaId. Status 400 (the same as a refused number) so the answer does not distinguish the cases; "already filled" for the own clinic stays 409.
- Restoring "no document" (compensation of a failed super-admin edit) writes a NEW sentinel, never an empty string.

Storage decision (confirmed by Erico): `clinicas.cnpj` has a NON-sparse unique index in production, so two clinics without a document would collide on the missing value. To avoid an index migration during the beta, a clinic without a document stores a unique placeholder `SEM-DOCUMENTO-<id>` in `cnpj`; the repository maps it back to an empty `documento`. The atomic filter matches that placeholder prefix. The clean alternative (partial unique index) is post-beta.

### Flow (given/when/then)
- **Given** a clinic created without a document **When** the psychologist opens a clinical document screen **Then** a gate asks for CPF/CNPJ, then a confirmation, then saves once.
- **Given** the document already filled **When** the psychologist sends another `PATCH /clinicas/minha/documento` **Then** 409 and nothing changes.
- **Given** a clinic without a document **When** declaração or atestado is requested **Then** 422 and nothing is recorded.

### Error cases
- Invalid check digits or a document already used by another clinic → 400 / 409. Already filled → 409. No document on emission → 422.

### Acceptance criteria
- [ ] Test: onboarding without document creates the clinic; the duplicate check is skipped
- [ ] Test: fill-once is atomic (filter on the empty document), audited with the masked value, 409 when already filled
- [ ] Test: only PSICOLOGO may call `PATCH /clinicas/minha/documento` (authorization matrix)
- [ ] Test: declaração and atestado answer 422 without the clinic document
- [ ] Test: the screen gate asks for the document, confirms, and saves

### Example / context

Answer to mandatory question 4 — *"Qual exemplo ou contexto concreto temos do problema?"* — recorded verbatim (Portuguese):

> a clínica da Claudia, criada sem documento.
