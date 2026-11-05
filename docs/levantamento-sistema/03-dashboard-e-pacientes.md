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
