## Feature: Clínica com CPF ou CNPJ

### Description

Pedido do usuário (15/10/2026), registrado literalmente:

> implementar a possibilidade de cadastro da clinica com CPF e CNPJ.

### Problem

Muitos psicólogos atendem como pessoa física (sem CNPJ). O cadastro de clínica exigia CNPJ,
o que bloqueava o onboarding dos 25 testers do teste beta (início 30/10/2026). Além disso, a
Receita Federal emite CNPJ alfanumérico desde julho de 2026, e o código apagava letras.

### Solution and trade-offs

- `tipoDocumento` (CPF | CNPJ) + `documento` no cadastro (super-admin, CLI `--cpf`/`--cnpj`).
- Validação de dígitos verificadores de CPF e de CNPJ (numérico e alfanumérico) em
  `packages/shared/src/documentos`, espelhada à mão no web (teste de sincronia na API).
- **Banco:** o campo continua `cnpj` (dados e índice único existentes); passa a guardar o
  documento normalizado. Novo campo `tipoDocumento`; clínicas antigas sem ele = CNPJ.
  CPF (11 dígitos) e CNPJ (14 caracteres) não colidem no índice. Sem migração.
- Trade-off: nome do campo no banco não reflete mais o conteúdo; documentado no schema.
- CPF é dado pessoal do profissional: exibido só no painel super-admin.

### Acceptance criteria

- [x] CPF válido cria clínica; CPF/CNPJ com dígito errado → 400 com "CPF inválido."/"CNPJ inválido."
- [x] CNPJ alfanumérico oficial (12.ABC.345/01DE-35) aceito.
- [x] Documento repetido → 409 "CPF já cadastrado."/"CNPJ já cadastrado."
- [x] Clínicas antigas (sem `tipoDocumento`) aparecem como CNPJ.
- [x] Painel: seletor CPF/CNPJ, validação na tela, lista com documento formatado.
