# Mapa completo do sistema — nuvita-psi

> **Status: verificado na tela e na API local (22/10/2026), com as exceções listadas na seção 10.** O mapa foi
> primeiro levantado pelo código; as seções 3 e 4 foram **corrigidas pelo ensaio** (marcadas "VERIFICADO" ou
> "DESMENTIDO"). Ambiente: local, dados fictícios. Público: Erico.

## 1. Perfis (`Papel`)

`SUPER_ADMIN`, `ADMIN`, `PSICOLOGO`, `SECRETARIA`, `PACIENTE`. 2FA obrigatório para SUPER_ADMIN, ADMIN e
PSICOLOGO (`PAPEIS_COM_2FA_OBRIGATORIO`). Gates pós-login: troca de senha provisória e aceite de termo
(PSICOLOGO e ADMIN; o termo exigido é o de teste na fase de teste).

## 2. Rotas do web (todas)

| Rota | Tela | Acesso (código) |
|------|------|------|
| `/login` | Login (e-mail, senha, código 2FA) | público |
| `/tele/:token` | Sala de teleatendimento do paciente | **pública**: o token da sala é a credencial |
| `/aceitar-termos` | Aceite do termo | logado (gate) |
| `/definir-senha` | Troca obrigatória de senha | logado (gate) |
| `/dashboard` | Dashboard | todo papel logado, sem gate de módulo |
| `/pacientes` | Lista/cadastro de pacientes | módulo PACIENTES |
| `/pacientes/:id` | Ficha do paciente (seções) | módulo PACIENTES |
| `/pacientes/:id/prontuario/:prontuarioId/imprimir` | Impressão do prontuário | módulo PACIENTES |
| `/pacientes/:id/documentos/atestado` | Atestado de comparecimento | módulo PACIENTES |
| `/pacientes/:id/documentos/laudo` | Laudo psicoterápico | módulo PACIENTES |
| `/pacientes/:id/documentos/encaminhamento` | Encaminhamento | módulo PACIENTES |
| `/pacientes/:id/documentos/prescricao` | Prescrição de cuidados (tem IA) | módulo PACIENTES |
| `/agenda` | Agenda | módulo AGENDA |
| `/prontuarios` | Lista geral de prontuários | módulo PRONTUARIOS |
| `/documentos` | Documentos (upload/baixar/excluir) | módulo DOCUMENTOS |
| `/notificacoes` | Notificações | módulo NOTIFICACOES |
| `/telemedicina` | Salas de vídeo | módulo TELEMEDICINA |
| `/atendimento-psicologico` | Atendimento psicológico (agenda do psicólogo, atender, registrar sessão, IA) | módulo ATENDIMENTO_PSICOLOGICO |
| `/financeiro-psicologia` | Financeiro da psicologia | módulo FINANCEIRO_PSICOLOGIA |
| `/clinica` | Configuração da clínica (logo/timbre, usuários) | módulo CLINICA |
| `/relatorios` | Relatórios gerenciais | módulo ANALYTICS |
| `/super-admin` | Painel do super-admin (clínicas, usuários) | só SUPER_ADMIN |
| `/tickets` | Tickets (correção de identidade) | só SUPER_ADMIN |

## 3. Matriz perfil × módulo (padrão do código)

O super-admin pode conceder/revogar módulos por usuário; abaixo é o **padrão por papel**.

| Módulo | SUPER_ADMIN | ADMIN | PSICOLOGO | SECRETARIA | PACIENTE |
|--------|:-:|:-:|:-:|:-:|:-:|
| Dashboard | ✔ | ✔ | ✔ | ✔ | ✔ |
| Pacientes | ✔ | ✔ | ✔ | ✔ | — |
| Agenda | ✔ | ✔ | ✔ | ✔ | — |
| Prontuários (tela geral) | ✔ | ✔ | — | — | — |
| Documentos | ✔ | ✔ | ✔ | ✔ | — |
| Notificações | ✔ | ✔ | — | ✔ | — |
| Telemedicina | ✔ | ✔ | ✔ | — | — |
| Relatórios (analytics) | ✔ | ✔ | ✔ | ✔ | ✔ |
| Atendimento psicológico | ✔ | — | ✔ | — | — |
| Financeiro da psicologia | ✔ | — | ✔ | — | — |
| Clínica (configuração) | ✔ | ✔ | — | — | — |
| Super Admin / Tickets | ✔ | — | — | — | — |

