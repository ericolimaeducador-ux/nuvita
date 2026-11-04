# Stage 3b — Catalogue: free-form product line + two Cure Dextra catheters

## Product type / line
- `produtos.tipo` is no longer a closed enum. It is a **string**: required, non-empty, trimmed (DTO `@Transform(trim)` +
  `@IsString` + `@IsNotEmpty`; Mongoose `required`, `trim`, `minlength: 1`). Same rule for the `tipo` filter of `GET /produtos`.
- The three existing values (`cateter_vapro`, `coletor_acticoat`, `cateter_samtronic`) stay valid. A new line is registered by
  an ADMIN on the catalogue screen (`Tipo / linha` is a text input with suggestions) or `POST /produtos`.
- Delivery item category (`categoriaDoTipo`): explicit map for the known types and for `Cure Dextra` (sonda); unknown types
  fall back by prefix (`cateter_`/`sonda_` → sonda, `coletor_` → coletor) and otherwise "outro".
- Enums extended for the new products: `ProjetoCatalogo.SIGMA = 'Sigma'`, `EmbalagemProduto.CAIXA_90 = 'caixa_90'`.
- Authorization matrix: unchanged.

## Seed `scripts/seed-sondas-cure-dextra.mjs`
Idempotent by `codigo`, dry-run by default, writes only with `--apply`. **Not run against any DB.**

| field | 12 Fr | 14 Fr |
|---|---|---|
| codigo | 510795 | 510796 |
| nome | Cure Dextra Universal 12Fr Caixa 90 | Cure Dextra Universal 14Fr Caixa 90 |
| tipo | Cure Dextra | Cure Dextra |
| sexo | universal | universal |
| embalagem | caixa_90 | caixa_90 |
| projeto | Sigma | Sigma |
| french | 12 | 14 |
| descricaoTecnica | Sonda Cure Dextra, ponta reta, calibre 12 Fr | Sonda Cure Dextra, ponta reta, calibre 14 Fr |
| comprimentoCm | absent | absent |

- `comprimentoCm` is **pending**: the datasheet does not state it; the owner fills it in via the catalogue screen.
- No regulatory data or datasheet is stored. Other codes (SAP, EAN, SIMPRO) live only in the script comment.
- Note: existing products use snake_case types (`cateter_vapro`) and the `ALPHA`/`BETA` projects; the values above were
  explicitly confirmed by the owner instead.
