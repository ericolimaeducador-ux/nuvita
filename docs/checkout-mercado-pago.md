# Checkout Mercado Pago (Wallet Brick) — ambiente de teste

Validação técnica: o Wallet Brick é uma **terceira opção** no card da Psicologia, ao lado dos dois
links diretos (Pix e 12x), que seguem funcionando. Só a modalidade à vista (R$ 599,90) por enquanto.

Fluxo: navegador (Public Key) → `POST /pagamentos/preferencia` (API usa o Access Token, que nunca sai
do servidor) → id da preferência → Wallet Brick → pagamento → Mercado Pago chama
`POST /pagamentos/webhook` → a API valida a assinatura, **consulta o pagamento na API do MP** e
registra em `pedidos_pagamento` (não libera acesso: o provisionamento continua manual).

## Variáveis de ambiente (nunca commitar valores)

| Onde | Variável | Observação |
|---|---|---|
| `apps/api/.env` | `MERCADO_PAGO_ACCESS_TOKEN` | Token de **teste** (`TEST-…`). Segredo de servidor. |
| `apps/api/.env` | `MERCADO_PAGO_WEBHOOK_SECRET` | Painel MP > Suas integrações > Webhooks (modo teste). Recomendado no teste; **obrigatório em produção**. |
| `apps/api/.env` | `MERCADO_PAGO_NOTIFICATION_URL` | `https://<túnel>/pagamentos/webhook` (ver abaixo). |
| `apps/web/.env.local` | `VITE_MERCADO_PAGO_PUBLIC_KEY` | Public Key de **teste**. Sem ela, a opção nem aparece na landing. |

`.env` e `.env.local` estão no `.gitignore`. Depois de editar o `.env` da API, **reinicie a API**.

## Túnel cloudflared (para o webhook chegar na sua máquina)

O Mercado Pago só notifica URLs públicas em HTTPS. Com a API rodando em `localhost:3000`:

```powershell
C:\Users\erico\tools\cloudflared\cloudflared.exe tunnel --url http://localhost:3000
```

(`cloudflared` portátil, versão 2026.9.1, instalado nesse caminho; sem conta nem login.)

1. O comando imprime uma URL `https://<palavras>.trycloudflare.com`. Ela **muda a cada execução**.
2. Coloque `MERCADO_PAGO_NOTIFICATION_URL=https://<palavras>.trycloudflare.com/pagamentos/webhook`
   em `apps/api/.env` e reinicie a API. (Alternativa: cadastrar a mesma URL no painel do Mercado Pago.)
3. Se usar o painel, o segredo do webhook (`MERCADO_PAGO_WEBHOOK_SECRET`) é gerado ali.
4. Confira o túnel: `curl https://<palavras>.trycloudflare.com/health` deve responder 200.
5. **Ao terminar, pare o túnel (Ctrl+C).** Enquanto ele roda, **a API local inteira fica acessível
   pela internet** (não só o webhook). Use só durante o teste.

## Teste de pagamento (só com credenciais de teste)

1. `npm run api:dev` e `npm run dev` (web em `http://localhost:5173`), túnel no ar.
2. Na landing, seção Psicologia: "Pagar direto aqui" → Wallet Brick.
3. Use os cartões/usuários de teste da documentação oficial do Mercado Pago (o nome do titular define
   se aprova ou recusa). Nunca use cartão real com credenciais de teste.
4. Conferir o registro (mongosh): `db.pedidos_pagamento.find().sort({criadoEm:-1}).limit(3)` — o
   pedido deve sair de `pendente` para o status do pagamento (`approved`, `rejected`…), com
   `pagamentoId`, `valorPago` e `divergenciaValor: false`.
5. Os logs da API trazem eventos JSON (`mp_preferencia_criada`, `mp_pagamento_registrado`, …), sem
   tokens nem dados do pagador.
