# Stage 4b — Patient financial module (charge REGISTRY + notices)

The system does **not** receive money from patients (the clinic is paid outside, on its own card machine). This module only
records charges and sends notices. No payment gateway, no checkout, no payment link. The old mercado-pago (SaaS
subscription) is not ported or touched, and neither are the legacy `financeiro` module and the psychology financial module.

## Module `cobrancas` (routes under `/cobrancas`, collection `cobrancas_paciente`)
- Fields: `tipo` (consulta_avaliacao | pacote_mensal | outro), `descricao` (free text), `valorCentavos` (integer cents),
  `itens[]` (`{descricao, valorCentavos}`), `formaPagamento` (a_vista | pix | credito | boleto | outro), `parcelas`,
  `vencimento`, `status`, optional `atendimentoId` / `planoId` (no hard validation yet: appointment/record comes in stage 5).
- **Status**: stored `pendente | enviada | paga | cancelada`; `vencida` is **derived on read** (pendente/enviada with a past due
  date), so it never goes stale without a job.
- **`itens` for the future checklist -> value**: empty today. If items come, the value is their sum (and a value sent together
  with items must match, otherwise 400). `somaItens()` is the single place for that rule.
- **Shortcut** `POST /cobrancas/consulta-avaliacao`: takes the value from the clinic configuration.
  `CobrancasService.criarConsultaAvaliacao()` is ready to be called by the automatic trigger tied to the first appointment
  (stage 5) — that trigger is NOT in this stage.
- **Mark as paid** is manual: records who and when, status -> `paga`. **Cancel** is logical (status + reason + who/when);
  a paid charge cannot be cancelled; nothing is ever physically deleted (a test guards the sources against delete calls).
  Updates are conditional on the stored status (no race between paying and cancelling).
- **Config per clinic** (`financeiro_config`, one doc per clinic): value of the evaluation appointment, editable by ADMIN
  (and SUPER_ADMIN). Default R$ 220,00 (`VALOR_CONSULTA_AVALIACAO_PADRAO_CENTAVOS`, the only place the number exists) is used until the
  clinic saves its own.
- **Notices**: `POST /cobrancas/:id/aviso` with channels `email` and/or `whatsapp`, through `NotificacoesService` (opt-out,
  send window and queue apply). One accepted channel is enough to move the charge to `enviada`; failed channels come back in
  the response. For a minor the notice goes to the legal guardian. New `TipoNotificacao.AVISO_COBRANCA`.
  `ResumoContatoPaciente` gained the effective `telefone` (guardian's phone when the guardian is the recipient).
- **Monthly summary** `GET /cobrancas/resumo?mes=AAAA-MM`: *a receber* and *vencido* by due date within the month, *recebido* by
  payment date within the month.

## Access (authorization matrix; SUPER_ADMIN always passes, PACIENTE never)
| Route | Roles |
|---|---|
| `POST /cobrancas`, `POST /cobrancas/consulta-avaliacao`, `GET /cobrancas`, `/resumo`, `/configuracao`, `/:id` | ADMIN, ENFERMEIRO, SECRETARIA |
| `PATCH /cobrancas/:id`, `POST /cobrancas/:id/aviso`, `PATCH /cobrancas/:id/pagar`, `PATCH /cobrancas/:id/cancelar` | ADMIN, ENFERMEIRO, SECRETARIA |
| `PUT /cobrancas/configuracao` | ADMIN |

`pacienteId` must belong to the token's clinic (404 otherwise). Audit events added: `LANCAMENTO_FINANCEIRO_CREATED`, `_UPDATED`,
`_ENVIADO`, `_PAGO`, `_CANCELADO` and `FINANCEIRO_CONFIG_UPDATED` (metadata: ids, field names, channels, status — never amounts,
descriptions or the cancellation reason).

## TODO(conteudo)
The notice text (`AVISO_COBRANCA` template, e-mail and WhatsApp) is only the minimal factual wording (amount and due date) and
must be reviewed by the clinic before real patients receive it. Labels of type/payment form/status are also pending review.

## Web
- `CobrancasSecao` in `PacienteDetailPage`: list, create/edit, "consulta de avaliação" shortcut, send notice, mark paid, cancel (with reason).
- `/financeiro-pacientes` (module Pacientes): monthly summary and the evaluation-appointment value. The SPA route is not
  `/financeiro` or `/cobrancas` because those prefixes belong to the API proxy (Vite regex gained `cobrancas`). The menu entry
  "Financeiro" now points here; the old psychology route is left untouched in `routes.tsx` but no longer in the menu.
- Items editing is not exposed in the UI yet (API ready).
