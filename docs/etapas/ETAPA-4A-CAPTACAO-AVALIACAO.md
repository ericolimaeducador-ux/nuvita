# Stage 4a — Lead capture and urinary-incontinence (IU) assessment

Ported from the old Nuvita (`b908c02^1`) into the psi base. Landing page, checkout and mercado-pago are NOT part of
this stage (4b).

## captacao (lead -> patient)
- Collection name kept as in the old code, **`capitacao_paciente`** (typo included), to match the real data.
- Public `POST /captacao`: protected only by `CaptadorPinGuard` (header `x-captador-pin`, env `PIN_CAPTADOR`), with an
  explicit `@Throttle` (10/min per IP) on top of the global throttler. Listing and exporting use the normal login.
- `CaptadorPinGuard` now **fails closed**: without `PIN_CAPTADOR`, only `NODE_ENV` = `development`/`test` falls back to the
  dev PIN; any other value (including unset) refuses the request. The old code only refused `production`/`staging`.
- **Export lead -> patient**: the patient is created through `PacientesService.create` with `classificacoes=['IU']`
  (captation is the IU programme only). Because it is eligible for the clinical flow, the service itself sets
  `etapaFluxo = AGUARDANDO_ATENDIMENTO`.
- The export applies the psi patient validation (`CreatePacienteDto`: valid CPF when present, birth date required and not in
  the future, `clinicaId` as ObjectId). A lead that fails stays `pendente` (lock released) and the API answers 400 listing
  only the field NAMES. Minors need a legal guardian, which captation does not collect, so they are refused by
  `PacientesService.create` as well.
- **Complete a lead before exporting**: `PATCH /captacao/:id` (same roles as the queue) saves name, CPF, birth date, address,
  e-mail and, for minors, the legal guardian plus the guardian authorization (stored encrypted, like the other lead fields).
  Same rules as `CreatePacienteDto` (valid CPF, birth date not in the future). It only saves: it never exports, and only
  `pendente` leads can be edited. A minor without guardian data is still refused on export by `PacientesService.create`.
  The public form stays light (birth date still optional there).
- Audit: `CAPTACAO_UPDATED` (id and field NAMES only), `CAPTACAO_CREATED` (public, no user: ip/user-agent, lead id and captor code only) and `CAPTACAO_EXPORTED`.

## avaliacao-iu
- Collection `avaliacoes_iu` kept; the clinical content (about 33 fields, enums, labels) is kept as is and marked `TODO(conteudo)`.
- **Trigger**: `AvaliacaoIUService.create` -> `PacientesService.avancarEtapaFluxo(AVALIACAO_IU)` (forward-only, never throws,
  ignores patients outside the flow). A non-IU patient gets the assessment recorded and keeps their stage.
- The patient must belong to the token's clinic (404 otherwise); `pacienteId` is validated as ObjectId; `produtoIndicado`
  is now a validated nested object (it used to be an unchecked object).
- Soft delete kept. New audit events: `AVALIACAO_IU_UPDATED`, `AVALIACAO_IU_DELETED` (`CREATED`/`VIEWED` already existed and are now
  emitted). Metadata: ids and field NAMES only, never clinical values.
- `AvaliacaoIUService.pertenceAoPaciente()` closes the loose reference from stage 3: **follow-up** and **deliveries** now
  validate `avaliacaoIuId` (exists, same clinic, same patient; 404 otherwise). It stays optional.

## Access (authorization matrix; SUPER_ADMIN always passes, PACIENTE never)
| Route | Roles |
|---|---|
| `POST /captacao` | public (PIN) |
| `GET /captacao`, `PATCH /captacao/:id`, `POST /captacao/:id/exportar` | ADMIN, ENFERMEIRO, SECRETARIA |
| `POST /avaliacao-iu`, `PATCH /avaliacao-iu/:id`, `PATCH /avaliacao-iu/:id/excluir` | ADMIN, ENFERMEIRO |
| `GET /avaliacao-iu/minhas` | ENFERMEIRO |
| `GET /avaliacao-iu`, `/count`, `/:id` | ADMIN, ENFERMEIRO, SECRETARIA |

## Web
- `/captacao_pacientes` (public, PIN screen) and `/captacao-pacientes` (queue management, module Pacientes) — the SPA has no
  `/captacao` route because that prefix belongs to the API proxy. Vite proxy regex gained `captacao|avaliacao-iu`.
- `AvaliacaoIuSecao` + `AvaliacaoIUDialog` in `PacienteDetailPage` (same pattern as the stage 3 sections). `FluxoPacientePage` is NOT ported.
- Queue screen: "Completar" action per lead (`CompletarLeadDialog`; guardian block appears for minors). Follow-up form: optional
  "Avaliação de origem" picker listing the patient's IU assessments (sends `avaliacaoIuId`; the API validates it).
