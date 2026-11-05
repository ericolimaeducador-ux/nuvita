# 10 — Perfis, acesso e segurança (itens A.3, B.1–B.4)

> **Executado e medido** no ambiente local. Métodos: (1) navegador com cada perfil visitando **todas as 20 rotas**
> (`ensaio/tour.mjs`), (2) sonda da API com a sessão de cada perfil nos GETs (`ensaio/api-probe.mjs`),
> (3) banco local para auditoria. Resultados brutos em `ensaio/resultados/`.

## Matriz perfil × tela — **verificada na tela** (✔ abre; — redireciona ao Dashboard)
| Rota | Super-admin | Admin | Psicólogo | Secretária | Paciente |
|---|:-:|:-:|:-:|:-:|:-:|
| Dashboard | ✔ | ✔ | ✔ | ✔ | ✔ |
| Pacientes / Ficha | ✔* | ✔ | ✔ | ✔ | — |
| Impressão do prontuário | ✔* | ✔ (modelo vazio) | ✔ | ✔ (modelo vazio) | — |
| Documentos clínicos (4 rotas) | ✔* | ✔ | ✔ | ✔ | — |
| Agenda | ✔* | ✔ | ✔ | ✔ | — |
| Prontuários (geral) | ✔* (403 na API) | ✔ (403 na API) | — | — | — |
| Documentos (arquivos) | ✔* | ✔ | ✔ | ✔ | — |
| Notificações | ✔* | ✔ | — | ✔ | — |
| Telemedicina | ✔* | ✔ | ✔ | — | — |
| Atendimento psicológico | ✔* | — | ✔ | — | — |
| Financeiro (Psi) | ✔* | — | ✔ | — | — |
| Clínica | ✔* | ✔ | — | — | — |
| Relatórios | ✔* | ✔ | ✔ | ✔ | **✔** |
| Super Admin / Tickets | ✔ | — | — | — | — |
| Rota inexistente | → Dashboard | → Dashboard | → Dashboard | → Dashboard | → Dashboard |
\* com uma clínica selecionada no seletor do topo. Sem ela, a API responde 403 "Selecione uma clinica…".

