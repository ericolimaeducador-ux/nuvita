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
