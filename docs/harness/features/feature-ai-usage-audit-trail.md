## Feature: AI Usage Audit Trail

### Depends on

Feature files: None (first feature mapped in this harness; base docs
`architecture_rules.md`, `coding_convention.md`, `forbidden_patterns.md`,
`domain_invariantes.md` and `testing_expectation.md` do not exist yet).

Code-level patterns reused (not feature files):

- Immutability enforcement: `audit-log.schema.ts` (`pre()` hooks blocking
  update/delete on confirmed records)
- Correction-as-new-document: `prontuarios` addendum pattern (never reopens
  the original record)
- Field-level encryption technique: `paciente-crypto.service.ts` (AES-256-GCM,
  random IV, authTag) — reused as a technique only, with its own dedicated
  key (`IA_USO_ENCRYPTION_KEY`), never importing or sharing
  `PATIENT_DATA_ENCRYPTION_KEY`

### Description

Answer to mandatory question 1 — *"Como você descreve a feature?"* — recorded
verbatim (Portuguese) as given by the user:

> Toda vez que a IA gera uma sugestão clínica (abordagem terapêutica ou
> prescrição de cuidados), o sistema grava um registro permanente de quem
> pediu, o que foi pedido, o que a IA respondeu, com qual modelo e quando — e
> depois exige que o psicólogo diga explicitamente "vou usar isso" ou "vou
> descartar isso" antes de a sugestão sair da tela. Essa decisão também fica
> gravada, permanentemente, ligada ao registro original.

### Problem

Answer to mandatory question 2 — *"Qual problema objetivamente ela resolve?"* —
recorded verbatim (Portuguese) as given by the user:

> Hoje ia-clinica.service.ts chama a Anthropic e devolve o texto pro frontend
> sem gravar nada — nenhuma linha no banco, nenhum evento no audit_logs. É o
> único módulo do sistema sem trilha de auditoria (todos os outros ~50 eventos
> de AuditEvent cobrem paciente, prontuário, financeiro, telemedicina, laudo,
> documento — IA não tem nenhum). Além disso, no frontend, o texto da IA é
> colado direto no campo de texto livre da prescrição sem nenhuma marca de
> origem — depois de colado, não dá mais para saber "isso aqui foi a IA que
> sugeriu" nem "o psicólogo revisou e aceitou isso, ou só copiou sem olhar".
> Se isso vira parte de um plano de cuidados assinado depois, a proveniência
> do trecho gerado por IA se perde de vez.

### Solution and trade-offs

Answer to mandatory question 3 — *"Qual a solução esperada e quais trade-offs
ela envolve?"* — recorded verbatim (Portuguese) as given by the user:

> Solução: nova coleção registros_uso_ia (imutável, criada no momento da
> geração — modelo, input e output cifrados com chave própria, nunca a mesma
> do paciente) + nova coleção decisoes_uso_ia (imutável, criada quando o
> psicólogo aceita ou descarta, referenciando o registro original, um só por
> registro).
>
> Trade-offs:
>
> - Quem pode registrar a decisão: só o mesmo usuarioId que gerou a sugestão,
>   não qualquer psicólogo da clínica. A sugestão nasce dentro do raciocínio
>   clínico de um atendimento específico de um profissional específico;
>   permitir que outro decida quebra o próprio sentido de não repúdio que a
>   feature existe para garantir. Custo: se a sessão cair e outro psicólogo
>   assumir o atendimento, a sugestão pendente fica órfã — aceitável, porque
>   ela nunca vira parte do prontuário sem decisão.
> - Custo de cifrar todo input/output no Mongo: desprezível em performance
>   (AES-256-GCM por chamada é da ordem de microssegundos) e em armazenamento
>   (sugestões são texto curto). O custo real é operacional: mais uma chave
>   para gerenciar/rotacionar (separada da de paciente e da de assinatura de
>   prontuário) e perda de buscabilidade — não dá pra filtrar por conteúdo, só
>   por metadado (tipo, data, usuário, clínica). Aceitável, porque isso é log
>   de auditoria, não uma feature de busca.
> - Retenção: não há política de retenção/expurgo definida em nenhum outro
>   módulo do sistema hoje — esta feature segue o mesmo não-definido (guarda
>   indefinidamente), até existir política formal.

### Flow (given/when/then)

Behavioural flow, reformatted from the user's "FLUXO (feliz)" (no method names,
no framework syntax):