Conferência do que o código sugeria (**resultado do ensaio**):
- **Prontuários**: ADMIN tem a tela geral, PSICOLOGO não, mas os endpoints `/prontuarios` só aceitam
  `PAPEIS_PROFISSIONAIS` (= só PSICOLOGO). **VERIFICADO:** o admin abre a tela, a API nega (403) e a tabela diz "Nenhum prontuário encontrado".
- **Financeiro da psicologia**: a API aceita PSICOLOGO e ADMIN (`/financeiro/psicologia/*`), mas o ADMIN
  não tem o módulo por padrão. **VERIFICADO:** admin lê `/financeiro/psicologia/painel` (200) e a secretária lê `/financeiro/*` (200); o menu esconde.
- **PACIENTE** recebe Dashboard e Relatórios por padrão. Não há tela voltada ao paciente no web além do
  Dashboard e da sala `/tele/:token`. **VERIFICADO e GRAVE:** o paciente abre Relatórios e lê dados da clínica inteira (cap. 10).
- **VERIFICADO:** `/atendimento-psicologico` redireciona o admin e a secretária ao Dashboard.
- **NOVO:** secretária e admin abrem por URL as telas de documentos clínicos e de impressão do prontuário (cap. 05/10).

## 4. Como cada pessoa é cadastrada (caminhos reais, pelo código)

| Quem | Caminho | Quem pode |
|------|---------|-----------|
| Clínica | `POST /super-admin/clinicas` (tela Super Admin → "Nova clínica", cria clínica + 1º admin, senha gerada pelo backend) | SUPER_ADMIN |
| Admin | junto com a clínica; ou `POST /super-admin/usuarios` | SUPER_ADMIN |
| Psicólogo / Secretaria | `POST /clinicas/:clinicaId/usuarios` (tela `/clinica` → "Novo usuário da clínica"; só esses dois papéis) | ADMIN |
| Qualquer papel | `POST /super-admin/usuarios` (tela Super Admin → "Novo usuário") | SUPER_ADMIN |
| Paciente (cadastro clínico) | `POST /pacientes` (tela `/pacientes`) | SECRETARIA, PSICOLOGO, ADMIN |
| Paciente (conta de login, papel PACIENTE) | `POST /auth/register` (desligado por padrão) **ou** Super Admin → Novo usuário → Perfil "Paciente" (**existe na tela**; DESMENTIDO o "sem tela") | Super-admin |

**Correção do ensaio:** o super-admin consegue criar o usuário Paciente pela tela; o que não existe é **qualquer
tela útil para ele** (só Dashboard e Relatórios). Para o ensaio criei super-admin e paciente direto no banco local.

## 5. Recursos que você pediu explicitamente — onde estão (pelo código)

| # | Tema | Onde está / o que o código mostra |
|---|------|------|
| 1 | Cadastro de pessoas | seção 4 acima |
| 2 | Onboarding | `/login` → `/definir-senha` → `/aceitar-termos` (2FA no login); psicólogo e admin passam pelo aceite |
| 3 | IA | 2 pontos: **sugerir abordagem** (Atendimento Psicológico) e **gerar prescrição** (página de prescrição). Backend `/ia-clinica/*` só PSICOLOGO; existe `/ia-clinica/registros/:id/decisao` (o web chama `registrarDecisao` nos dois pontos) e coleções `registros_uso_ia` e `decisoes_uso_ia`. A confirmar: decisão humana obrigatória e registrada. |
| 4 | Telemedicina | `/telemedicina` (salas por agendamento), sala `/tele/:token` pública, endpoints de sinalização WebRTC. Vídeo real depende de câmera/microfone/TURN. |
| 5 | Financeiro | `/financeiro-psicologia` (painel por ciclo, configuração, cobranças: receber/cancelar) + `/financeiro/lancamentos` (outro financeiro, a confirmar se tem tela) |
| 6 | Relatórios | `/relatorios` (cobranças a vencer/vencidas; perda de seguimento/absenteísmo) + endpoints `/analytics/*` (pacientes, agendamentos, financeiro, notificações, por representante, horários vagos) |
| 7 | Menor de idade | o cadastro de paciente classifica a idade pela data de nascimento e, quando menor, usa `responsavelLegal` + autorização do responsável |
| 8 | Termo de consentimento | `consentimentoLGPD` do paciente (checkbox no cadastro, "Aceito/Pendente" na ficha); aceite de termo do **usuário** em `/aceitar-termos`. Textos em `docs/legal/` (termos de uso, termo de teste). |
| 9 | Declaração do responsável legal | **não encontrei documento com esse nome** nas páginas de documento (só atestado, laudo, encaminhamento, prescrição). Existe o campo de autorização do responsável no cadastro. A confirmar. |
| 10 | Impressão/exportação | páginas de impressão do prontuário e dos 4 documentos clínicos; exportação LGPD do paciente (JSON) |
| 11 | Documentos clínicos | atestado de comparecimento, laudo psicoterápico, encaminhamento, prescrição de cuidados; mais o upload de arquivos (`/documentos`, tipos: exame, receita, laudo, termo, outro) |
| 12 | Agenda, prontuário/evolução, testes | `/agenda`; registro de sessão em `/atendimento-psicologico`; testes na ficha (só PSICOLOGO) |

