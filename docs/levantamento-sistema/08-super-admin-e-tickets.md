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
