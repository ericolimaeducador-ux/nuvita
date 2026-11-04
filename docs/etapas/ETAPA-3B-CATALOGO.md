# Stage 3b — Catalogue: free-form product line + two Cure Dextra catheters

## Product type / line
- `produtos.tipo` is no longer a closed enum (VaPro / Acticoat / Samtronic). It is a **string**: required, non-empty, trimmed
  (DTO `@Transform(trim)` + `@IsString` + `@IsNotEmpty`; Mongoose `required`, `trim`, `minlength: 1`). The same rule applies to
  the `tipo` filter of `GET /produtos`.
- The three existing values stay valid (`TipoProduto` is kept as a list of known constants, not as a validator).
- A new line/brand is registered by an ADMIN through the existing catalogue screen (`Tipo / linha` is now a text input with
  suggestions) or `POST /produtos` — no code change.
- Delivery item category: `categoriaDoTipo()` keeps the exact mapping for the known types and falls back by prefix
  (`cateter_`/`sonda_` → sonda, `coletor_` → coletor, anything else → outro).
- Authorization matrix: unchanged (same routes, same roles).

## Seed `scripts/seed-sondas-cure-dextra.mjs`
- Two products (12 Fr / 14 Fr), idempotent by `codigo`, dry-run by default, writes only with `--apply`. **Not run against any DB.**
- Stored fields only: name, gauge, code (+ the catalogue's required neutral fields). No regulatory data or datasheet.
- `codigo` uses the ICC code (510795 / 510796): numeric and unique like the existing catalogue codes. SAP is shared by both
  catheters, so it cannot be the unique key. **To be confirmed by the owner.**
- `comprimentoCm` is intentionally absent (the datasheet does not state it) — to be filled in via the catalogue screen.
- Defaults to review: `sexo=universal`, `embalagem=standard`, `projeto=ALPHA`, `tipo=cateter_cure_dextra`.
