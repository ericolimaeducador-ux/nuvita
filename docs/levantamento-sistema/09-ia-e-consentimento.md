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
