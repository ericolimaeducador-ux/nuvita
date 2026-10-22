# Levantamento completo do sistema — nuvita-psi

Público: Erico. Ambiente: **local, dados fictícios**, 22/10/2026. Tom técnico. Cada tela traz: perfis com acesso,
o que faz, screenshot, campos e ações, **estado**, o que foi **observado**, o que **falta** e um espaço em branco
para o seu comentário.

> **Imagens fora do repositório.** Os screenshots ficam em `C:\Users\erico\nuvita-psi-levantamento\screenshots\`
> (fora de qualquer repo). Os capítulos referenciam `../screenshots/...`: para ver as imagens ao ler os `.md`,
> coloque a pasta `levantamento-sistema` ao lado da pasta `screenshots`. O PDF `LEVANTAMENTO-2026-10-22.pdf`
> (na mesma pasta externa) é a **versão completa para apresentação**, com as imagens embutidas e o campo
> "Comentário do Erico" em branco em cada tela.

Leia antes: [`00-MAPA-COMPLETO.md`](00-MAPA-COMPLETO.md) (rotas e matriz perfil × acesso),
[`ACHADOS.md`](ACHADOS.md) (o que está quebrado, falta ou é risco, **segurança no topo**) e
[`BUGS-ENCONTRADOS.md`](BUGS-ENCONTRADOS.md) (registro de engenharia, em inglês).

Estados usados: FUNCIONA / FUNCIONA COM RESSALVA / QUEBRADO / NÃO EXISTE AINDA / NÃO VERIFICÁVEL LOCALMENTE.

## Índice
- [01 — Entrada e onboarding](#01-entrada-e-onboarding) — `01-entrada-e-onboarding.md`
- [02 — Cadastro de pessoas (tema 1)](#02-cadastro-de-pessoas-tema-1) — `02-cadastro-de-pessoas.md`
- [03 — Dashboard e Pacientes (inclui tema 7, menor de idade)](#03-dashboard-e-pacientes-inclui-tema-7-menor-de-idade) — `03-dashboard-e-pacientes.md`
- [04 — Agenda, Atendimento/evolução e Testes psicológicos (tema 12)](#04-agenda-atendimentoevolução-e-testes-psicológicos-tema-12) — `04-agenda-atendimento-testes.md`
- [05 — Documentos clínicos, arquivos, impressão e exportação (temas 9, 10, 11)](#05-documentos-clínicos-arquivos-impressão-e-exportação-temas-9-10-11) — `05-documentos-e-impressao.md`
- [06 — Telemedicina (tema 4)](#06-telemedicina-tema-4) — `06-telemedicina.md`
- [07 — Financeiro, Relatórios, Notificações e Clínica (temas 5 e 6)](#07-financeiro-relatórios-notificações-e-clínica-temas-5-e-6) — `07-financeiro-relatorios-notificacoes-clinica.md`
- [08 — Super Admin e Tickets](#08-super-admin-e-tickets) — `08-super-admin-e-tickets.md`
- [09 — IA, Consentimento e Responsável legal (temas 3, 8 e 9)](#09-ia-consentimento-e-responsável-legal-temas-3-8-e-9) — `09-ia-e-consentimento.md`
- [10 — Perfis, acesso e segurança (itens A.3, B.1–B.4)](#10-perfis-acesso-e-segurança-itens-a3-b1b4) — `10-perfis-e-seguranca.md`

---

# 01 — Entrada e onboarding

> Tudo abaixo foi **executado na tela** (web local, 127.0.0.1:5173) com contas fictícias. Onde não deu para
> verificar, está dito. Screenshots em `../screenshots/02-onboarding/` e `../screenshots/onboarding-admin/`.

## Visão do onboarding ponta a ponta (tema 2)

Caminho real do **psicólogo** criado pelo admin (com 2FA e senha provisória). Ordem **observada**, que não é
a que eu supunha pelo código:

1. Login com e-mail + senha provisória → a tela pede o código 2FA (campo aparece depois do 1º "Entrar").
2. Código 2FA válido → **`/aceitar-termos`** (Termo de Teste, na fase de teste).
3. Marcar "Li e aceito" + confirmar → **`/definir-senha`** (troca da senha provisória, mínimo de 10 caracteres).
4. Definir a senha → **a sessão é encerrada e o usuário volta para `/login`**, sem mensagem explicando que a
   troca deu certo. Entra de novo (e-mail, nova senha, novo código 2FA) → Dashboard.

| Perfil | Termo | Troca de senha | 2FA |
|---|---|---|---|
| Psicólogo (criado pelo admin) | exigido | **exigida** | exigido; chave mostrada **uma vez** ao admin |
| Admin (criado pelo super-admin) | exigido | **NÃO exigida** (observado no banco: `deveTrocarSenha=false`) | exigido; chave mostrada uma vez ao super-admin |
| Secretária (criada pelo admin) | **não exigido** | **NÃO exigida** | não tem |
| Super-admin / Paciente | sem gate observado | sem gate | super-admin: 2FA obrigatório |

---

## Login — `/login`
**Perfis com acesso:** público.
**O que faz:** autentica por e-mail e senha; se o perfil exige 2FA, pede o código de 6 dígitos num segundo passo.
**Screenshot:**

![02-onboarding/01-login](../screenshots/02-onboarding/01-login.png)

![02-onboarding/02-pede-2fa](../screenshots/02-onboarding/02-pede-2fa.png)

**Campos e ações:** E-mail, Senha (com olho), Código de verificação (2FA) após o 1º envio, botão Entrar.
**Estado:** FUNCIONA COM RESSALVA
**Observado:** senha correta sem código devolve 401 "Codigo 2FA obrigatorio." e a tela mostra o campo do código.
Senha errada: 401 "Credenciais invalidas.". Não há "esqueci minha senha" nem link de ajuda na tela.
**Falta:** recuperação de senha/2FA pelo próprio usuário (hoje só o super-admin redefine). Mensagem pós-troca de
senha. Texto "credenciais corporativas" na tela de login.
**Comentário do Erico:** _

## Aceitar termo — `/aceitar-termos`
**Perfis com acesso:** psicólogo e admin (gate), quando o termo da versão exigida ainda não foi aceito.
**O que faz:** mostra o Termo de Teste (fase beta) e exige o aceite antes de liberar o sistema.
**Screenshot:**

![02-onboarding/04-termo](../screenshots/02-onboarding/04-termo.png)

![02-onboarding/05-termo-marcado](../screenshots/02-onboarding/05-termo-marcado.png)

**Campos e ações:** texto do termo, caixa "Li e aceito …", botão de confirmar.
**Estado:** FUNCIONA
**Observado:** botão só habilita com a caixa marcada. Após aceitar aparece o aviso "Termo de Teste aceito."
Fica registrado: no banco `termosAceitos {versao: teste-beta-v1-2026-10, dataAceite}` e evento de auditoria
`TERMS_ACCEPTED` (quem, quando, versão).
**Falta:** não há como o usuário rever o termo depois de aceito (a confirmar; não localizei tela).
**Comentário do Erico:** _

## Definir senha — `/definir-senha`
**Perfis com acesso:** quem tem `deveTrocarSenha` (hoje só o psicólogo criado pelo admin).
**O que faz:** troca a senha provisória por uma própria.
**Screenshot:**

![02-onboarding/06-definir-senha](../screenshots/02-onboarding/06-definir-senha.png)

![02-onboarding/07-senha-fraca-erro](../screenshots/02-onboarding/07-senha-fraca-erro.png)

**Campos e ações:** Nova senha, Confirme a nova senha, Definir senha, "Sair".
**Estado:** FUNCIONA COM RESSALVA
**Observado:** senha curta mostra "Mínimo de 10 caracteres." Senha válida → volta ao login sem aviso.
**Falta:** regra de força além do mínimo (não vi); confirmação visual de sucesso.
**Comentário do Erico:** _

## Sair
**Perfis com acesso:** todos os logados. **Estado:** FUNCIONA. **Observado:** botão "Sair" no menu lateral volta
a `/login` (`../screenshots/perfis/psicologo/zz-apos-sair.png`).
**Comentário do Erico:** _


---

# 02 — Cadastro de pessoas (tema 1)

> Quem pode cadastrar quem, e o caminho real de cada um (tela, API ou só banco). Executado na tela; contas
> fictícias; banco local. Screenshots em `../screenshots/cadastro/`.

| Quem | Caminho real | Quem cadastra | Tela? |
|---|---|---|---|
| Clínica + 1º admin | `Super Admin → Clínicas → Nova clínica` | Super-admin | sim (dialog visto; **criação não executada**) |
| Super-admin | só pelo banco (`scripts/create-super-admin.mjs` ou direto) | quem tem acesso ao banco | **não** |
| Admin | `Super Admin → Usuários → Novo usuário` (perfil Administrador, escolhe a clínica) | Super-admin | sim |
| Psicólogo | `Clínica → Novo usuário da clínica` (perfil Psicólogo) | Admin | sim |
| Secretária | idem (perfil Secretaria) | Admin | sim |
| Psicólogo/Secretária (qualquer papel) | `Super Admin → Novo usuário` | Super-admin | sim |
| Paciente (cadastro clínico) | `Pacientes → Novo paciente` | Secretária, Psicólogo, Admin | sim |
| Paciente (conta de login, papel PACIENTE) | `POST /auth/register` desligado por padrão; o Super Admin também permite o perfil "Paciente" | super-admin ou registro público (desligado) | **parcial** |

**Sobre a conta de login do paciente:** o dialog "Novo usuário" do Super Admin oferece o perfil "Paciente", mas
o produto não tem tela nenhuma voltada ao paciente além de Dashboard/Relatórios (ver capítulo 10). Para o ensaio
criei essa conta direto no banco local.

---

## Novo usuário (Super Admin) — `/super-admin`
**Perfis com acesso:** SUPER_ADMIN.
**O que faz:** cria um usuário de qualquer perfil, com senha provisória definida pelo super-admin.
**Screenshot:**

![cadastro/01-super-admin-novo-admin-preenchido](../screenshots/cadastro/01-super-admin-novo-admin-preenchido.png)

![cadastro/02-super-admin-apos-criar-admin](../screenshots/cadastro/02-super-admin-apos-criar-admin.png)

**Campos e ações:** Nome completo, E-mail, Senha provisória (mín. 10), Perfil, Clínica (opcional).
**Estado:** FUNCIONA COM RESSALVA
**Observado:** criou o admin (201). Para perfis com 2FA, abre um diálogo com a **chave 2FA em texto**, que "não
será exibida novamente — repasse ao usuário agora". **Não gerou nenhum evento de auditoria** (verificado no banco:
nenhum `USER_CREATED_*` após a criação), embora a tela do Super Admin diga "Todas as ações são registradas no audit log".
O admin criado **não é obrigado a trocar a senha provisória**.
**Falta:** auditoria dessa criação; troca de senha forçada; campo de CRP na criação (existe só na edição).
**Comentário do Erico:** _

## Novo usuário da clínica — `/clinica`
**Perfis com acesso:** ADMIN.
**O que faz:** cria psicólogo ou secretária da própria clínica.
**Screenshot:**

![cadastro/03-clinica-tela](../screenshots/cadastro/03-clinica-tela.png)

![cadastro/04-admin-cria-psicologo-apos-criar](../screenshots/cadastro/04-admin-cria-psicologo-apos-criar.png)

![cadastro/05-admin-cria-secretaria-apos-criar](../screenshots/cadastro/05-admin-cria-secretaria-apos-criar.png)

**Campos e ações:** Nome completo, Perfil (Psicólogo(a) / Secretaria), E-mail, Senha provisória (mín. 10), Criar usuário.
**Estado:** FUNCIONA COM RESSALVA
**Observado:** psicólogo criado com `deveTrocarSenha=true` e chave 2FA exibida uma vez. **Gera auditoria**
`USER_CREATED_BY_ADMIN` com quem criou, IP, data, id/e-mail/papel do criado — **sem CRP** (o campo nem existe nessa
tela). Para a secretária o diálogo "Acesso criado" mostra **textos que não se aplicam a ela**: "A troca de senha é
pedida no primeiro acesso" (no banco `deveTrocarSenha=false`; ela entra direto no Dashboard, sem termo) e, em
vermelho, "O segundo fator não será exibido de novo" (ela não tem 2FA). Aparece o toast "Usuário criado com
sucesso." **duas vezes**.
**Falta:** CRP no cadastro do psicólogo; mensagem correta por perfil; troca de senha também para a secretária.
**Comentário do Erico:** _

## Novo paciente — `/pacientes`
Ver capítulo 03 (inclui menor de idade).

## Auditoria de criação de conta (item D)
| Caminho | Gera auditoria? | O que registra |
|---|---|---|
| Admin → Novo usuário da clínica | **sim** | quem criou, IP, data/hora, clínica, id/e-mail/papel do criado. **Não** registra CRP |
| Super Admin → Novo usuário | **NÃO** | nada |
| Super-admin criado por script/banco | não aplicável | — |
**Achado de compliance:** criação de usuário (inclusive de admin) pelo super-admin não deixa rastro de auditoria.
**Comentário do Erico:** _


---

# 03 — Dashboard e Pacientes (inclui tema 7, menor de idade)

> Executado na tela como psicólogo (principal), secretária e admin. Dados fictícios. Screenshots em
> `../screenshots/perfis/*`, `../screenshots/pacientes/`, `../screenshots/tickets/`.

## Dashboard — `/dashboard`
**Perfis com acesso:** todos os logados (sem gate de módulo).
**O que faz:** saudação, cartões de resumo e agenda do dia. Para o psicólogo, mostra o quadro "Psicoterapia —
sessões e ciclos" com aviso de ciclo fechado.
**Screenshot:**

![perfis/psicologo/dashboard](../screenshots/perfis/psicologo/dashboard.png)

**Campos e ações:** cartões "Pacientes ativos", "Agendamentos hoje", "Atendimentos realizados", "Prontuários";
"Agenda de hoje"; para psicólogo, tabela de ciclos com selo "Cobrar ciclo" e link "Ver financeiro →".
**Estado:** FUNCIONA COM RESSALVA
**Observado:** psicólogo vê o aviso "Um paciente fechou o ciclo de 4 sessões — hora de renovar o pagamento." Cartão
"Prontuários" mostra "—". Secretária e admin veem os mesmos cartões. **Paciente (papel PACIENTE)** abre o
Dashboard, que dispara chamadas a `/pacientes` e `/agendamentos` e recebe 403 silenciosamente; os cartões ficam 0.
Contagem de "Pacientes ativos" do paciente-login mostra 0 enquanto a API de relatórios (cap. 10) devolve 2.
**Falta:** conteúdo próprio para o papel PACIENTE. (Não verifiquei se "Atendimentos realizados" muda depois de
uma sessão assinada.)
**Comentário do Erico:** _

## Pacientes (lista) — `/pacientes`
**Perfis com acesso:** psicólogo, secretária, admin (e super-admin com clínica selecionada).
**O que faz:** lista, busca e cadastra pacientes da clínica.
**Screenshot:**

![pacientes/01-lista](../screenshots/pacientes/01-lista.png)

**Campos e ações:** busca por nome ou CPF; filtro por data de nascimento; ordenação; linha terapêutica; "Incluir
inativos"; botão "Novo paciente"; por linha: nome, CPF, nascimento, idade (com selo **"Menor de idade"**), sexo,
projeto, linha terapêutica, telefone, situação e ícone de download (exportação).
**Estado:** FUNCIONA
**Observado:** lista carregou; selo de menor de idade aparece na criança cadastrada. CPF aparece formatado na
lista e **sem formatação** em outras telas (Atendimento Psicológico, impressão do prontuário).
**Falta:** detecção de cadastro duplicado (rodei o ensaio duas vezes e o sistema aceitou dois "Criança Exemplo
Demonstração" iguais, sem CPF).
**Comentário do Erico:** _

## Novo paciente — dialog em `/pacientes`
**Perfis com acesso:** psicólogo, secretária, admin.
**O que faz:** cadastra paciente; se a data de nascimento indica menor, abre os campos do responsável legal.
**Screenshot:**

![pacientes/02-novo-paciente-dialog](../screenshots/pacientes/02-novo-paciente-dialog.png)

![pacientes/03-menor-campos-responsavel](../screenshots/pacientes/03-menor-campos-responsavel.png)

![pacientes/04-menor-sem-responsavel-validacao](../screenshots/pacientes/04-menor-sem-responsavel-validacao.png)

![pacientes/05-menor-responsavel-preenchido](../screenshots/pacientes/05-menor-responsavel-preenchido.png)

![pacientes/06-menor-cadastrado](../screenshots/pacientes/06-menor-cadastrado.png)

**Campos e ações:** Nome, CPF, Data de nascimento, Sexo, Projeto, Linha terapêutica, Telefone, E-mail, Endereço
completo, caixa de consentimento LGPD; para menor: Nome, CPF, Telefone, E-mail e Vínculo do responsável + caixa de
autorização.
**Estado:** FUNCIONA
**Observado (item E.2):** a idade é calculada pela data de nascimento (10 anos → "Menor de idade"). **Cadastrar
menor sem responsável é bloqueado** no formulário, com as mensagens: "Informe o nome do responsável legal.",
"Informe o CPF do responsável legal.", "Informe o telefone do responsável legal.", "Confirme a autorização do
responsável legal." (e-mail e vínculo não são obrigatórios). Com tudo preenchido o cadastro conclui. No banco:
responsável legal **cifrado** (guardado como texto cifrado), `autorizacaoResponsavel {confirmado, registradaPor,
registradaEm}` e auditoria `PATIENT_GUARDIAN_AUTHORIZATION_SET`. CPF do paciente é opcional.
**Falta:** não há emissão de documento de autorização/declaração do responsável (ver cap. 05/09); o CPF do
responsável não é validado no formato (aceitei um CPF válido, não testei inválido).
**Comentário do Erico:** _

## Regressão #36/#38 — dialogs de texto livre (item E.5)
| Dialog | Clique fora / ESC fecham? | Texto preservado? | Cancelar com texto confirma? |
|---|---|---|---|
| Novo paciente | não | sim | sim ("Descartar alterações?") |
| Editar cadastro | não | sim | sim |
| Solicitar correção (com edição pendente no Editar) | não | sim | sim ("Você tem alterações não salvas…") |
| Aplicar teste (seção recolhida e expandida) | não | sim | — |
| Novo agendamento (Agenda) | não | sim | sim |
| Registro de sessão (Atendimento) | não | sim | sim (confirm próprio) |
**Estado geral:** FUNCIONA — nenhuma divergência. O confirm é o `window.confirm` nativo do navegador.
**Comentário do Erico:** _

## Ficha do paciente — `/pacientes/:id`
**Perfis com acesso:** psicólogo, secretária, admin (super-admin só com clínica selecionada).
**O que faz:** reúne tudo do paciente em seções recolhíveis.
**Screenshot:**

![pacientes/10-ficha-recolhida](../screenshots/pacientes/10-ficha-recolhida.png)

![pacientes/11-ficha-expandida](../screenshots/pacientes/11-ficha-expandida.png)

![pacientes/22-secretaria-ficha](../screenshots/pacientes/22-secretaria-ficha.png)

**Campos e ações:** cabeçalho com nome, CPF, idade, situação e **Exportar (LGPD)**; seções **Dados cadastrais**
(com lápis de edição e pedidos de correção), **Prontuários e atendimentos** (com "Ir para data…"), **Documentos
clínicos** (só psicólogo), **Testes Psicológicos** (só psicólogo), **Documentos** (upload), e, só para secretária
e admin, **Observações** e **Histórico de agenda**.
**Estado:** FUNCIONA COM RESSALVA
**Observado:** o lápis abre "Editar cadastro" mesmo com a seção recolhida. "Aplicar teste" abre mesmo recolhida
(corrigido no #38). **Secretária e admin veem "Prontuários e atendimentos 0"** enquanto o paciente tem 1 prontuário:
a API nega (403) e a tela mostra 0 em vez de "sem permissão". Exportar (LGPD) baixou
`Ana_Exemplo_Demonstração-lgpd-AAAA-MM-DD.json`.
**Falta:** a exportação "LGPD" traz **só dados cadastrais** (nome, CPF, nascimento, contato, consentimento);
**não inclui** prontuários, testes, agenda nem documentos. Mensagem clara para quem não pode ver prontuário.
**Comentário do Erico:** _

## Editar cadastro (lápis) e Solicitar correção
**Perfis com acesso:** psicólogo, secretária, admin editam; nome/CPF/nascimento só por correção.
**Screenshot:**

![pacientes/12-editar-cadastro](../screenshots/pacientes/12-editar-cadastro.png)

![pacientes/13-solicitar-correcao](../screenshots/pacientes/13-solicitar-correcao.png)

![tickets/01-solicitacao-enviada](../screenshots/tickets/01-solicitacao-enviada.png)

![tickets/02-ficha-com-solicitacao](../screenshots/tickets/02-ficha-com-solicitacao.png)

**Campos e ações:** campos cadastrais editáveis (nome/CPF/nascimento desabilitados), botão "Solicitar correção".
**Estado:** FUNCIONA
**Observado:** o pedido de correção foi enviado (auditoria `TICKET_OPENED`) e aparece na lista de tickets do
super-admin (cap. 08). "Solicitar correção" com edição pendente pede confirmação antes de fechar o Editar.
**Comentário do Erico:** _


---

# 04 — Agenda, Atendimento/evolução e Testes psicológicos (tema 12)

> Executado como psicólogo; agenda também como secretária. Dados fictícios. Screenshots em `../screenshots/agenda/`,
> `../screenshots/atendimento/`, `../screenshots/testes/`.

## Agenda — `/agenda`
**Perfis com acesso:** psicólogo, secretária, admin (super-admin com clínica).
**O que faz:** calendário (mês/semana/dia) e lista dos agendamentos; cria, inicia, conclui e cancela.
**Screenshot:**

![agenda/01-calendario](../screenshots/agenda/01-calendario.png)

![agenda/02b-lista-amanha](../screenshots/agenda/02b-lista-amanha.png)

![agenda/03-novo-agendamento](../screenshots/agenda/03-novo-agendamento.png)

![agenda/04-menu-agendamento](../screenshots/agenda/04-menu-agendamento.png)

![agenda/10-secretaria-agenda](../screenshots/agenda/10-secretaria-agenda.png)

**Campos e ações:** alternar Calendário/Lista; "Hoje", ‹ ›, Mês/Semana/Dia; **Novo agendamento** com Modalidade,
Paciente, **"ID do profissional responsável"**, Início, Fim, Tipo, Observações; menu da linha com "Iniciar
atendimento", "Concluir atendimento", "Cancelar".
**Estado:** FUNCIONA COM RESSALVA
**Observado:** a lista mostra os agendamentos do dia selecionado (o de amanhã só aparece ao mudar a data).
O campo **"ID do profissional responsável" é um campo de texto** onde se digita um ID interno (pelo código vem
preenchido quando quem agenda é o próprio psicólogo; não conferi isso na tela). Regressão #36: clique fora e ESC não fecham o "Novo agendamento"; o
texto é preservado; Cancelar confirma. Criação de agendamento pela tela **não foi executada** (usei o do seed).
**Falta:** escolher o profissional por nome (para a secretária isso exige saber o ID); não ensaiei conflito de
horário nem bloqueios de agenda (`/agendamentos/bloqueios` existe na API, sem tela localizada).
**Comentário do Erico:** _

## Atendimento Psicológico (painel) — `/atendimento-psicologico`
**Perfis com acesso:** psicólogo (e super-admin). Admin e secretária **não** têm o módulo.
**O que faz:** painel do psicólogo: agendamentos do dia/semana com "1ª consulta", e ações por linha.
**Screenshot:**

![atendimento/01-painel](../screenshots/atendimento/01-painel.png)

**Campos e ações:** filtro "Mostrar" (Agendados e confirmados…), **Novo agendamento** (Paciente, Tipo, Data e hora,
Duração, Observações), por linha: **Histórico**, **Prontuário**, **Atender**.
**Estado:** FUNCIONA
**Observado:** lista mostra data, paciente, CPF sem formatação, tipo, "1ª consulta" e situação "Agendado".
"Atender" cria a sala de vídeo e mostra "Copiar link do paciente" na própria tela.
**Falta:** CPF formatado.
**Comentário do Erico:** _

## Registro da sessão (evolução) — dialog "Prontuário"
**Perfis com acesso:** psicólogo.
**O que faz:** formulário completo da sessão de psicoterapia; a "primeira consulta" abre a anamnese completa.
**Screenshot:**

![atendimento/02-registro-sessao](../screenshots/atendimento/02-registro-sessao.png)

![atendimento/07-registro-preenchido](../screenshots/atendimento/07-registro-preenchido.png)

![atendimento/08-apos-salvar-e-assinar](../screenshots/atendimento/08-apos-salvar-e-assinar.png)

**Campos e ações:** Motivo do atendimento, Avaliação de demanda, Doenças prévias, Diagnósticos de saúde mental,
Medicamentos em uso, Histórico familiar, Sono, Apetite, Atividade física, Uso de substâncias, Estado emocional,
Dor (0–10), Rede de apoio, Avaliação de risco, Objetivos, Procedimento/técnica, Evolução, Encaminhamentos,
Anotações livres, CRP; botões **Fechar**, **Salvar rascunho**, **Salvar e assinar**; botão de IA "Sugerir abordagem".
**Estado:** FUNCIONA
**Observado:** preenchi motivo + evolução e usei "Salvar e assinar": o diálogo fechou, o prontuário aparece na ficha
(contador "Prontuários e atendimentos 1") e a auditoria registra `MEDICAL_RECORD_SIGNED`. Regressão #36: clique fora
e ESC não fecham; "Fechar" com texto pede "As anotações desta sessão ainda não foram salvas. Fechar mesmo assim?".
**Falta:** não ensaiei adendos pós-assinatura (existem na API) nem edição de rascunho; não verifiquei se o
Dashboard atualiza "Atendimentos realizados".
**Comentário do Erico:** _

## Histórico de sessões — dialog "Histórico"
**Perfis com acesso:** psicólogo. **Screenshot:**

![atendimento/04-historico-sessoes](../screenshots/atendimento/04-historico-sessoes.png)

**Estado:** FUNCIONA. **Observado:** "Histórico de sessões — Ana… Nenhuma sessão registrada ainda." antes da sessão.
**Comentário do Erico:** _

## Prontuários (tela geral) — `/prontuarios`
**Perfis com acesso (menu):** admin e super-admin. A API só permite o papel psicólogo.
**Screenshot:**

![perfis/admin/prontuarios](../screenshots/perfis/admin/prontuarios.png)

**Estado:** QUEBRADO (para o admin)
**Observado (item B.3):** o admin vê o item "Prontuários" no menu e abre a tela. A API responde **403** e a tela
mostra um aviso vermelho "Acesso negado — Acesso negado para este papel." e a tabela diz **"Nenhum prontuário
encontrado"** — o que é falso (existem prontuários). Sem stack trace nem detalhe interno: o erro é tratado, mas a
mensagem vazia induz a erro.
**Falta:** ou o admin ganha acesso de leitura, ou o menu/tela some para ele.
**Comentário do Erico:** _

## Impressão do prontuário — `/pacientes/:id/prontuario/:prontuarioId/imprimir`
**Perfis com acesso:** psicólogo (conteúdo). Admin e secretária **abrem a página**.
**Screenshot:**

![perfis/psicologo/imprimir-prontuario](../screenshots/perfis/psicologo/imprimir-prontuario.png)

![perfis/secretaria/imprimir-prontuario](../screenshots/perfis/secretaria/imprimir-prontuario.png)

**Estado:** FUNCIONA COM RESSALVA
**Observado:** psicólogo: "Registro de Atendimento Psicológico" com cabeçalho da clínica (nome e CNPJ), dados do
paciente, campos preenchidos e assinatura "Nome — CRP …"; botão "Imprimir / Salvar PDF". Secretária/admin: a API nega
o conteúdo (403, aviso "Acesso negado") **mas a página renderiza um modelo SOAP vazio com os dados do paciente (nome,
CPF, telefone, e-mail) e o nome da própria secretária na linha de assinatura**, com o botão de imprimir ativo.
**Falta:** bloquear a rota para quem não é psicólogo.
**Comentário do Erico:** _

## Testes psicológicos — seção da ficha
**Perfis com acesso:** psicólogo (API: só PSICOLOGO).
**O que faz:** registra testes aplicados (nome livre, data, resultado em texto).
**Screenshot:**

![testes/01-secao-testes](../screenshots/testes/01-secao-testes.png)

![testes/02-aplicar-teste-dialog](../screenshots/testes/02-aplicar-teste-dialog.png)

![testes/03-teste-registrado](../screenshots/testes/03-teste-registrado.png)

![testes/04-aplicar-com-secao-recolhida](../screenshots/testes/04-aplicar-com-secao-recolhida.png)

**Campos e ações:** "Aplicar teste": Nome do teste, Data de aplicação, Resultado (opcional); tabela Data / Teste / Resultado.
**Estado:** FUNCIONA
**Observado:** o teste foi registrado e a contagem subiu. Com a seção **recolhida**, "Aplicar teste" abre o dialog
(correção do #38). Clique fora/ESC não fecham e o texto fica.
**Falta:** catálogo padronizado de testes (nome é texto livre); edição/exclusão do teste (não localizei).
**Comentário do Erico:** _


---

# 05 — Documentos clínicos, arquivos, impressão e exportação (temas 9, 10, 11)

> Executado como psicólogo; geração de atestado também como secretária. Dados fictícios. PDFs gerados pelo
> navegador em modo de impressão (A4) ficam em `../screenshots/documentos-clinicos/*.pdf`.

## Tipos de documento que existem (tema 11)
- **Gerados pelo sistema (4):** Atestado de comparecimento, Laudo psicoterápico, Encaminhamento, Prescrição de cuidados.
- **Arquivos enviados (upload):** tipos Exame, Receita, Laudo, Termo, Outro.
- **Impressão do prontuário/registro de atendimento.**
- **Exportação LGPD do paciente** (JSON, só dados cadastrais).
- **Não localizei** (tema 9): declaração do responsável legal, termo de consentimento do paciente para
  impressão/assinatura, recibo/nota de pagamento (procurei nas rotas, nos botões e nas seções da ficha).

## Composição e emissão (psicólogo)
| Documento | Rota | Campos | Resultado observado |
|---|---|---|---|
| Atestado | `/pacientes/:id/documentos/atestado` | Data e horário do atendimento | prévia "ATESTADO DE COMPARECIMENTO … compareceu a atendimento psicológico em DD/MM/AAAA, às HH:MM" |
| Laudo | `…/laudo` | Texto do laudo (rascunho vem do histórico de sessões; vazio se não há sessão assinada) | prévia "LAUDO PSICOTERÁPICO" com o texto |
| Encaminhamento | `…/encaminhamento` | Profissional/especialidade de destino; Motivo | prévia "ENCAMINHAMENTO" |
| Prescrição | `…/prescricao` | Checklist de cuidados; texto livre; "Gerar com IA" | prévia "PRESCRIÇÃO DE CUIDADOS EM PSICOLOGIA" |

## Prévia e impressão — páginas "Prévia — …"
**Perfis com acesso:** psicólogo (e, **por URL**, secretária e admin).
**O que faz:** mostra o documento já com cabeçalho (nome e CNPJ da clínica), assinatura (nome do usuário, e CRP
para psicólogo) e rodapé.
**Screenshot:**

![documentos-clinicos/atestado-3-emitido](../screenshots/documentos-clinicos/atestado-3-emitido.png)

![documentos-clinicos/laudo-3-emitido](../screenshots/documentos-clinicos/laudo-3-emitido.png)

![documentos-clinicos/encaminhamento-3-emitido](../screenshots/documentos-clinicos/encaminhamento-3-emitido.png)

![documentos-clinicos/prescricao-3-emitido](../screenshots/documentos-clinicos/prescricao-3-emitido.png)

**Campos e ações:** "Voltar e editar", **"Imprimir / Salvar PDF"** (usa a impressão do navegador).
**Estado:** FUNCIONA COM RESSALVA
**Observado (item E.4):** os quatro documentos geram prévia e imprimem em PDF A4 pelo navegador (arquivos
`atestado-emitido.pdf`, `laudo-emitido.pdf`, `encaminhamento-emitido.pdf`, `prescricao-emitido.pdf`, 37–39 KB cada).
Formato de saída: **só impressão/PDF do navegador**; não há geração de PDF no servidor, número de documento,
código de verificação nem registro de emissão. Os documentos **não ficam salvos** no sistema. O atestado aceita
qualquer data/hora digitada, **sem conferir com a agenda**. O CRP aparece como "CRP CRP 00/00000" porque o valor
do ensaio já traz o prefixo "CRP" (artefato do dado de ensaio; o sistema não normaliza).
**Falta:** registro/auditoria da emissão; conferência do atestado com um atendimento real; guardar a cópia emitida.
**Comentário do Erico:** _

## ⚠ Secretária/admin emitem documento clínico por URL
**Perfis com acesso:** a rota só exige o módulo Pacientes. **Observado:** a **secretária** abriu
`/pacientes/:id/documentos/atestado`, preencheu data e horário e gerou a prévia **"Atesto para os devidos fins que
Ana Exemplo Demonstração compareceu a atendimento psicológico em 22/10/2026, às 14:00"**, com cabeçalho da clínica,
**assinada com o nome da secretária (sem CRP)**, com "Imprimir / Salvar PDF" ativo. A API devolveu 403 só para
`/prontuarios`; a emissão em si não consulta nada. O menu esconde "Documentos clínicos" para ela, mas a rota está
aberta. Screenshots:

![seguranca/01-secretaria-atestado-compor](../screenshots/seguranca/01-secretaria-atestado-compor.png)

![seguranca/02-secretaria-atestado-emitido](../screenshots/seguranca/02-secretaria-atestado-emitido.png)

O laudo mostrou "Acesso negado" (a sugestão de texto depende de prontuários), mas a página abre.
**Severidade: bloqueia beta** (documento com aparência oficial emitido por quem não é profissional).
**Comentário do Erico:** _

## Documentos (arquivos) — `/documentos` e seção "Documentos" da ficha
**Perfis com acesso:** secretária, psicólogo, admin (módulo Documentos).
**O que faz:** lista arquivos de todos os pacientes (só leitura) e permite enviar arquivo pela ficha do paciente.
**Screenshot:**

![documentos/01-lista](../screenshots/documentos/01-lista.png)

![documentos/02-novo-documento](../screenshots/documentos/02-novo-documento.png)

![documentos/03-upload-resultado](../screenshots/documentos/03-upload-resultado.png)

**Campos e ações:** na ficha: "Novo documento" → Nome do documento, Categoria, Arquivo (PDF, JPEG, PNG ou DICOM,
máx. 10 MB). A tela `/documentos` não tem botão de enviar.
**Estado:** NÃO VERIFICÁVEL LOCALMENTE (upload); lista FUNCIONA
**Observado:** no ambiente local o armazenamento (R2) está desligado de propósito. O envio falha com o toast
**"Erro — Failed to fetch"** (mensagem técnica, em inglês) e o dialog permanece aberto. A lista abre vazia.
Download e exclusão **não foram verificados**.
**Falta:** mensagem de erro amigável; verificação do upload/baixar/excluir em ambiente com armazenamento.
**Comentário do Erico:** _

## Exportação LGPD — botão "Exportar (LGPD)" na ficha e ícone na lista
**Perfis com acesso:** psicólogo, secretária, admin. **Estado:** FUNCIONA COM RESSALVA
**Observado:** baixa JSON (`<Nome>-lgpd-AAAA-MM-DD.json`) com id, clínica, nome, CPF, nascimento, sexo, telefone,
e-mail, consentimento, projeto, linha terapêutica, situação e datas. **Não inclui prontuários, testes, agenda nem
documentos.** A exportação é auditada (`PATIENT_EXPORTED`: quem, quando, paciente). A **secretária também exporta**.
**Falta:** exportação completa (portabilidade) e formato legível (PDF); decisão sobre quem pode exportar.
**Comentário do Erico:** _


---

# 06 — Telemedicina (tema 4)

> Executado: navegação completa como psicólogo, criação de sala pela tela, e **chamada de vídeo real entre dois
> navegadores na mesma máquina** com câmera/microfone falsos do Chromium. Screenshots em `../screenshots/telemedicina/`.

## O que foi e o que NÃO foi verificado
| Verificado | Como |
|---|---|
| Criar sala (UI e API), copiar link, encerrar | tela + API local |
| Paciente entra **sem login**, em janela sem sessão | contexto de navegador limpo (`storage` vazio) |
| Chamada de vídeo conecta e transmite nos dois lados | dois navegadores locais, mídia falsa: ambos mostram "Conectado", 2 trilhas por lado, vídeo tocando (640 e 1280 px) |
| Expiração (4 h), reutilização do link, enumeração, encerramento | API local (cap. 10) |
| **NÃO verificado** | câmera/microfone reais; redes diferentes e NAT (a conexão local usa candidatos diretos); servidor TURN em produção; qualidade/latência; entrada de mais de 2 pessoas; gravação (não há) |

## Telemedicina — `/telemedicina`
**Perfis com acesso:** psicólogo, admin (e super-admin com clínica). Secretária não tem o módulo.
**O que faz:** cria e gerencia a sala de vídeo de um agendamento e mostra o histórico de atendimentos por data.
**Screenshot:**

![telemedicina/02-tela](../screenshots/telemedicina/02-tela.png)

![telemedicina/03-nova-sala](../screenshots/telemedicina/03-nova-sala.png)

![telemedicina/04-nova-sala-agendamentos](../screenshots/telemedicina/04-nova-sala-agendamentos.png)

![telemedicina/05-sala-criada](../screenshots/telemedicina/05-sala-criada.png)

**Campos e ações:** **Nova sala** (Agendamento, Modalidade); "Buscar sala por agendamento"; cartão da sala com
situação (Aguardando…), paciente + CPF, Modalidade, Criada em, **Expira em** (4 horas depois), **Entrar na sala
(profissional)**, **Copiar link do paciente**, **Encerrar**, "Registro do atendimento"; "Histórico de atendimentos"
por data/paciente.
**Estado:** FUNCIONA
**Observado:** sala criada ("Sala criada com sucesso."). A tela diz "Envie o link ao paciente por WhatsApp ou
e-mail — ele entra direto pelo navegador, sem login. O link expira em 21:16." Ao criar a sala o sistema também
**enfileira um e-mail** ao paciente com o link; localmente a notificação ficou "pendente"/"falhou" (sem provedor).
**Falta:** conferir na tela o que o paciente vê quando o link expirou.
**Comentário do Erico:** _

## Sala do paciente — `/tele/:token`
**Perfis com acesso:** **qualquer pessoa com o link** (rota pública).
**O que faz:** tela de entrada ("Confira sua câmera e microfone antes de entrar") e a chamada.
**Screenshot:**

![telemedicina/01-sala-paciente-janela-anonima](../screenshots/telemedicina/01-sala-paciente-janela-anonima.png)

![telemedicina/06-chamada-lado-profissional](../screenshots/telemedicina/06-chamada-lado-profissional.png)

![telemedicina/07-chamada-lado-paciente](../screenshots/telemedicina/07-chamada-lado-paciente.png)

**Campos e ações:** botão "Entrar no atendimento"; durante a chamada "Conectado" + cronômetro.
**Estado:** FUNCIONA COM RESSALVA
**Observado:** a tela não mostra o nome do paciente nem da clínica, só "Teleatendimento — Psicologia". O **link do
profissional** (`tokenMedico`) usa a mesma rota pública: quem tiver esse link entra como profissional sem login.
Com muitas tentativas inválidas a tela mostra **"Link de atendimento inválido."** também quando o motivo é o limite
de requisições (HTTP 429), o que confunde.
**Falta:** sala de espera/confirmação de identidade; mensagem própria para "muitas tentativas"; token de uso único.
**Comentário do Erico:** _

Os achados de segurança do token estão no capítulo 10 (item B.1).


---

# 07 — Financeiro, Relatórios, Notificações e Clínica (temas 5 e 6)

> Executado como psicólogo (financeiro, relatórios), admin (clínica, notificações) e secretária (notificações).
> Dados fictícios. Screenshots em `../screenshots/financeiro/`, `relatorios/`, `notificacoes/`, `clinica/`.

## Financeiro (Psi) — `/financeiro-psicologia`
**Perfis com acesso:** psicólogo e super-admin. Admin e secretária: o menu não existe e a rota redireciona para
o Dashboard; **mas a API aceita admin** em `/financeiro/psicologia/*` e a secretária lê `/financeiro/lancamentos`
e `/financeiro/dashboard`.
**O que faz:** o psicólogo define o preço da sessão e cobra o acompanhamento em **ciclos de 4 sessões**, pagos
antes de começar.
**Screenshot:**

![financeiro/01-painel](../screenshots/financeiro/01-painel.png)

![financeiro/02-cobrar-ciclo](../screenshots/financeiro/02-cobrar-ciclo.png)

![financeiro/03-cobranca-preenchida](../screenshots/financeiro/03-cobranca-preenchida.png)

![financeiro/04-apos-criar-cobranca](../screenshots/financeiro/04-apos-criar-cobranca.png)

![financeiro/05-receber](../screenshots/financeiro/05-receber.png)

**Campos e ações:** "Seu preço de sessão" (Valor da sessão R$ + Salvar; mostra "Ciclo de 4 sessões: R$ …");
cartões "Recebido no mês", "A receber", "Ciclos a cobrar", "Pacientes em acompanhamento"; por paciente: barra do
ciclo ("1 de 4 sessões do ciclo · faltam 3 p/ renovar"), situação ("Aguardando pagamento"), "Em aberto R$ …",
**Registrar pagamento**, **Histórico**; dialog **Cobrar ciclo** (Valor do ciclo, Forma de pagamento — opcional,
Vencimento, Observações).
**Estado:** FUNCIONA
**Observado:** salvei R$ 150 → "Ciclo de 4 sessões: R$ 600,00 — é o valor sugerido em cada cobrança."; "Cobrar
ciclo" preencheu o valor; "Criar cobrança" deu "Cobrança criada. Ela fica pendente até você registrar o
recebimento." e o painel passou a mostrar "A receber R$ 600,00" e "Aguardando pagamento". "Registrar pagamento"
estava disponível; **não executei o recebimento nem o histórico**. A numeração de sessões do ciclo coincide com a
do Dashboard.
**Falta:** recibo/nota; cancelar cobrança pela tela (existe `…/cancelar` na API; não localizei botão); relatório
de inadimplência por paciente fora de `/relatorios`.
**Comentário do Erico:** _

## Financeiro geral (`/financeiro/lancamentos`, `/financeiro/dashboard`)
**Estado:** NÃO TEM TELA. **Observado:** os endpoints existem e respondem (200 para admin e secretária), mas nenhuma
rota do web os usa. Ver achado de acesso no cap. 10.
**Comentário do Erico:** _

## Relatórios — `/relatorios`
**Perfis com acesso:** psicólogo, secretária, admin, super-admin **e paciente** (módulo Analytics).
**O que faz:** "Relatórios Gerenciais — visão consolidada de pacientes e atendimentos para a gestão da clínica".
**Screenshot:**

![relatorios/01-relatorios](../screenshots/relatorios/01-relatorios.png)

![perfis/paciente/relatorios](../screenshots/perfis/paciente/relatorios.png)

**Campos e ações:** filtro Período (de/até; "afeta: novos pacientes no período"); cartões "Pacientes ativos" e
"Novos no período"; gráficos "Atendimentos por mês/semana"…; quadros "Cobranças a vencer / vencidas" e "Perda de
seguimento / absenteísmo".
**Estado:** FUNCIONA COM RESSALVA
**Observado:** para psicólogo, secretária e admin renderiza com os números da clínica inteira. **Para o papel
PACIENTE renderiza igual**, com dados da clínica (item B.2, cap. 10): números de pacientes, agenda, financeiro e
**nomes de pacientes** na lista de perda de seguimento.
**Falta:** limitar por perfil (psicólogo vê dados de outros psicólogos da clínica?; não ensaiei com dois
psicólogos).
**Comentário do Erico:** _

## Notificações — `/notificacoes`
**Perfis com acesso:** admin, secretária, super-admin. Psicólogo não tem o módulo.
**O que faz:** painel das mensagens automáticas (lembretes, link de teleconsulta, confirmações) e fila de envio.
**Screenshot:**

![notificacoes/01-notificacoes-admin](../screenshots/notificacoes/01-notificacoes-admin.png)

![notificacoes/02-notificacoes-secretaria](../screenshots/notificacoes/02-notificacoes-secretaria.png)

**Campos e ações:** cartões Enviadas / Entregues / Pendentes / Falhas; tabela "Envios recentes" (Canal, Destino, Status).
**Estado:** QUEBRADO (contadores)
**Observado:** os quatro cartões mostram **0** enquanto a tabela lista **4 envios com status "falhou"** e
**Destino "—"** (sem destinatário). No banco havia notificações "pendente" e "falhou". E-mail e WhatsApp não são
verificáveis no local (sem provedor); as falhas locais são esperadas, mas a divergência dos contadores e o destino
vazio não.
**Falta:** destino visível; contadores coerentes; reenvio; preferências do paciente (opt-out existe na API, sem
tela localizada).
**Comentário do Erico:** _

## Clínica — `/clinica`
**Perfis com acesso:** admin (e super-admin). **O que faz:** logo/timbre da clínica e cadastro de usuários.
**Screenshot:**

![clinica/01-clinica-admin](../screenshots/clinica/01-clinica-admin.png)

![clinica/02-logo-dialog](../screenshots/clinica/02-logo-dialog.png)

![cadastro/03-clinica-tela](../screenshots/cadastro/03-clinica-tela.png)

**Campos e ações:** "Logo da clínica" (Adicionar logo), "Novo usuário da clínica" (cap. 02).
**Estado:** NÃO VERIFICÁVEL LOCALMENTE (logo)
**Observado:** a tela abre; o upload do logo depende do armazenamento (desligado localmente) e **não foi ensaiado**.
**Falta:** lista de usuários da clínica (só há o formulário de criação; não vi como desativar ou redefinir senha
pelo admin — só o super-admin tem essas ações); edição de dados da clínica (nome, CNPJ) pelo admin.
**Comentário do Erico:** _


---

# 08 — Super Admin e Tickets

> Executado como super-admin (conta criada direto no banco local). Screenshots em `../screenshots/super-admin/`,
> `../screenshots/tickets/`.

## Super Admin — Usuários — `/super-admin`
**Perfis com acesso:** só SUPER_ADMIN (a rota redireciona os demais para o Dashboard).
**O que faz:** gerencia todos os usuários da plataforma.
**Screenshot:**

![super-admin/02-usuarios](../screenshots/super-admin/02-usuarios.png)

![super-admin/01-novo-usuario-dialog](../screenshots/super-admin/01-novo-usuario-dialog.png)

![super-admin/03-editar-usuario](../screenshots/super-admin/03-editar-usuario.png)

![super-admin/04-redefinir-senha](../screenshots/super-admin/04-redefinir-senha.png)

![super-admin/05-reset-2fa](../screenshots/super-admin/05-reset-2fa.png)

**Campos e ações:** busca por nome/e-mail; filtros por perfil e status; tabela Nome / E-mail / Perfil / Clínica /
Status / Criado em; por linha: **Editar**, **Redefinir senha**, **Gerar chave 2FA** (só para perfis com 2FA).
**Editar usuário:** Nome, E-mail ("alterar aqui recupera contas com e-mail antigo"), Perfil, Status, Clínica
("mover o usuário troca a clínica em que ele atende"), **CRP** ("preenche assinatura de documentos
automaticamente"), **Módulos liberados** (caixas por módulo).
**Redefinir senha:** campo "Nova senha". **Gerar chave 2FA:** "A chave anterior deixa de funcionar".
**Estado:** FUNCIONA COM RESSALVA
**Observado:** a tela afirma "**Todas as ações são registradas no audit log**". Verifiquei só a **criação de
usuário** (cap. 02): **não gerou registro**. Não executei redefinir senha, gerar chave 2FA nem editar (só abri os
dialogs e fechei). A lista mostra a conta do papel Paciente com Editar e Redefinir senha.
**Falta:** auditoria confirmada nas ações sensíveis; ver quem é o "dono" da chave 2FA mostrada em texto ao super-admin.
**Comentário do Erico:** _

## Super Admin — Clínicas
**Screenshot:**

![super-admin/06-clinicas](../screenshots/super-admin/06-clinicas.png)

![super-admin/07-nova-clinica](../screenshots/super-admin/07-nova-clinica.png)

**Campos e ações:** lista de clínicas; **Nova clínica** (Nome da clínica, Tipo de documento, CNPJ, Plano, Fuso
horário, Duração padrão da consulta, "Clínica do teste beta?", Nome do admin, E-mail do admin); ação de editar.
**Estado:** FUNCIONA COM RESSALVA (criação **não executada**; edição coberta por teste e2e do projeto, não por mim)
**Observado:** abre o dialog de nova clínica com os campos acima. O seletor de clínica aparece no topo da tela do
super-admin ("Clínica Demonstração (Manual)"); sem clínica selecionada, as telas de dados respondem 403 "Selecione
uma clinica para acessar esta area." (visível como erro de rede ao abrir o Dashboard como super-admin).
**Falta:** não ensaiei a criação de clínica nem o ciclo de vida (desativar).
**Comentário do Erico:** _

## Tickets — `/tickets`
**Perfis com acesso:** só SUPER_ADMIN (quem pede a correção é secretária, psicólogo ou admin, pela ficha).
**O que faz:** fila de pedidos de correção de nome, CPF ou data de nascimento do paciente.
**Screenshot:**

![tickets/03-lista-super-admin](../screenshots/tickets/03-lista-super-admin.png)

![tickets/04-atender-dialog](../screenshots/tickets/04-atender-dialog.png)

**Campos e ações:** lista com Aberto em / Justificativa / Paciente / Ações; **Abrir paciente**, **Atender**,
**Recusar**; dialog "Atender ticket": mostra a justificativa, campos Nome, CPF, Nascimento ("Preencha apenas o que
precisa ser corrigido") e **Aplicar correção e atender**.
**Estado:** FUNCIONA
**Observado:** o pedido feito pelo psicólogo chegou à fila com a justificativa. **Não executei Atender nem Recusar.**
Eventos de auditoria existentes: `TICKET_OPENED`, `TICKET_ATTENDED`, `TICKET_REFUSED`, `PATIENT_IDENTITY_CORRECTED`
(só o de abertura foi visto em uso).
**Falta:** o solicitante saber o resultado (a ficha mostra os pedidos; não verifiquei a atualização após atender).
**Comentário do Erico:** _

## Super-admin vê dados de paciente?
**Observado:** com uma clínica selecionada, o super-admin abriu a ficha do paciente (nome, CPF, nascimento) e a lista;
o acesso é auditado (`PATIENT_VIEWED`). Os **prontuários** ficam bloqueados (403). **Decisão de produto a
confirmar:** a plataforma deve enxergar dados pessoais de pacientes das clínicas?
**Comentário do Erico:** _


---

# 09 — IA, Consentimento e Responsável legal (temas 3, 8 e 9)

> IA: verificado **o mecanismo** (código + chamadas locais **sem chave real**); **conteúdo sugerido não foi
> visto**. Consentimento: executado na tela e conferido no banco local.

## Recursos de IA — onde estão (tema 3)
| # | Onde | O que faz | Quem |
|---|---|---|---|
| 1 | Atendimento Psicológico → registro da sessão → **Sugerir abordagem** | sugere abordagem terapêutica a partir da linha terapêutica, motivo, diagnósticos, risco, evolução e anotações | psicólogo |
| 2 | Documentos → Prescrição de cuidados → **Gerar com IA** | gera texto de orientações a partir do checklist e do contexto clínico | psicólogo |

**Screenshot:**

![atendimento/03-ia-sem-chave](../screenshots/atendimento/03-ia-sem-chave.png)

![documentos-clinicos/prescricao-4-ia-sem-chave](../screenshots/documentos-clinicos/prescricao-4-ia-sem-chave.png)


### A decisão final é humana e fica registrada? (C.1/C.2)
**Pelo código (leitura do serviço e das duas telas) e por chamadas locais:**
- **Registro antes da exibição — SIM, fail-closed.** O texto só volta ao usuário depois de gravar o registro de uso
  (`registros_uso_ia`: clínica, usuário, tipo, modelo, entrada e saída **cifradas**) e o evento de auditoria
  `AI_SUGGESTION_GENERATED`. Se qualquer gravação falha, a chamada devolve erro e nada é exibido.
- **`clinicaId` — SIM no registro** (campo obrigatório e imutável) **e no evento de auditoria** (`metadata`).
  **A decisão (`decisoes_uso_ia`) NÃO guarda `clinicaId` no próprio documento** (campos: registro, usuário,
  decisão); a clínica só se obtém via o registro. Achado menor de rastreabilidade por clínica.
- **Decisão humana registrada — SIM quando há decisão.** Aceitar/Descartar chama o endpoint de decisão
  (`ACEITA`/`DESCARTADA`; só o profissional que gerou, uma única vez; gera `AI_SUGGESTION_DECISION_RECORDED`).
- **Decisão obrigatória — NÃO.** Nada impede o psicólogo de ignorar a sugestão: ela fica exibida, sem decisão
  gravada. No código que li (as duas telas e o serviço), nada exige decisão antes de salvar a sessão ou seguir;
  não executei esse fluxo na tela porque não há chave de IA.
- **A IA decide sozinha? — NÃO encontrei ponto.** Na **prescrição**, o texto da IA só entra no documento **depois**
  de a decisão "aceita" ser gravada com sucesso (se a gravação falha, não entra). Na **abordagem**, "aceitar" apenas
  registra a decisão; **não insere nada** no prontuário automaticamente.
**Verificado localmente:** sem `ANTHROPIC_API_KEY` as duas chamadas devolvem **500** com a mensagem "Assistente de IA
não configurado (ANTHROPIC_API_KEY ausente). Peça ao administrador para configurar." e **nenhum registro é
criado** (0 em `registros_uso_ia` e `decisoes_uso_ia`). Decisão sobre registro inexistente: 404.
**NÃO verificável localmente:** a gravação cifrada de uma sugestão real, o conteúdo e a qualidade da sugestão, o
caminho fail-closed em falha do banco.
**Estado:** FUNCIONA COM RESSALVA (mecanismo coerente; decisão não obrigatória; erro de configuração com HTTP 500)
**Falta:** tornar a decisão obrigatória antes de seguir; `clinicaId` na decisão; status 503 para IA não configurada.
**Comentário do Erico:** _

## Termo de consentimento (tema 8)
**Existe?** Dois "termos", de natureza diferente:
1. **Termo do usuário** (Termos de Uso / **Termo de Teste**, textos em `docs/legal/`): aceito pelo **psicólogo e
   admin** no primeiro acesso, em `/aceitar-termos`. **Fica registrado** com versão e data no usuário
   (`termosAceitos`) e na auditoria (`TERMS_ACCEPTED`). Secretária e super-admin **não passam** por esse gate.
2. **Consentimento LGPD do paciente:** **caixa de seleção** no cadastro ("O paciente consente com o tratamento de
   seus dados (LGPD). Se ainda não foi obtido, deixe em branco e registre depois."). Quem marca é o **profissional
   ou a secretária**, não o paciente. Fica no cadastro como `consentimentoLGPD {aceito, dataAceite, versao: 1.0}` e
   a ficha mostra "Aceito/Pendente". A secretária cadastrou um paciente **sem** marcar e ficou `null` (Pendente).
**Não existe:** documento de consentimento para o paciente ler/assinar ou imprimir; registro de **quem** marcou o
consentimento (o campo não guarda o autor; a auditoria de criação guarda quem criou o paciente); texto/versão do
termo do paciente (a "versão 1.0" é só um rótulo).
**Estado:** FUNCIONA COM RESSALVA (existe como registro; não existe como documento)
**Comentário do Erico:** _

## Declaração do responsável legal (tema 9)
**Não encontrei documento com esse nome.** O que existe para menor de idade (cap. 03): campos do responsável
(nome, CPF, telefone, e-mail, vínculo) e a caixa **"Confirme a autorização do responsável legal"**, que grava
`autorizacaoResponsavel {confirmado, registradaPor, registradaEm}` e o evento `PATIENT_GUARDIAN_AUTHORIZATION_SET`.
**Estado:** NÃO EXISTE AINDA (como documento gerado/impresso e assinado)
**Falta:** declaração/termo do responsável gerado pelo sistema; guarda da assinatura; vínculo do responsável com
o fluxo de cobrança e notificação (não verificado).
**Comentário do Erico:** _


---

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
