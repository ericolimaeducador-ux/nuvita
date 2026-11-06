# Stage 5c — Wounds: lesion registry, FERIDA assessment module, ABI and photo measurement

Content strictly limited to the owner's specification (Compêndio Científico de Estomaterapia). **Zero AI**: no image processing,
no contour detection, no category/stage/infection suggested from a photo. No itemised scale (PUSH, RESVECH, Braden… are stage
5e), no score, no traffic light, no automatic conduct (dressing, compression, antibiotic), no material suggestion. Lists marked
[PROTOCOLO DO SERVIÇO] carry that label in code and on screen ("protocolo do serviço") — they are the service's lists, not a norm.
New labels are `TODO(conteudo)`; the image-consent term text is `TODO(legal)`.

## Lesion registry (`lesoes`, consultas module)
- Fields: clinicaId, pacienteId, `numero` (sequential per patient; unique index {pacienteId, numero}, retry on E11000), localizacaoAnatomica,
  lado (DIREITO | ESQUERDO | CENTRAL | NAO_SE_APLICA), etiologia [PROTOCOLO DO SERVIÇO] (LESAO_UMIDADE requires `subtipoUmidade`; OUTRA requires
  `etiologiaOutra`), dataIdentificacao (AAAA-MM-DD, not in the future), status ABERTA | CICATRIZADA | ENCERRADA (ENCERRADA requires a reason),
  criadaPor/criadaEm. Shared validation: `packages/shared/src/consulta/lesao.ts`.
- Create: ENFERMEIRO only, and only for a patient classified FA (the same classification that unlocks the module — project decision).
- Read: nurses of the clinic; a read by someone other than the creator is audited (`LESAO_VIEWED`, `autor: false`).
- Correction of etiology/location/side: `PATCH /lesoes/:id` with reason (min 10) and the `versao` the nurse saw (optimistic lock → 409).
  Any nurse of the clinic may correct; each correction is pushed to `correcoes[]` with author, date, reason and the PREVIOUS values.
- Status only changes through the signature of a consultation (see below). There is no status route and no delete.

## FERIDA module (`avaliacao.modulos`, classification FA)
`{ avaliacoes: AvaliacaoLesao[], itb?: MedidaITB[] }` — shared definition in `packages/shared/src/consulta/modulo-ferida.ts`. Covered by the HMAC
signature, locked after signing (correction by addendum).
- Structural validation in the shared validator (unknown keys refused, errors carry field names only). Rules that depend on the lesion run in
  `LesoesService.validarModuloDaConsulta`: the lesion exists, belongs to the patient and is ABERTA; LPP requires `lpp.categoria`; adhesive
  requires both observations (second ≥ first + 30 min, exact error text); `lpp`/`lesaoAdesivo` refused for other etiologies; catalog products
  exist (`produtoCodigo` = catalog `codigo` — the catalog has no lookup by id, deliveries also reference the code).
- LPP categories are a plain choice; NAO_CLASSIFICAVEL, SUSPEITA_LTP and MUCOSA are never ordered/compared as steps. Fixed tips per category.
- Tissue % (integers 0–100, sum must be 100 when given), exudate (aspect required unless AUSENTE, refused when AUSENTE), edge + tunnels
  (depth > 0, clock position 1–12), periwound skin (INTEGRA excludes the others), infection signs (covert/overt lists, systemic response → fixed
  notice, "Suspeita de biofilme" with the fixed hint, clinical impression), measurements (manual and/or photo), materials (record only), outcome.
- Outcome `desfecho` (required): EM_ACOMPANHAMENTO | CICATRIZADA | ENCERRADA (reason). Applied to the lesion ONLY when the consultation is signed
  (`LESAO_STATUS_ALTERADO`, consultaId stored); a draft never changes a lesion. Before signing, the evaluated lesions must still be ABERTA
  (closed by another consultation → 409, nothing signed). No transaction (same pattern as the charge): the consultation gets
  `desfechoLesoesStatus` APLICADO | PENDENTE_APLICACAO (only when some outcome closes a lesion). A failed lesion write leaves it signed with
  PENDENTE_APLICACAO (`LESAO_STATUS_NAO_APLICADO` + `CONSULTA_DESFECHO_LESOES_PENDENTE`).
- `POST /consultas/:id/lesoes/aplicar-desfecho` (ENFERMEIRO of the clinic, signed consultation only, idempotent) re-applies exactly the stored
  outcomes: a lesion already closed by THIS consultation is a no-op; one closed by ANOTHER consultation is not overwritten — audited
  (`LESAO_DESFECHO_CONFLITO`) and returned in `conflitos`. Conflicts are not failures (status becomes APLICADO). Web: a signed consultation
  with PENDENTE_APLICACAO shows a warning and the "Aplicar desfecho nas lesões" button.

