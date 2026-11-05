# Stage 5b — Assessment modules: urinary incontinence (IU) and anal incontinence

Content strictly limited to the owner's specification (Compêndio Científico de Estomaterapia, chapters 4, 16 and 18). No
Bristol scale (name, drawing or description of its types), no ICIQ / Wexner / FIQL or any itemised instrument (stage 5e), no
automatic conduct, no traffic light or computed severity. Labels created here are `TODO(conteudo)`; the digital vaginal/rectal
exam items carry `TODO(legal)`.

## Classification meaning (corrected)
Stage 2 had recorded a deduced meaning. Confirmed by the owner: **IU = incontinence (urinary AND anal)**, **FA = wounds**,
**OT = ostomies**. Fixed in the enum comment (`packages/shared/src/paciente/classificacao.ts`) and in the web labels. Enum
values, stored data and `elegivelFluxoClinico` (only pure `[IU]` enters the flow) are unchanged.

Module availability (`CLASSIFICACAO_DO_MODULO`): IU and INCONTINENCIA_ANAL -> IU; FERIDA -> FA and OSTOMIA -> OT are mapped for
5c/5d but have no module yet.

## Shared types and validation (`packages/shared/src/consulta`)
Dependency-free; the API registers `VALIDADORES_MODULO` in `ModulosAvaliacaoRegistry`, the web imports the same file through the
`@shared` alias. Unknown keys are rejected and errors carry field names only, never values.
- **IU**: anamnese (texts); classificacaoInicial (ESFORCO | URGENCIA | MISTA | INDEFINIDA; MISTA requires predominante);
  exameFisico items `{ realizado, achado? }` (vaginal/rectal never required); residuoPosMiccional `{ realizado, volumeMl?, metodo? }`;
  testeAbsorvente (optional, collapsed in the UI); urinaliseFita (POSITIVO | NEGATIVO | NAO_REALIZADO, record only);
  urodinamica `{ encaminhamentoIndicado, motivo? }`; diarioMiccional `{ dataInicio, dataFim, anexos, resumo }` with a non-blocking
  alert under 3 days.
- **Anal incontinence**: historia (texts); tipoPerda / subtipo (multiple); consistenciaFezes (SOLIDA | PASTOSA | LIQUIDA, the
  service's own categories) with origemInformacao required when present; exameFisico (inspeção perianal, retal digital);
  sinaisAlarme (multiple, warning only); diarioIntestinal (no period alert).
- Fixed notices (exact texts) live in `AVISOS_IU` / `AVISOS_ANAL`.

## Signature and access
Module content is part of `avaliacao`, so it is covered by the HMAC signature and locked after signing (corrections by addendum).
Same access as 5a: nurses of the clinic read, only the author writes/signs. A module not allowed by the patient's classification is
refused (400). Audit metadata adds the module areas only.

## Attachments (`consultas_enfermagem_anexos`)
Paper diary photos/PDFs. Only the R2 storage service of the documents module is reused (`S3DocumentStorageService`, registered in
the consultas module; the documents module itself is untouched). Rules: linked by `consultaId`; upload/confirm only by the
author and only while RASCUNHO; read (list / access URL) = whoever reads the consultation, every access URL audited with
`autor: true|false`; no delete route; not listed by `GET /documentos`, so SECRETARIA/ADMIN never see them. PDF/JPG/PNG only (no
DICOM), same size limit as documents (`MAX_DOCUMENT_SIZE_BYTES` = **10 MB** — the documents error message says 50 MB, but the
constant is 10 MB). Object key `{clinicaId}/consultas/{consultaId}/{uuid}.ext` (no personal data). A diary may only cite confirmed
attachments of the same consultation.

Routes (matrix, all ENFERMEIRO): `POST /consultas/:id/anexos/presign-upload`, `POST /consultas/:id/anexos/:anexoId/confirmar-upload`,
`GET /consultas/:id/anexos`, `GET /consultas/:id/anexos/:anexoId/access-url`. Audit: CONSULTA_ANEXO_UPLOAD_URL_CREATED,
CONSULTA_ANEXO_CONFIRMED, CONSULTA_ANEXO_VIEW_URL_CREATED.

## Web
Avaliação step: "Adicionar módulo" lists only the modules available for the patient's classification; each module is a collapsible
section with the fixed notices; diary upload with preview (image inline, PDF link) and the summary beside it; read-only when signed.
