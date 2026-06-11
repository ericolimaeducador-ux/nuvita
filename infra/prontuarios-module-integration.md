# Prontuario module integration

Register `ProntuariosModule` in the API root module after `AuthModule`.

Required environment variable:

```env
# Used to produce the signature hash. If absent, JWT_ACCESS_SECRET is used.
PRONTUARIO_SIGNATURE_SECRET=long-random-secret
```

CID-10 autocomplete uses the `cid10` MongoDB collection:

```json
{ "codigo": "A00", "descricao": "Colera" }
{ "codigo": "I10", "descricao": "Hipertensao essencial (primaria)" }
```

Recommended indexes:

```js
db.cid10.createIndex({ codigo: 1 }, { unique: true })
db.cid10.createIndex({ codigo: "text", descricao: "text" })
db.prontuarios.createIndex({ clinicaId: 1, pacienteId: 1, dataAtendimento: -1 })
db.prontuario_addendums.createIndex({ prontuarioId: 1, criadoEm: 1 })
```

Retention rule:

- No delete endpoint is exposed.
- Mongo schema middleware rejects delete operations on `prontuarios`.
- Addendums are append-only and reject update/delete operations.
- Signed medical records are immutable; use `POST /prontuarios/:id/addendums`.