## ABI (ITB) — informative only
Per limb (unique): value (2 decimals, 0.10–3.00), purpose DIAGNOSTICO_DAP | SEGURANCA_COMPRESSAO (**required**), method/equipment.
Fixed highlighted notice: "A faixa de diagnóstico não serve para decidir compressão." Value > 1.40 → "Índice não confiável (possível calcificação)."
Compression regions, compared in hundredths (tested, `regiaoItbCompressao`):

| value | region text |
|---|---|
| v < 0.60 | fora do escopo verificado |
| 0.60 ≤ v < 0.80 | conflito entre diretrizes |
| 0.80 ≤ v ≤ 1.20 | faixa em que todas as fontes compiladas admitem compressão |
| 1.20 < v ≤ 1.30 | conflito entre diretrizes |
| 1.30 < v ≤ 1.40 | fora da faixa de compressão de todas as fontes compiladas |
| v > 1.40 | no region (only the "não confiável" notice) |

DIAGNOSTICO_DAP shows only "faixa de diagnóstico 0,90–1,40". Never "pode comprimir"/"não comprimir". Boundaries approved by the owner
(2026-11-06); source: Compêndio Científico de Estomaterapia, cap. 27, quadros 28 and 29.

## Photos and measurement (zero AI)
- Photos are consultation attachments (`consultas_enfermagem_anexos`, 5b rules: author in draft uploads, clinic nurses read, no delete) with
  `lesaoId`; JPG/PNG only; the lesion must belong to the consultation's patient.
- Image consent (`consentimentos_imagem`): `{ obtidoEm, registradoPor, revogadoEm?, revogadoPor? }`, at most one in force per patient (unique
  partial index). No consent in force → photo presign refused (422, `CONSULTA_FOTO_RECUSADA_SEM_CONSENTIMENTO`); also re-checked on confirm.
  Revoking blocks new photos only; existing photos stay readable. Routes: `GET/POST /consentimentos-imagem`, `POST /consentimentos-imagem/:id/revogar`.
- Geometry (`packages/shared/src/consulta/geometria-ferida.ts`, same code in API and web): scale = real cm / pixel distance of the 2 ruler
  points; area = shoelace × scale²; length = largest distance between two contour points; width = largest extent perpendicular to that axis;
  2 decimals. Refused: calibration distance ≤ 0 or coincident points; contour < 3 points, repeated points, self-intersection, zero area.
- The API RECOMPUTES the result from the points (`normalizarModuloFerida`) and ignores the client's number; a measured photo must be a confirmed
  image attachment of the same consultation and the same lesion.
- Web tool: SVG layer over the photo (Pointer Events — mouse and touch), coordinates in the original image pixels; calibrate, then contour
  (add, drag, select/remove points). A measurement enters the module only when complete and valid (incomplete ones stay in screen state).

## History (patient page, read-only)
`GET /lesoes/historico?pacienteId=`: lesions (open first), each with the timeline of evaluations in SIGNED consultations and the measurement
points with their method (MANUAL | FOTO, photo = "estimativa por imagem"). Web: two small charts (length; area — photo only), marker shape per
method (circle = manual, square = photo) plus legend and the textual list; consent block; versioned correction form. Section shown to ENFERMEIRO
for FA patients.

## Routes (authorization matrix, all `E`)
`POST /lesoes`, `GET /lesoes`, `GET /lesoes/historico`, `GET /lesoes/:id`, `PATCH /lesoes/:id`, `GET /consentimentos-imagem`,
`POST /consentimentos-imagem`, `POST /consentimentos-imagem/:id/revogar`, `POST /consultas/:id/lesoes/aplicar-desfecho`. `POST /consultas/:id/anexos/presign-upload` gained optional `lesaoId`.

## Audit events
LESAO_CREATED, LESAO_CORRIGIDA (field names), LESAO_VIEWED, LESAO_LISTED, LESAO_HISTORICO_VIEWED, LESAO_STATUS_ALTERADO, LESAO_STATUS_NAO_APLICADO,
LESAO_DESFECHO_CONFLITO, CONSULTA_DESFECHO_LESOES_PENDENTE, CONSULTA_DESFECHO_LESOES_REAPLICADO,
CONSENTIMENTO_IMAGEM_REGISTRADO, CONSENTIMENTO_IMAGEM_REVOGADO, CONSULTA_FOTO_RECUSADA_SEM_CONSENTIMENTO. Metadata: ids, status, field names, counts.

## Indexes to create by hand in Atlas (autoIndex is development-only)
- `lesoes`: `{ pacienteId: 1, numero: 1 }` unique; `{ clinicaId: 1, pacienteId: 1, status: 1 }`; `{ clinicaId: 1 }`.
- `consentimentos_imagem`: `{ clinicaId: 1, pacienteId: 1 }` unique, `partialFilterExpression: { revogadoEm: { $type: 'null' } }`, name
  `consentimento_vigente_unico`; `{ clinicaId: 1, pacienteId: 1, criadoEm: -1 }`; `{ clinicaId: 1 }`.
