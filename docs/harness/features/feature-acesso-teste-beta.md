## Feature: Acesso do teste beta (C1, C2, C3)

### Description

Aprovado pelo Erico em 15/10/2026 (respostas registradas literalmente):

> C1 Mostrar QR code junto do código de 2FA (painel super-admin e menu Clínica) ==> APROVADO
> C2 Mostrar ao ADMIN a senha e o código de 2FA do psicólogo que ele acabou de criar ==> APROVADO
> C3 Durante o teste, o primeiro acesso pede o aceite do Termo de Teste, não dos Termos da Dealer ==> APROVADO

Contexto dado pelo Erico: "A clinica já entra com acesso ADM e o proprio usuario aprende a cadastrar-se
como psicologo tambem"; "Ele nao verá os termos da dealer, somente o termo de teste isso so vem depois na
versão final"; "o 2FA pode aparecer como Qrcode ... mas o codigo tambem fica visivel ele escolhera como cadastrar".

### Problem

- O menu Clínica criava o PSICÓLOGO com 2FA obrigatório, mas descartava o segredo: o usuário criado nunca entrava.
- Não havia QR code em nenhuma tela (só o texto da chave).
- O primeiro acesso exigia os Termos de Uso da Dealer v2.0 (contrato comercial) também dos testers.

### Solution and trade-offs

- C1: componente `SegredoDoisFatores` (qrcode.react 4.2.0) com QR + chave em texto, usado no painel
  super-admin (novo usuário, reset de 2FA, nova clínica) e no menu Clínica. `POST /super-admin/clinicas`
  passa a devolver também `otpauthUrl` (mesmo segredo do base32). Amenda o "sem QR code" de
  feature-super-admin-clinic-onboarding.
- C2: o menu Clínica mostra, uma vez, e-mail, senha provisória e QR/chave do usuário criado.
- C3: `faseTeste` na clínica (padrão false; o formulário de nova clínica vem marcado durante o teste),
  copiada nos usuários dela (cadastro, mudança de clínica e edição da clínica propagam). A versão exigida
  vem de `versaoTermosExigida(faseTeste)` em packages/shared/src/termos: Termo de Teste
  (`docs/legal/termo-de-teste.md`, texto idêntico ao da página de inscrição) durante o teste, Termos de Uso
  fora dele. Desmarcar a clínica no lançamento dispara o aceite dos Termos de Uso. A inscrição pública passa
  a ler a mesma constante.
- Trade-off: `faseTeste` duplicada no usuário para o gate não consultar a clínica a cada requisição.

### Acceptance criteria

- [x] Usuário de clínica em teste aceita só o Termo de Teste; fora do teste, só os Termos de Uso.
- [x] Sair da fase de teste reabre o gate (aceite dos Termos de Uso).
- [x] ADMIN vê QR e chave do psicólogo que criou; super-admin vê QR na nova clínica e no reset de 2FA.
- [x] copy-legal falha o build se a versão do .md divergir da constante compartilhada (os dois textos).
