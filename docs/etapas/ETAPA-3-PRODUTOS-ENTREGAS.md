# Stage 3 (part 1) — produtos (operational catalogue) and entregas, wired to the clinical flow

Branch: `estomaterapia/etapa3-produtos-entregas` (base: `estomaterapia/integracao`). Deploys remain disabled.
Reference code: the old Nuvita (`git show b908c02^1:<path>`). No landing page, checkout or mercado-pago (stage 4).

## produtos (operational catalogue, global)

- Ported: entity, schema (`produtos`), repository, service, controller, DTOs, module. **No e-commerce.**
- **The catalogue starts EMPTY.** The old service seeded ~28 real products at boot (`onApplicationBootstrap` + hard-coded list);
  that seed was **not ported**. `scripts/seed-produtos.mjs` is an explanatory stub (no data). Products are created by an ADMIN
  (new screen "Catálogo de produtos", `/catalogo-produtos`, or `POST /produtos`) or imported later from an official list.
  The real database already holds the old seeded rows; nothing here touches them.
- **Global catalogue (no `clinicaId`)**, as in the old Nuvita. Comment left in `produto.entity.ts`/schema: a per-clinic catalogue is a future decision.
- The old module only had two read routes. Added (admin only): `POST /produtos`, `PATCH /produtos/:codigo`, `PATCH /produtos/:codigo/desativar`
  (logical removal: `ativo=false`, since past deliveries reference the code). The code is unique (409 on duplicate) and cannot be edited.
- Reading: non-admins only ever see active products, even asking for inactive ones.
- `TipoProduto` keeps the three existing values (data already uses them): **TODO(conteudo)** — the catalogue vocabulary (VaPro/Acticoat/Samtronic, "sonda", "coletor", Siafisico) is IU-specific.

## entregas

- Ported: entity, schema (`entregas`), repository, service, controller, DTOs, module (tenant-scoped by `clinicaId`).
- `confirmarEntrega` sets `ENTREGUE` and calls `PacientesService.avancarEtapaFluxo(..., CONCLUIDO)`. That method (stage 2) is forward-only, swallows errors
  and **ignores patients that are not eligible** (classification exactly `[IU]`): a delivery for a patient outside the flow confirms normally and does **not** change the stage.
- New vs old: audit of create/confirm (`ENTREGA_CREATED`, `ENTREGA_CONFIRMED` — both already existed in the enum; metadata has ids/counts only), the patient must belong to the
  token's clinic (404 otherwise), items are validated one by one (integers, quantity >= 1, at least one item, no client-provided `categoria`).
- `avaliacaoIuId` stays as an optional reference (the avaliacao-iu module is not ported yet).

## Authorization (matrix)

| Route | Roles (SUPER_ADMIN always passes) |
|---|---|
| `GET /produtos`, `GET /produtos/:codigo` | ADMIN, ENFERMEIRO, SECRETARIA |
| `POST /produtos`, `PATCH /produtos/:codigo`, `PATCH /produtos/:codigo/desativar` | ADMIN |
| `POST /entregas`, `GET /entregas`, `GET /entregas/:id` | ADMIN, ENFERMEIRO, SECRETARIA |
| `POST /entregas/:id/confirmar` | ADMIN, ENFERMEIRO |

PACIENTE has no access to any of them. No exception to the global throttler was needed. The `produtos|entregas` prefixes were added to the Vite dev-proxy allow-list.

## Audit events added

`PRODUTO_CREATED`, `PRODUTO_UPDATED`, `PRODUTO_DEACTIVATED`. (The old entregas code emitted no audit event; `ENTREGA_CREATED` / `ENTREGA_CONFIRMED` already existed and are now used.)

## Web

- `ProdutosPage` at `/catalogo-produtos` (module Clínica => ADMIN/SUPER_ADMIN; the route deliberately does not start with `/produtos`, which the dev proxy sends to the API): list, show inactive, create, edit, deactivate.
- `EntregasSecao` inside the patient detail page: list, register (products picked from the catalogue, quantity, unit value in R$), confirm (ENFERMEIRO/ADMIN/SUPER_ADMIN only).
- Not ported: landing, checkout, `FluxoPacientePage` (the delivery step will move into it when it exists).

## Pending

- Catalogue content (list of products) and the IU-specific vocabulary (TODO(conteudo)).
- Item totals are taken from the client (as before); only structural validation was added. Arithmetic cross-checks (quantity x unit = item total, sum = total) are a decision.
- `confirmarEntrega` can be called again on an already confirmed delivery (same as before; the stage rule keeps it harmless).
