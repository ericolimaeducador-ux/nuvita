# Achados da matriz de autorização — 2026-11-03

Origem: rascunho gerado do código atual (`apps/api/src/common/security/authorization-matrix.expected.ts`).
Nenhum código de produto foi alterado; a matriz registra o comportamento ATUAL e marca cada item com `ACHADO: revisar`.
Pendente de revisão humana.

## A. Rotas sem RolesGuard e sem marcação pública (qualquer usuário autenticado acessa)

Têm `JwtAuthGuard` + `TenantRequiredGuard`, mas nenhum `@Roles`/`RolesGuard`. Qualquer papel logado com `clinicaId`
(inclusive PACIENTE) chega ao dado da clínica. Na matriz estão como `LOGADO`.

| Método | Caminho | Controller | O que faz |
|---|---|---|---|
| GET | /analytics/pacientes | AnalyticsController | Indicadores agregados de pacientes da clínica |
| GET | /analytics/agendamentos | AnalyticsController | Indicadores de agendamentos |
| GET | /analytics/financeiro | AnalyticsController | Indicadores financeiros da clínica |
| GET | /analytics/notificacoes | AnalyticsController | Indicadores de notificações enviadas |
| GET | /analytics/pacientes-por-cateter | AnalyticsController | Contagem de pacientes por tipo de cateter |
| GET | /analytics/pacientes-por-representante | AnalyticsController | Contagem de pacientes por representante |
| GET | /analytics/entregas-no-mes | AnalyticsController | Entregas de materiais no mês |
| GET | /analytics/sondas-no-mes | AnalyticsController | Sondas utilizadas no mês |
| GET | /analytics/aguardando-relatorio | AnalyticsController | Pacientes aguardando relatório |
| GET | /analytics/pacientes-por-etapa | AnalyticsController | Pacientes por etapa do fluxo clínico |
| GET | /produtos | ProdutosController | Lista o catálogo de produtos (filtro por tipo) |
| GET | /produtos/:codigo | ProdutosController | Busca produto pelo código |

Observação: `/analytics/*` é gerencial (financeiro, pacientes); o desenho provável é restringir a ADMIN/SECRETARIA/profissionais.
`/produtos` é catálogo, risco menor, mas também sem guarda de papel.

## B. Rota pública com efeito colateral relevante

| Método | Caminho | Controller | O que faz |
|---|---|---|---|
| POST | /auth/register | AuthController | Registro público: cria usuário PACIENTE sem clínica. Só funciona se `allowPublicRegistration` estiver ligado (senão 403). Confirmar que está desligado em produção. |

## C. Rotas públicas por desenho (confirmar que a credencial alternativa basta)

Sem RolesGuard por natureza; marcadas `PUBLICO` na matriz com a credencial no comentário.

| Método | Caminho | Controller | Credencial / proteção |
|---|---|---|---|
| POST | /auth/login, /auth/forgot-password, /auth/reset-password, /auth/forgot-login, /auth/forgot-login/verify, /auth/refresh | AuthController | Rate limit por IP (AuthThrottlerGuard) |
| GET | /health | HealthController | Nenhuma (health check; faz ping no MongoDB) |
| POST | /pagamentos/preferencia | MercadoPagoController | Rate limit por IP; preço decidido no servidor |
| POST | /pagamentos/webhook | MercadoPagoController | Validação de assinatura + consulta à API do MP; sem throttling |
| POST | /captacao | CaptacaoController | PIN do captador (CaptadorPinGuard) + rate limit |
| GET/POST | /telemedicina/acesso/:token (+ /entrar, /sinais, /eventos) | TelemedicinaAcessoController | Apenas o token da sala na URL (5 rotas) |

## D. Lacuna fora da matriz: validação de referências do payload (D4)

O nuvita-psi tem teste garantindo que `pacienteId`, `medicoId` e `agendamentoId` do payload pertencem à clínica antes de criar.
No Nuvita não existe `validarReferencias`; `AgendamentosService.create` e `ProntuariosService.create` gravam `dto.pacienteId`/`dto.medicoId`
direto (a clínica vem do token, os ids de referência não são conferidos). O teste portado ficou como `it.todo`
(`validacao-referencias-controllers.spec.ts`). Risco: referência cruzada entre clínicas. Verificar também telemedicina (createSala) e documentos (presign).

## E. Observações menores
- PACIENTE aparece em `PATCH /agendamentos/:id/cancelar`, `PATCH /notificacoes/preferencias/:pacienteId/opt-out`, `GET /telemedicina/salas/:id` e `POST /telemedicina/salas/:token/entrar`, embora o paciente não tenha login no produto atual (acesso por `/tele/:token`). Confirmar se o papel PACIENTE logado deve existir.
- `GET /avaliacao-iu/minhas` exclui ADMIN e SECRETARIA (provavelmente intencional: "minhas").
- Prontuários: só MEDICO/ENFERMEIRO/PSICOLOGO (ADMIN e SECRETARIA fora) — consistente com sigilo clínico, mas SUPER_ADMIN passa por desenho do RolesGuard.