- **Given** a psychologist requests a clinical suggestion (therapy approach or
  care prescription)
- **When** the API receives the request
- **Then** the service calls Anthropic, encrypts the request payload and the
  returned suggestion with a dedicated key, persists one immutable usage
  record (requester, input, output, model, timestamp), writes an
  `AI_SUGGESTION_GENERATED` audit-log entry, and returns the suggestion
  together with the usage-record id

- **Given** a suggestion shown on screen together with its usage-record id and
  an "AI-generated" label
- **When** the psychologist chooses "use this suggestion" or "discard"
- **Then** the API records one immutable decision (`ACEITA` or `DESCARTADA`)
  linked to that usage record and writes an `AI_SUGGESTION_DECISION_RECORDED`
  audit-log entry; "use" also runs the current copy-to-field behaviour,
  "discard" clears the suggestion from the screen

### Error cases (explicit, not left implicit)

- The AI call fails (network/API error) → no usage record is created (nothing
  was generated, nothing to audit); the existing catch behaviour is unchanged
- Persisting the usage record fails after Anthropic already responded → the
  suggestion is **not** returned to the frontend; fail closed, never expose a
  suggestion without a trail; the internal error is logged
- A decision is submitted for a usage-record id that does not exist → rejected
- A decision is submitted by a user other than the one who generated the
  suggestion → rejected
