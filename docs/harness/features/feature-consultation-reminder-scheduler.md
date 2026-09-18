## Feature: Consultation Reminder Scheduler

### Depends on

Feature files: **None** — no feature already recorded this session is an
architectural prerequisite of this one. Category A (confirmacao_agendamento,
link_teleconsulta, resultado_disponivel) was handled as mechanical wiring
correction, without going through the harness gate — same treatment given
to other small fixes this session (doctor name resolution, extending the
terms-of-service gate to ADMIN). No `feature-notification-wiring.md` or
equivalent exists.

Code-level dependency (not a feature file): `NotificacoesService.create()`
and the BullMQ/Resend pipeline it triggers, whose end-to-end behavior was
confirmed in real production this same session (Category A —
confirmacao_agendamento delivered successfully, email received and
confirmed by the user). This is the mechanism the scheduler will reuse for
the dispatch itself — the only new part is WHO triggers it (a periodic
job via Cloud Scheduler, no longer an HTTP action from the user).

### Description

Answer to mandatory question 1 — *"Como você descreve a feature?"* —
recorded verbatim (Portuguese) as given by the user:

> O sistema envia automaticamente um e-mail de lembrete pro paciente 24
> horas antes da consulta agendada, e outro 1 hora antes — sem precisar de
> nenhuma ação manual do psicólogo ou da secretária.

### Problem

Answer to mandatory question 2 — *"Qual problema objetivamente ela
resolve?"* — recorded verbatim (Portuguese) as given by the user:

> Hoje lembrete_consulta_24h e lembrete_consulta_1h existem só como
> template de texto — nunca foram disparados, porque o projeto não tem
> nenhum mecanismo de execução periódica. Sem lembrete automático, o
> paciente depende só da própria memória, o que aumenta risco de falta —
> problema real de negócio pra qualquer clínica.

### Solution and trade-offs

Answer to mandatory question 3 — *"Qual a solução esperada e quais
trade-offs ela envolve?"* — recorded verbatim (Portuguese) as given by the
user:

> Nova infraestrutura: Cloud Scheduler (job a cada 15 minutos) chamando um
> endpoint HTTP novo (POST /internal/processar-lembretes), autenticado via
> OIDC token do Google (não JWT de usuário) — guard novo, validando
> audience/issuer, não reaproveitando JwtStrategy. Service account
> dedicada (nuvita-psi-reminder-scheduler), só com roles/run.invoker
> escopado ao serviço nuvita-psi-api — mesmo isolamento de sempre, sem
> reaproveitar nenhuma SA existente.
>
> Idempotência: campos novos no agendamento (lembrete24hEnviadoEm,
> lembrete1hEnviadoEm) marcando quando cada lembrete já foi enviado, pra
> evitar duplicação entre execuções do job a cada 15 minutos.
>
> Reaproveita o mecanismo de notificação já validado na Categoria A
> (NotificacoesService.create()) — só muda quem dispara (job periódico,
> não ação do usuário).
>
> Trade-off de custo: Cloud Scheduler tem custo desprezível pro volume
> esperado; o endpoint novo é superfície de ataque nova (ainda que
> protegida por OIDC), então precisa do mesmo rigor de guard que os
> endpoints de usuário já têm.
>
> Escopo: só os dois lembretes (24h/1h) — não inclui SMS/WhatsApp (fora do
> escopo atual, EVOLUTION_* continua placeholder).
>
> Frequência decidida: a cada 15 minutos — o lembrete de 1h é o caso
> crítico; com janela de tolerância maior (30 ou 60 min), "1h antes"
> deixaria de cumprir a promessa ao usuário. Custo de 96 chamadas/dia é
> irrelevante dado que Cloud Scheduler cobra por job, não por execução.

### Example / context

Answer to mandatory question 4 — *"Qual exemplo ou contexto concreto temos
do problema e da solução?"* — recorded verbatim (Portuguese) as given by
the user:

