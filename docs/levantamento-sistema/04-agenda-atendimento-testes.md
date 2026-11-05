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