- A decision is submitted twice for the same usage record → rejected; one
  decision per record, permanently (same principle as "prontuário already
  signed")

### Acceptance criteria (what proves it is done)

- [ ] Test: every AI suggestion generation writes one immutable usage record
  capturing who requested it, the request, the AI output, the model and the
  timestamp
- [ ] Test: the suggestion response always carries the usage-record id; no
  suggestion is returned without a persisted record
- [ ] Test: a second decision for the same usage record is refused and the
  first decision stands
- [ ] Test: a decision by a user other than the generator is refused
- [ ] Test: both `AI_SUGGESTION_GENERATED` and `AI_SUGGESTION_DECISION_RECORDED`
  are written to `audit_logs`
- [ ] Test: encrypt/decrypt round-trips; a tampered authTag makes decryption
  fail
- [ ] UI: AI-generated text is visibly labelled as AI-generated (text, not
  colour alone) before it can be accepted

### Example / context

Answer to mandatory question 4 — *"Qual exemplo ou contexto concreto temos do
problema e da solução?"* — recorded verbatim (Portuguese) as given by the user:

> Achado de revisão de código: ia-clinica.service.ts é o único módulo sem
> trilha de auditoria, contra ~50 eventos cobrindo todo o resto do sistema.
> Reforça isso o mesmo princípio já validado e em produção no projeto irmão do
> usuário (Sette/distribuidora médica): toda invocação de IA em contexto
> clínico/regulatório gera registro imutável com decisão humana obrigatória.
>
> Há também gancho normativo real, ainda que genérico: a Resolução CFP nº
> 9/2024, Art. 3º, inclui "registro e guarda de informações, considerando a
> responsabilidade ética no manuseio de dados sensíveis" como parte do
> exercício profissional mediado por TDICs — confirmado em fonte primária
> (texto da resolução via LegisWeb/atosoficiais). Ela não especifica esta
> arquitetura nem menciona IA; a decisão de desenho é de engenharia/produto,
> não uma imposição normativa direta.
>
> Correção registrada explicitamente: uma pesquisa inicial trouxe referência a
> NGS2/assinatura ICP-Brasil como se fosse exigência aplicável a este produto.
> Verificado em fonte primária que isso é da Resolução CFM nº 2.314/2022
> (medicina, CRM) e da Resolução COFEN nº 754/2024 (enfermagem, COREN) —
> nenhuma das duas vincula psicólogo (CFP/CRP). Não entra como requisito desta
> feature nem do módulo de prontuário já existente. Verificado também: CFP nº
> 11/2018 exige só "autenticidade, integridade, sigilo e acesso restrito ao
> psicólogo responsável" para prontuário digital (sem NGS2/ICP-Brasil), e a
> Lei nº 14.063/2020 art. 14 permite assinatura eletrônica avançada OU
> qualificada para profissional de saúde — não exige qualificada como piso.

### Suggested Design Patterns (Gang of Four)

- **Repository** — persistence for RegistroUsoIA and DecisaoUsoIA is
  encapsulated behind repository interfaces, mirroring the existing
  AuditLogRepository port/adapter split already in the codebase. Clear fit,
  not optional.
- **Template Method** — sugerirAbordagem() and gerarPrescricao() share an
  identical skeleton (call Anthropic → encrypt input/output → persist
  RegistroUsoIA → write audit log → return). Worth extracting that skeleton
  into a shared protected method with the two callers only supplying the
  prompt-building step and the TipoUsoIA. Concrete refactor suggestion, not
  just a label — implement if it doesn't add indirection for only two
  call sites; use judgment.
- **Memento (loose fit, optional)** — RegistroUsoIA is conceptually a
  snapshot: it captures the AI's output state at generation time, opaquely
  (encrypted) and immutably, for later inspection without exposing or
  reopening it. Flagging this as a naming/documentation aid only, not a
  structural requirement — don't build a formal Memento object graph for
  this, the Mongo document already does the job.

Not proposing Strategy for the two suggestion types: they aren't
interchangeable implementations of one interface selected at runtime,
they're two distinct use cases with different prompts and DTOs — forcing
Strategy here would be pattern-shopping, not a real fit.

### Amendment (2026-10-25) — the human decision is recorded when it exists, not required by the server

The user's answers above (kept verbatim) say the psychologist is made to decide
"before the suggestion leaves the screen" and that a suggestion "never becomes
part of the medical record without a decision". That is a stronger guarantee
than what the code delivers. This amendment states what is actually true; the
design doc must not claim a guarantee the system does not give.

What the system does today:

- The decision (`ACEITA` / `DESCARTADA`) is **recorded when the psychologist
  makes it**: one immutable `decisoes_uso_ia` document per usage record, plus an
  `AI_SUGGESTION_DECISION_RECORDED` audit entry. Only the generating user can
  decide, and only once.
- The **server does not require** a decision. A suggestion can stay undecided
  forever; generation and saving a session never check for a pending decision.
  An undecided suggestion simply has no decision document ("open" in the trail).
- **Front-end enforcement (2026-10-25):** while a suggestion is pending
  decision, both screens disable the actions that would move past it:
  Prescrição de Cuidados disables "Gerar com IA" and "Gerar prescrição"
  (print); Atendimento Psicológico disables "Gerar novamente". This is a UI
  guard only: a direct API call or a closed browser tab still leaves a
  suggestion undecided.
- In Prescrição, the AI text enters the printable document only after "use"
  (`ACEITA`). In Atendimento, the suggestion is never copied into the medical
  record by the system; "use" only records the decision.

Post-beta (needs design, not scheduled): **server-side enforcement**. It must
cover the psychologist who closes the browser mid-way: either an expiry of the
pending state or an implicit decision by abandonment. Until that is designed,
no text of the product may promise that every suggestion is decided.

`decisoes_uso_ia` now stores `clinicaId` (additive, immutable, filled from the
tenant already resolved by the request). Decisions created before this change
have no `clinicaId`; that absence is known and accepted (only demo data existed,
no backfill). The clinic of an old decision is still derivable from its usage
record.

Configuration error: when `ANTHROPIC_API_KEY` is missing the AI endpoints answer
HTTP 503 (service unavailable), not 500, so a configuration problem is not
confused with a server failure.

### Amendment (2026-10-27) — the Atendimento screen says, next to the buttons, that the suggestion is not part of the record

No behaviour change. The code already never copies the suggestion into the medical record (see the 2026-10-25
amendment above); this amendment only makes that visible to the psychologist. Next to "Usar esta sugestão" /
"Descartar" in Atendimento Psicológico, as on-screen text (not a tooltip), the screen now says, in Portuguese:

> Sugestão da IA: não entra no prontuário. Ao clicar em Usar ou Descartar, sua decisão fica registrada na auditoria.
> Para adotar o conteúdo, copie para as anotações e revise antes de assinar.

The three facts: (a) the suggestion does not enter the record; (b) "use" and "discard" record the decision in the audit
trail; (c) to adopt the content, copy it into the notes and review it before signing. The notice stays visible while the
suggestion is on screen, before and after the decision. Prescrição de Cuidados is not changed: there "use" does insert the
text into the prescription being written, so this wording would be false there.

The text was proposed by the user and approved to be amended into this doc instead of a new `feature-*.md`.