## B.4 — O gate é de rota ou só de menu?
**De rota, no web: SIM.** Digitar a URL de uma tela que o perfil não tem **redireciona em silêncio para o
Dashboard** (sem mensagem). **Mas os gates têm furos de papel** nas telas que o módulo Pacientes libera:
`/pacientes/:id/documentos/*` e a impressão do prontuário abrem para **admin e secretária** (item "Secretária/admin
emitem documento" no cap. 05).

## Gate de **API** por perfil (GETs sondados) — o que cada papel consegue ler
| Endpoint | Paciente | Secretária | Admin | Psicólogo |
|---|:-:|:-:|:-:|:-:|
| `/analytics/*` (pacientes, agenda, financeiro, notificações, cobranças, perda de seguimento) | **200** | 200 | 200 | 200 |
| `/financeiro/lancamentos`, `/financeiro/dashboard` | 403 | **200** | 200 | 403 |
| `/financeiro/psicologia/painel` | 403 | 403 | **200** | 200 |
| `/pacientes`, `/pacientes/:id`, `/export` | 403 | 200 | 200 | 200 |
| `/prontuarios` (lista exige `pacienteId`), `/prontuarios/:id` | 403 | 403 | 403 | 200 |
| `/telemedicina/salas` | 403 | 403 | 200 | 200 |
| `/testes-psicologicos` | 403 | 403 | 403 | 200 |
| `/tickets`, `/super-admin/*` | 403 | 403 | 403 | 403 |

## B.2 — PACIENTE abre Dashboard e Relatórios
**O que renderiza:** o Dashboard abre com cartões 0 (as chamadas a `/pacientes` e `/agendamentos` dão 403
silencioso). **Relatórios renderiza completo** (`../screenshots/perfis/paciente/relatorios.png`): "Pacientes ativos
2", "Novos no período 2", gráficos de atendimentos por mês/semana — **dados da clínica inteira**.
**Pela API, o papel PACIENTE lê:** totais e séries de pacientes, **agenda por médico/mês/dia**, **receitas e
despesas por mês e por forma de pagamento**, status de notificações, cobranças a vencer/vencidas e a lista de
**perda de seguimento com nome do paciente, faltas e total de agendamentos** (`pacienteNome: "Ana Exemplo
Demonstração"`).
**Severidade: BLOQUEIA BETA.** Dado de outros pacientes e financeiro da clínica para um papel que não deveria
vê-los. Causa provável: `/analytics/*` sem restrição de papel (só autenticação + clínica) e módulo Analytics no
padrão do PACIENTE. A conta PACIENTE só existe porque o super-admin pode criá-la (o produto não tem tela de paciente).

## B.3 — ADMIN em Prontuários
Menu existe; a API nega (403). A tela mostra o aviso **"Acesso negado — Acesso negado para este papel."** e a
tabela **"Nenhum prontuário encontrado"**. **Erro tratado, sem stack trace nem detalhe interno**; a mensagem vazia é
enganosa. (`../screenshots/perfis/admin/prontuarios.png`.) Severidade: atrapalha.

## B.1 — Token de `/tele/:token` (evidência)
| Pergunta | Resposta (medida) |
|---|---|
| Expira? Prazo? Onde? | **Sim, 4 horas** após criar a sala (`SALA_TTL_HORAS = 4`, `sala-telemedicina.entity.ts`); medido: 3,9999 h. Vale a mesma hora para os dois tokens |
| Uso único ou reutilizável? | **Reutilizável**: duas chamadas `entrar` seguidas deram 201 nas duas; cada entrada só registra um evento |
| Como é gerado? Entropia? | `crypto.randomUUID()` (UUID v4, 122 bits aleatórios, 36 caracteres). Não é previsível nem sequencial. Dois tokens por sala: **paciente** e **profissional** |
| Deslogado, em janela anônima, entra? | **SIM.** Contexto de navegador sem storage abriu "Teleatendimento — Psicologia / Entrar no atendimento" (`../screenshots/telemedicina/01-…`); `GET`/`entrar` sem Authorization = 200/201 |
| Enumeração | 30 tentativas com UUIDs aleatórios: 18× 404 e 12× **429** (limite de 20/min por IP). Mitigado |
| Depois de encerrar a sala | `entrar` = **403** ("Sala encerrada ou expirada") |
| Token em log? | **Não** apareceu no log da API (busca pelos dois tokens) |
| Persistido? | **Sim, em texto puro**: na sala (`salas_telemedicina.tokenPaciente/tokenMedico`) e **o link completo `/tele/<token>` dentro do documento da notificação por e-mail** |
| Aparece em URL compartilhável? | Sim, por desenho: o link é a credencial; a criação da sala já enfileira o e-mail ao paciente |
| Token do profissional | Mesma rota pública: quem tem o link do profissional entra **como profissional sem login** |
**Avaliação:** o desenho "link = credencial" é coerente, com UUID forte, TTL de 4 h, encerramento e limite de
tentativas. Riscos reais: link reencaminhado ou vazado no e-mail = qualquer pessoa entra (reutilizável, sem sala de
espera, sem vínculo com o dispositivo); tokens em texto puro no banco e na notificação; link do profissional igual
em força ao do paciente. **Severidade: atrapalha (risco médio)**; vira alto se o e-mail do paciente for
comprometido. Mensagem enganosa para 429 ("Link de atendimento inválido").

## Outros achados de segurança/acesso
1. **Documento clínico emitido por secretária/admin** (cap. 05) — **bloqueia beta**.
2. **Senha provisória do admin criado pelo super-admin não é obrigada a ser trocada**, e a da secretária também
   não (`deveTrocarSenha=false`) — atrapalha. O super-admin conhece a senha inicial para sempre.
3. **Criação de usuário pelo super-admin sem auditoria** — atrapalha (compliance). A tela diz que tudo é auditado.
4. **Admin e secretária leem financeiro e analytics financeiro** que o menu não mostra — atrapalha.
5. **Exportação "LGPD" feita por secretária**, sem os dados clínicos (portabilidade incompleta) — atrapalha.
6. **Super-admin enxerga dados pessoais de pacientes** de uma clínica selecionada (auditado) — decisão de produto.
7. **Positivos observados:** rate limit nos tokens; 403 tratados sem vazamento técnico; auditoria de
   login, termo, exportação, criação de paciente, assinatura de prontuário e pedido de ticket; CPF aparentemente cifrado
   no banco (não está em texto) e responsável legal cifrado; sessão encerrada ao trocar a senha.
