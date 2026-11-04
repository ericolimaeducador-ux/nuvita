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