> Confirmado por investigação nesta mesma sessão: lembrete_consulta_24h/
> lembrete_consulta_1h são os únicos 2 dos 5 tipos de notificação que não
> podem ser resolvidos só com "chamar o service no lugar certo" (como já
> fizemos na Categoria A) — precisam de infraestrutura de execução
> periódica que o projeto nunca teve, confirmado por ausência total de
> @Cron/scheduler/timer relacionado em todo o código (grep exaustivo já
> realizado). Confirmado também: run.googleapis.com/cpu-throttling ativo
> e minScale=0 no Cloud Run de produção tornam um scheduler interno
> (@nestjs/schedule) estruturalmente não-confiável — decisão de usar Cloud
> Scheduler externo é baseada em configuração real verificada, não
> suposição.

### GoF Patterns

No GoF pattern is proposed for this feature. The candidate patterns all
presuppose multi-channel dispatch — Strategy (alternative channels) and
Chain of Responsibility (fallback between channels) — but scope is
single-channel (email only; WhatsApp explicitly out of scope). Template
Method also does not apply: the 24h and 1h reminders are the same logic
parameterized by an hour count, not two distinct flows that would justify
subclass hooks. Revisit if/when WhatsApp stops being a placeholder.

### Design Doc Detail Level

Medium: concrete interfaces/method signatures for the new job (e.g. query
shape for "consultations due in 24h/1h", idempotency key), without full
pseudocode.

### Rollback Strategy

1. **Code rollback**: `git revert` + redeploy fixes bugs in the reminder
   logic (query, template, idempotency check) but does not stop the Cloud
   Scheduler job itself — the job is a separate GCP resource that keeps
   invoking the endpoint on its cron schedule regardless of what code is
   deployed behind it.

2. **Infrastructure rollback (primary lever while the job is actively
   misbehaving)**: `gcloud scheduler jobs pause <job-name>
   --location=<region>` stops further invocations immediately,
   independent of any deploy. Order of operations: pause first,
   diagnose/revert code second, resume only after the fix is verified.

3. **Unauthorized invocation**: the endpoint must reject any caller that
   isn't Cloud Scheduler. `nuvita-psi-api` runs on Cloud Run under a
   dedicated service identity, so the control is the standard Cloud Run +
   Cloud Scheduler OIDC pattern — verify the token Cloud Scheduler
   attaches (issuer `accounts.google.com`, audience = endpoint URL,
   service account = the scheduler's own dedicated identity
   `nuvita-psi-reminder-scheduler`) and reject anything else with
   401/403. Architecture investigation this session confirmed the
   project has no internal OIDC/service-to-service authenticated
   endpoint today — this is the first. It establishes the reference
   pattern for any future OIDC-authenticated endpoint in the project; it
   does not follow an existing precedent.

4. **Irreversible case — a duplicate/wrong reminder actually delivered**:
   once the email is sent there is no rollback, only detection speed.
   This is why step 2 (pause), not step 1 (code revert), is the real
   safety mechanism for this feature.

5. **Trigger for manual pause**: pause the job if, within a single run:
   - the same `(patientId, consultationId, reminderType)` triple is
     dispatched more than once, or
   - `sent count > attempted count` for the run (structurally
     impossible — its occurrence alone is the alarm).

   Any idempotency-key collision caught by the dedup guard is itself
   logged as the trigger signal — a single collision in production
   justifies a manual pause even though the guard functioned as expected
   and no duplicate was actually sent.

### Monitoring

Each job run emits one structured log entry with:
- `attempted`: consultations found in the 24h/1h due window
- `sent`: reminders actually dispatched via `NotificacoesService.create()`
- `deduped`: reminders skipped because `lembrete24hEnviadoEm`/`lembrete1hEnviadoEm` was already set
- `failed`: dispatch attempts that errored

This is the raw signal the Rollback Strategy's manual-pause trigger (item
5) depends on: `sent > attempted` or any `deduped > 0` collision is
visible directly in this log line, without a separate alerting pipeline.
No new metric or alert is introduced beyond this log.

No alerting channel exists in this project yet — same posture already
recorded in the audit gates and session revocation features. Until one
exists, the mitigation is manual log review after each deploy or change
touching this feature. This differs meaningfully from session revocation
(where an undetected failure was reversible — a user forced to
re-authenticate): here, an undetected failure delivers a duplicate or
wrong email that cannot be undone. This makes
consultation-reminder-scheduler a strong candidate to be the actual
reason the project finally builds a real alerting channel — but that
infrastructure decision is recorded here as a separate, larger pendency,
not decided inside this feature.