## 6. Outros módulos/endpoints que não estavam na sua lista (a ensaiar)

- **Tickets de correção de identidade** (`/tickets`, `/tickets/*`): quem não é super-admin abre, super-admin atende/recusa.
- **Correção de identidade do paciente** (`PATCH /pacientes/:id/identidade`, super-admin).
- **Desativar paciente** (`PATCH /pacientes/:id/desativar`), **observações** (`/observacoes-paciente`, seção só para quem não é psicólogo), **histórico de agenda** (idem).
- **Bloqueios de agenda** (`/agendamentos/bloqueios`), cancelar/concluir/reagendar agendamento.
- **Prontuário**: assinar, adendos (`/prontuarios/:id/addendums`), autocomplete CID-10.
- **Notificações/lembretes**: `/notificacoes`, preferências e opt-out do paciente, `/internal/processar-lembretes` (agendador, protegido por conta de serviço), WhatsApp/e-mail (provedores externos: **não testáveis localmente**).
- **Inscrições do teste beta** (`/inscricoes-teste`: POST público + listagem para super-admin).
- **Logo/timbre da clínica** (`/clinicas/:id/logo/*`, depende de armazenamento).
- **Perfil do usuário** (`PATCH /auth/me`).
- **`/health`**.
- **Super Admin**: clínicas, usuários, redefinir senha, redefinir 2FA, editar clínica, segredos da clínica.

## 7. O que NÃO será possível verificar plenamente no ambiente local

- **Armazenamento de documentos e logo (R2):** desligado no ambiente local → upload/baixar/logo não funcionam.
- **Vídeo (WebRTC):** testo a navegação e a criação da sala; a chamada de vídeo real depende de dois
  participantes com câmera, e não posso afirmar que funciona.
- **E-mail, WhatsApp, IA (Anthropic):** sem chaves reais locais → registro o que a tela faz e o que a API
  responde; não afirmo conteúdo de sugestão de IA sem uma chamada real. Para o item 3 (IA) verifico o
  **mecanismo de decisão/auditoria** no código e na tela, não a qualidade da sugestão.

## 8. Contas de demonstração que preciso criar (todas fictícias, banco local)

| Perfil | Como criar | Já existe? |
|--------|------------|-----------|
| Psicólogo | seed (`seed-manual-psicologos.mjs`) | sim |
| Admin | tela Super Admin → Nova clínica (cria o admin) ou direto no banco | não |
| Secretaria | tela `/clinica` como admin | não |
| Super admin | `scripts/create-super-admin.mjs` ou direto no banco | não (verificar o script e a trava de host) |
| Paciente (login) | **sem caminho de interface**; direto no banco | não |

## 9. (superado) Perguntas antes do ensaio — respondidas pelo Erico

1. Confirma a criação direta no banco local dos perfis sem caminho de interface (super-admin e paciente)?
2. Para o super-admin: posso usar `scripts/create-super-admin.mjs`? (Vou ler antes e checar se tem guarda
   de host; se não tiver, crio por outro meio e registro o script como risco.)
3. A IA: sem chave Anthropic no ambiente local, eu verifico só o mecanismo (decisão/auditoria) e não o
   conteúdo. Quer que eu use uma chave sua para ver uma sugestão real? (Não vou colocar chave no repo nem
   em `.env`; seria só variável de ambiente do processo local.)

## 10. O que a execução NÃO verificou
Upload/baixar/excluir de arquivos e logo da clínica (armazenamento local desligado); e-mail e WhatsApp reais;
conteúdo e gravação de sugestão de IA (sem chave); câmera/microfone reais, NAT e TURN; criação de clínica; "Atender"
e "Recusar" ticket; "Registrar pagamento"; redefinir senha/2FA pelo super-admin; edição de clínica; adendos de
prontuário; bloqueios de agenda; criação de agendamento pela tela; mais de um psicólogo na mesma clínica
(isolamento entre psicólogos); responsividade (só desktop 1366 px).
