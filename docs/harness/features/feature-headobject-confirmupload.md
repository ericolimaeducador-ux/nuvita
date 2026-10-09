## Feature: Mandatory HeadObject verification on document upload confirmation (`confirmadoEm` flag)

### Depends on

Code-level surfaces (not feature files): `DocumentosService` (`createUploadUrl`, `confirmUpload`, `list`, `createAccessUrl`, `limparNaoConfirmados`), `DocumentStorage` port (`headObject`), `DocumentoRepository` port (`setConfirmadoEm`, `listNaoConfirmadosAte`), R2 bucket.

### Description

Verbatim answer from the user (question 1):

> Comportamento: o registro continua sendo criado em createUploadUrl, mas nasce com confirmadoEm = null. Listagem e abertura só mostram documentos com confirmadoEm preenchido. No confirmUpload, a API faz HeadObject no R2: se o objeto existe e o tamanho bate, seta confirmadoEm = agora, audita e gera miniatura; o documento então passa a aparecer e abrir. Sem novo contrato com o front.

### Problem

Verbatim answer from the user (question 2):

> Bloqueio/falha: se o objeto não existe ou o tamanho diverge, o confirmUpload responde 422; se o R2 está indisponível, responde 503. Em qualquer caso confirmadoEm continua null e não há auditoria, miniatura nem notificação. Documento não-confirmado fica invisível e não abre.

### Solution and trade-offs

Verbatim answer from the user (question 3):

> Bordas: a) existe + tamanho bate → confirma e aparece; b) não existe → 422, segue oculto; c) tamanho diverge → 422; d) documentos antigos já confirmados listam e abrem sem HeadObject; e) R2 fora do ar → 503, segue oculto; f) legado sem confirmadoEm fica oculto até o backfill; g) limpeza faz soft-delete de não-confirmados com mais de 24h, nunca toca em confirmado.

### Flow (given/when/then)

- Given a presigned upload whose object is in the bucket with the declared size
- When confirmUpload is called
- Then `confirmadoEm` is set, the audit event is written, the thumbnail is generated, and the document is listed and can be opened

- Given a presigned upload whose object is missing or has a different size
- When confirmUpload is called
- Then the API answers 422 and `confirmadoEm` stays null

### Error cases (explicit, not left implicit)

- Object missing in the bucket → 422; no audit, thumbnail or notification.
- Object size differs from the declared size → 422; same effects.
- R2 unavailable on HeadObject → 503; same effects.
- Unconfirmed document (null) or legacy document without the field → hidden from the list and 404 on access-url.

### Acceptance criteria (what proves it is done)

- [x] Test: createUploadUrl creates the record with `confirmadoEm = null`.
- [x] Test: unconfirmed documents are not listed and cannot be opened.
- [x] Test: object exists and size matches → confirmed, audited, thumbnail, then listed and opened.
- [x] Test: object missing / size mismatch / R2 down → confirm fails and `confirmadoEm` stays null.
- [x] Test: cleanup soft-deletes unconfirmed records older than 24h and never touches confirmed ones.
- [x] Test: old confirmed documents list and open without HeadObject.
- [x] Test: legacy documents without `confirmadoEm` stay hidden until the backfill.
- [x] Backfill script (dry-run by default) with unit test; execution is a separate, explicitly authorized step.

### Example / context

Verbatim answer from the user (question 4):

> Exemplo: SECRETARIA sobe um PDF. Se o PUT falha, o registro fica com confirmadoEm null e some da lista; a limpeza o remove por soft-delete após 24h. Se o PUT sucede e o confirm roda, o HeadObject acha o objeto, seta confirmadoEm, e o documento aparece e abre. Nenhum fantasma visível ao fiscal, em qualquer caminho.
