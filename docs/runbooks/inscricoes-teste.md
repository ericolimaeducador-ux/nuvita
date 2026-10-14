# Inscrições do teste beta (landing → API)

Módulo `apps/api/src/modules/inscricoes-teste`. Recebe as inscrições da landing do teste de
15 dias (25 vagas, teste **fictício**, sem cartão), grava no MongoDB e manda dois e-mails pelo
Resend (ou SendGrid), reaproveitando o `EmailSender` do módulo de notificações.

## Rotas

| Rota | Acesso | O que faz |
|------|--------|-----------|
| `POST /inscricoes-teste` | pública, 5 req/min por IP | Grava a inscrição. Resposta sempre `{ "recebida": true }` (não revela e-mail já cadastrado) |
| `GET /inscricoes-teste` | SUPER_ADMIN | Lista por ordem de inscrição, com `posicao` e `dentroDasVagas` (25 primeiras não canceladas) |
| `PATCH /inscricoes-teste/:id/status` | SUPER_ADMIN | `INSCRITA` · `CONFIRMADA` · `LISTA_DE_ESPERA` · `CANCELADA` |

A regra "quem entra" é do SUPER_ADMIN: `dentroDasVagas` é só um apoio (ordem de inscrição).

## Antes de publicar (nada disso é feito pelo código)

1. **Variável nova** `INSCRICOES_TESTE_EMAIL_AVISO` = e-mail que recebe o aviso de cada inscrição.
   Entra no `.env.production` → `node scripts/gen-cloudrun-env.cjs` → secret `CLOUDRUN_ENV_YAML`.
2. **E-mail:** `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` e `EMAIL_FROM` já usados pelas notificações.
   No Resend, o domínio do `EMAIL_FROM` precisa estar verificado (SPF/DKIM), senão a confirmação para a
   candidata cai em spam ou é recusada.
3. **CORS:** `https://www.nuvita.app.br` foi acrescentado a `PROD_ORIGINS` em `scripts/gen-cloudrun-env.cjs`
   (a landing fica em `www.nuvita.app.br/teste-psi/`). Só vale depois de regerar o env e fazer deploy da API.
4. **Índice único do e-mail** (autoIndex fica desligado em produção). Uma vez, no Mongo:
   ```js
   db.inscricoes_teste.createIndex({ email: 1 }, { unique: true })
   ```
   Sem ele a checagem de e-mail repetido ainda funciona, mas duas inscrições simultâneas podem duplicar.
5. **Termo:** `TERMO_TESTE_VERSAO_ATUAL` (constants) e `TERMO_VERSAO` (landing) precisam ser iguais. Ao
   revisar o texto do termo, suba as duas. Texto atual é PROPOSTA, pendente de revisão do Advogado.

## Teste manual (após deploy em ambiente de teste)

```bash
curl -i -X POST https://<api>/inscricoes-teste -H 'Content-Type: application/json' -d '{
  "nome":"Teste Silva","email":"voce@exemplo.com","whatsapp":"(11) 90000-0000","crpNumero":"06/00000",
  "cidadeEstado":"São Paulo, SP","modoAtendimento":"Online","termoVersao":"teste-beta-v1-2026-10",
  "aceiteTermo":true,"aceitePrivacidade":true}'
```
Esperado: `201` com `{"recebida":true}`, um e-mail para `INSCRICOES_TESTE_EMAIL_AVISO` e outro para o e-mail informado.

## Dados e LGPD

Guarda nome, e-mail, WhatsApp, CRP, cidade/UF e respostas livres de **profissionais** (nunca de pacientes),
mais a prova do aceite (versão do termo, data/hora, IP, navegador). Não há criptografia em repouso própria
além da do banco. Definir controlador e prazo de retenção antes do lançamento (pendente: 7Safe ou Dealer).
Pedidos de correção/exclusão: hoje manuais, direto na collection `inscricoes_teste`.
