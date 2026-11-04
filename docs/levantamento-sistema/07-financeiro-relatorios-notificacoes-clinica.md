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
