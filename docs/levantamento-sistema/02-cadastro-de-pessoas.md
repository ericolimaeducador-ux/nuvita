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
