# Achados do levantamento — para o Erico

Ambiente local, dados fictícios, 22/10/2026. **Segurança no topo.** Cada achado aponta o capítulo com a evidência.
Severidade: **BLOQUEIA BETA** / **ATRAPALHA** / **COSMÉTICO**. Nada foi corrigido; tudo foi registrado
(versão em inglês, para engenharia, em `BUGS-ENCONTRADOS.md` com os IDs BUG-xxx).

## 1. BLOQUEIA BETA

**A1 — O papel PACIENTE lê dados da clínica inteira (BUG-002, cap. 10)**
Quem entra com o papel Paciente abre **Relatórios** e vê números de pacientes, agenda por médico, financeiro e
**nomes de outros pacientes** (lista de "perda de seguimento"). Os endpoints de analytics não restringem por papel.
Hoje só o super-admin cria essa conta e o produto não tem tela de paciente, mas o furo existe.

**A2 — Secretária e admin emitem documento clínico por URL (BUG-003, cap. 05)**
A secretária digitou o endereço do atestado, preencheu data e hora e gerou um **"Atestado de Comparecimento"**
("compareceu a atendimento psicológico em…") **com cabeçalho e CNPJ da clínica, assinado com o nome dela e botão
de imprimir**. O menu esconde a função, a rota não. Mesmo para o psicólogo, a data/hora do atestado é livre: o
sistema não confere com a agenda.

**A3 — Scripts de semente/bootstrap sem trava de host (BUG-001)**
Um shell com a URI de produção exportada grava dado de demonstração direto no banco de produção
(`bootstrap-direto.mjs`, e a classe de risco vale para `seed-demo.mjs` e `seed-prontuarios.mjs`).

## 2. ATRAPALHA

**B1 — Criar usuário como super-admin não deixa rastro de auditoria (BUG-005, cap. 02/08)**
E a própria tela diz "Todas as ações são registradas no audit log". Já a criação feita pelo admin da clínica
**é** auditada (quem, quando, IP, papel), mas **sem o CRP**.

**B2 — Senha provisória não é obrigada a ser trocada para admin e secretária (BUG-006, cap. 01/02)**
Só o psicólogo criado pelo admin troca. O super-admin conhece para sempre a senha inicial do admin. Os textos do
diálogo "Acesso criado" da secretária estão errados (fala de 2FA que ela não tem e de troca de senha que não
acontece); o toast de sucesso aparece duas vezes.

**B3 — Link da telemedicina (BUG-007, cap. 10)**
UUID forte, vale 4 h, encerra com a sala, limite de tentativas funciona, não aparece em log. **Mas:** é
reutilizável, entra sem login e sem sala de espera, fica em **texto puro** no banco e **dentro da notificação de
e-mail**, e o link do profissional tem o mesmo poder que o do paciente. Quem recebe o e-mail e reencaminha, entrega
a sala.

**B4 — Admin e secretária leem financeiro que o menu esconde (BUG-008, cap. 07/10)**
**B5 — Admin vê "Prontuários" e a tela mente (BUG-009, cap. 04)**: API nega, tela mostra "Nenhum prontuário
encontrado". Na ficha, secretária e admin veem "Prontuários e atendimentos 0" quando há 1.
**B6 — Notificações: contadores zerados com 4 falhas listadas e destino "—" (BUG-010, cap. 07)**
**B7 — Exportação "LGPD" incompleta e aberta à secretária (BUG-012, cap. 05)**: só dados cadastrais.
**B8 — IA (BUG-011, cap. 09)**: a decisão humana é registrada quando existe, a IA não decide sozinha, **mas a
decisão não é obrigatória** e `decisoes_uso_ia` não guarda `clinicaId`. Sem chave, erro HTTP 500.
**B9 — Termo de consentimento e declaração do responsável (cap. 09)**: o consentimento do paciente é só uma
caixa marcada por quem cadastra (sem autor, sem documento); **declaração do responsável legal não existe**; o
termo de uso só vale para psicólogo e admin, não para secretária.
**B10 — Sem "esqueci minha senha" e sem aviso depois da troca forçada de senha (BUG-013, cap. 01)**
**B11 — Agenda pede "ID do profissional" digitado (BUG-014, cap. 04)**; **duplicidade de paciente aceita (BUG-015)**.
**B12 — Super-admin enxerga dados pessoais de pacientes de uma clínica (cap. 08)**: auditado, mas é decisão de produto.
**B13 — Dashboard do paciente dispara 403 silenciosos (BUG-016)**; upload mostra "Failed to fetch" cru (BUG-017, ambiente).
**B14 — `create-super-admin.mjs` sem modo "só local" (BUG-004)**: tem trava anti-banco-errado (exige banco e host
esperados), então o risco é menor que o da A3; o padrão do e-mail dentro do script é pessoal.

## 3. COSMÉTICO
CPF sem máscara no Atendimento Psicológico e na impressão; "CRP CRP 00/00000" (dado do ensaio, sem normalização);
redirecionamento silencioso ao Dashboard em rota proibida; confirmação com `window.confirm` nativo (já conhecido);
mensagem "Link de atendimento inválido" também para limite de tentativas.

## 4. O que está BOM (observado)
- **Regressão #36/#38: nenhuma divergência** em 6 dialogs de texto livre; "Aplicar teste" abre com a seção recolhida.
- **Telemedicina: a chamada de vídeo conecta** nos dois lados (mídia falsa, mesma máquina).
- **Fluxos que funcionam ponta a ponta:** onboarding do psicólogo; cadastro de menor com responsável (bloqueia
  sem responsável); sessão registrada e assinada (auditada); testes psicológicos; financeiro por ciclos (preço →
  cobrança → painel); emissão e impressão em PDF dos 4 documentos; pedido de correção até a fila do super-admin.
- **Auditoria que existe e foi vista:** login, termo aceito, paciente criado, autorização do responsável,
  exportação, prontuário assinado, ticket aberto, usuário criado pelo admin.
- **Gates de rota** funcionam para a maior parte das telas; 403 da API vem tratado, sem stack trace.
- **CPF e responsável legal aparecem cifrados no banco.**

## 5. Não verificado (dito sem rodeio)
Upload/baixar/excluir arquivos e logo; e-mail e WhatsApp reais; conteúdo e gravação de IA real; câmera/NAT/TURN
reais; criar clínica; atender/recusar ticket; registrar pagamento; redefinir senha/2FA; adendos; bloqueios de
agenda; criar agendamento pela tela; isolamento entre dois psicólogos; layout em celular.

## 6. Para você decidir
1. A1 e A2 entram no beta de 29/10 como correção obrigatória? Sugiro sim.
2. O papel Paciente existe de fato no produto? Se não, o melhor é não permitir criá-lo.
3. Telemedicina: aceita o desenho "link = credencial" com os riscos de B3, ou quer uso único / sala de espera?
4. Decisão da IA deve ser obrigatória?
