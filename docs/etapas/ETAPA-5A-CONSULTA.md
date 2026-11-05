# Stage 5a — Nursing consultation core (Estomaterapia)

Structure of the nursing process in 5 steps (Res. Cofen 736/2024): **Avaliação, Diagnóstico, Planejamento, Implementação,
Evolução**. No clinical content is provided by the system: no diagnosis list, no scale, no NANDA-I/CIPE terms. Every field
is the nurse's free text. Labels without a source are `TODO(conteudo)`.

## Model (`consultas_enfermagem`, module `consultas`)
- `clinicaId` (always from the token), `pacienteId`, `enfermeiroId` (author), `status` RASCUNHO | ASSINADA, timestamps,
  `assinatura` (HMAC-SHA256 with `PRONTUARIO_SIGNATURE_SECRET` over the clinical content + author + COREN from the profile +
  date — same pattern as the inherited prontuário).
- `avaliacao` { dadosSubjetivos, dadosObjetivos, modulos[] }. `modulos` is a typed slot by area (IU | INCONTINENCIA_ANAL | FERIDA |
  OSTOMIA): each area is validated by a definition registered in `ModulosAvaliacaoRegistry` (class-validator DTO). **No area is
  registered in this stage**, so any module is refused; a fake test module proves valid/invalid/extra/repeated handling.
- `diagnosticos` [{ texto, origem MANUAL | IA_ACEITA | IA_EDITADA }] — only MANUAL is writable (IA comes in 5f).
- `planejamento` { prioridades, resultadosEsperados, prescricaoEnfermagem[], examesSolicitados, encaminhamentos }.
- `implementacao.registros` [{ padrao AUTONOMO | INTERPROFISSIONAL | PROGRAMA_SAUDE, descricao, registradoEm, registradoPor }].
- `evolucao` { texto }.
- Addenda (`consultas_enfermagem_adendos`): sequential number per consultation (1, 2, 3…; unique index consultaId+numero, retry
  on E11000), mandatory reason (min 10 chars), author and date. Only after signing, only by the author.

## Rules
- Locking after signing is a **project choice** (not a Cofen requirement): conditional update RASCUNHO -> ASSINADA; afterwards only
  the charge situation can change; corrections go through addenda. Nothing is physically deleted.
- Access (diverges from the psi prontuário on purpose — team care, not psychotherapy secrecy): **read** = any ENFERMEIRO of the
  clinic (a read by a non-author is audited); **create / edit draft / sign / addendum** = only the author ENFERMEIRO (diagnosis and
  prescription are exclusive to nurses — Res. 736 art. 6º). ADMIN, SUPER_ADMIN and SECRETARIA have no access to clinical content
  (as in psi). Patient or consultation of another clinic -> 404.

## Charge on signing ("sign first, charge after")
- `POST /consultas/:id/assinar` body `{ cobranca: { incluidaEmPacote, valorCentavos? } }`. The decision (package, or value = sent
  value or the clinic default) is stored in the consultation at signing time.
- Not in a package: after the signature, `CobrancasService.gerarCobrancaDeConsulta` creates the charge linked by `consultaId`.
  Idempotent: unique partial index on `cobrancas_paciente.consultaId`; E11000 returns the existing one.
- If the charge fails, the consultation stays signed with `cobranca.status = PENDENTE_GERACAO` (audited);
  `POST /consultas/:id/cobranca` (author ENFERMEIRO or ADMIN; no clinical content returned) generates it with the stored value.
- The generated charge has type `consulta_enfermagem` (description "Consulta de enfermagem", TODO(conteudo)); this type is refused in manual creation and hidden in the manual form. No charge existed in any real DB and no seed/script creates charges, so no migration was needed.
- Package: no charge, audit `CONSULTA_COBRANCA_INCLUIDA_EM_PACOTE`. Statuses: GERADA | INCLUIDA_EM_PACOTE | PENDENTE_GERACAO.
- No Mongo transaction (repositories take no session; local Mongo is standalone) — decided by the owner.

## Routes (authorization matrix)
`POST /consultas`, `GET /consultas`, `GET /consultas/:id`, `PATCH /consultas/:id`, `POST /consultas/:id/assinar`,
`POST /consultas/:id/adendos` = ENFERMEIRO; `POST /consultas/:id/cobranca` = ADMIN, ENFERMEIRO. (SUPER_ADMIN passes the role guard
but the service refuses clinical content, like the prontuário.)

## Audit events
CONSULTA_ENFERMAGEM_CREATED / _UPDATED / _SIGNED / _VIEWED / _LISTED / _ADENDO_CREATED, CONSULTA_COBRANCA_GERADA / _PENDENTE /
_INCLUIDA_EM_PACOTE. Metadata: ids, step names, counts — never clinical text.

## Web
- `/pacientes/:id/consultas/:consultaId` (ENFERMEIRO): 5-step stepper, save draft, empty "Módulos da avaliação" area, signing dialog
  with the charge section (clinic default value editable, reais <-> cents via `lib/dinheiro.ts`, "Incluída em pacote — não cobrar"),
  read-only view when signed (or when the viewer is not the author), addenda list + "Adicionar adendo", warning + "Gerar cobrança"
  when PENDENTE_GERACAO.
- Patient page: chronological, read-only list of consultations (ENFERMEIRO only).
- Legacy prontuários are untouched and read-only.
