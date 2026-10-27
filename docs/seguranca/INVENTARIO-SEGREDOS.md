# Inventário de segredos do nuvita-psi

Levantado em 2026-10-22. **Este arquivo não contém nenhum valor de segredo**: só nome, onde mora, para que serve e
o que acontece se for perdido. Nunca cole valores aqui. (Escrito em PT-BR a pedido do Erico, por ser material de
operação dele; as regras de `enforces-english` valem para os demais docs de engenharia.)

Como foi levantado: leitura do código (`apps/api`, `apps/web`, `scripts`, `.github/workflows`), `gcloud` com formato
restrito a **nomes** (Secret Manager, KMS, variáveis do Cloud Run) e `gh secret list` (só nomes). Nenhum valor foi
lido, impresso ou gravado.

## Chaves categoria A (perder = dado existente ilegível ou prova perdida para sempre)

| NOME | O que fica ilegível/inválido se perder |
|------|----------------------------------------|
| `PATIENT_DATA_ENCRYPTION_KEY` | CPF e dados do responsável legal de **todos** os pacientes (cifrados no banco). Sem a chave não há recuperação. |
| `IA_USO_ENCRYPTION_KEY` | Texto de entrada e saída guardado na trilha de uso de IA (`decisoes_uso_ia`/registros de IA). |
| `PRONTUARIO_SIGNATURE_SECRET` | Não decifra nada, mas é a chave do HMAC da **assinatura dos prontuários**. Perdida, nenhum prontuário já assinado pode mais ser verificado como íntegro. A prova, com valor legal, some. |
| `PATIENT_DATA_HASH_KEY` | Índice de busca/unicidade por CPF (`cpfHash`). Perdida, a busca e a trava de duplicidade por CPF deixam de achar os pacientes existentes. Só é reconstruível se `PATIENT_DATA_ENCRYPTION_KEY` estiver preservada (decifra e recalcula). Por isso entra aqui. |

> **Estado real em 2026-10-22: nenhuma dessas quatro chaves tem cópia fora do Cloud Run.** O Secret Manager e o KMS
> do projeto estão **desabilitados** (as APIs nunca foram usadas). As chaves existem só como variáveis de ambiente
> em texto puro na revisão ativa do serviço `nuvita-psi-api` e, como origem do deploy, dentro do secret do GitHub
> `CLOUDRUN_ENV_YAML`, que **não pode ser lido de volta** (o GitHub só aceita escrever). Se o serviço for recriado
> ou o `CLOUDRUN_ENV_YAML` for sobrescrito com valores errados, não há de onde recuperar.

## Onde moram hoje

| Ambiente | O que guarda | Observação |
|----------|--------------|------------|
| Cloud Run `nuvita-psi-api` (southamerica-east1) | 42 variáveis de ambiente, todas como valor direto (**nenhuma** vem do Secret Manager) | `CONFIG_SOURCE=env`: a API lê do ambiente, não do GCP |
| GitHub Actions (repo) | `CLOUDRUN_ENV_YAML`, `GCP_PROJECT_ID`, `GCP_SA_EMAIL`, `GCP_WIF_PROVIDER`, `GCP_HOSTING_SA_EMAIL`, `VITE_API_URL` | Só escrita; `CLOUDRUN_ENV_YAML` é o arquivo completo aplicado a cada deploy |
| GCP Secret Manager | **nada** (API desabilitada) | O caminho `CONFIG_SOURCE=gcp` do código existe, mas não é usado |
| GCP KMS | **nada** (API desabilitada) | `KMS_KEY_RING`/`KMS_KEY` só servem ao caminho `gcp` |
| Máquina do Erico | desconhecido | Não foi verificado; o Erico informou não ter backup |

## Tabela completa

Legenda de CATEGORIA: **A** catastrófico, **B** grave (derruba o serviço, nada se perde, basta substituir),
**C** incômodo (desloga/quebra integração, basta gerar outra), **—** só configuração (não é segredo).
"Boot" = a API **não sobe** sem a variável (`requiredVars` do `ConfigService`).

### Chaves de criptografia e assinatura

| NOME | ONDE MORA | PARA QUE SERVE | BOOT | CAT. | OBSERVAÇÃO |
|------|-----------|----------------|------|------|------------|
| `PATIENT_DATA_ENCRYPTION_KEY` | Cloud Run + CLOUDRUN_ENV_YAML | Cifra CPF e responsável legal do paciente | Sim | **A** | Exige 32 bytes (base64). Sem rotação com versão de chave no código: trocar sem migrar torna os dados ilegíveis |
| `PATIENT_DATA_HASH_KEY` | idem | HMAC do CPF para busca/unicidade | Sim | **A** | Reconstruível só com a chave acima |
| `IA_USO_ENCRYPTION_KEY` | idem | Cifra entrada/saída da trilha de uso de IA | Sim | **A** | Domínio próprio, separado da chave de paciente |
| `PRONTUARIO_SIGNATURE_SECRET` | idem | HMAC da assinatura do prontuário | Sim | **A** | Mín. 32 caracteres. Trocar invalida a verificação das assinaturas antigas |

### Sessão e acesso

| NOME | ONDE MORA | PARA QUE SERVE | BOOT | CAT. | OBSERVAÇÃO |
|------|-----------|----------------|------|------|------------|
| `JWT_ACCESS_SECRET` | Cloud Run + YAML | Assina o token de acesso | Sim | C | Perder desloga todos; gerar outra resolve. Mín. 32 caracteres, diferente do refresh |
| `JWT_REFRESH_SECRET` | idem | Assina o token de renovação | Sim | C | Idem |
| `BOOTSTRAP_SECRET` | idem | Autoriza criar o primeiro super-admin | Sim | C | Mín. 32 caracteres. Só importa no bootstrap |
| `BCRYPT_ROUNDS` | idem | Custo do hash de senha | Não (padrão 12) | — | Configuração |

### Banco, fila e armazenamento

| NOME | ONDE MORA | PARA QUE SERVE | BOOT | CAT. | OBSERVAÇÃO |
|------|-----------|----------------|------|------|------------|
| `MONGODB_URI` | Cloud Run + YAML | URI do banco (contém usuário e senha do Atlas) | Sim | B | A senha é recriável no Atlas. **Os dados** moram no Atlas, que é outro lugar a proteger |
| `REDIS_URL` | idem | Fila de notificações e sessão (contém credencial) | Sim | B | Recriável no provedor. Provedor não identificado neste levantamento |
| `DOCUMENT_STORAGE_ACCESS_KEY_ID` | idem | Acesso ao armazenamento de documentos (S3/R2) | Sim | B | Recriável no provedor |
| `DOCUMENT_STORAGE_SECRET_ACCESS_KEY` | idem | Idem (parte secreta) | Sim | B | Idem. Perder o par derruba upload/download até trocar; os arquivos continuam no bucket |
| `DOCUMENT_STORAGE_BUCKET` / `_REGION` / `_ENDPOINT` / `_FORCE_PATH_STYLE` | idem | Destino do armazenamento | Sim (menos FORCE_PATH_STYLE) | — | Configuração |

### Integrações de terceiros

| NOME | ONDE MORA | PARA QUE SERVE | BOOT | CAT. | OBSERVAÇÃO |
|------|-----------|----------------|------|------|------------|
| `RESEND_API_KEY` | Cloud Run + YAML | Envio de e-mail (provedor ativo: resend) | Não | B | Sem ela, e-mails (inclusive senhas provisórias) não saem |
| `EVOLUTION_API_KEY` | idem | WhatsApp (provedor ativo: evolution) | Não | B | Recriável no provedor |
| `ANTHROPIC_API_KEY` | idem | IA clínica | Não | B | Sem ela (ausente ou vazia) a IA responde 503 (desde o #56; antes era 500). Chave presente mas recusada pela Anthropic (revogada/rotacionada) responde 500, com `401 invalid x-api-key` no log. Rotação: `infra/PRODUCTION-BACKEND.md` §2 |
| `TWILIO_AUTH_TOKEN` | idem | SMS | Não | B | Recriável |
| `TWILIO_ACCOUNT_SID` | idem | Identificador da conta Twilio | Não | — | Identificador (não é a parte secreta) |
| `TURN_CREDENTIAL` | **não está no Cloud Run** | Credencial de relay da telemedicina | Não | B | Opcional; hoje a telemedicina funciona sem TURN |
| `SENDGRID_API_KEY`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN` | **não estão no Cloud Run** | Provedores alternativos (e-mail/WhatsApp) | Não | B | Opcionais; provedores ativos são outros |

### Autenticação entre serviços

| NOME | ONDE MORA | PARA QUE SERVE | BOOT | CAT. | OBSERVAÇÃO |
|------|-----------|----------------|------|------|------------|
| `REMINDER_SCHEDULER_EXPECTED_AUDIENCE` | Cloud Run + YAML | Audiência OIDC aceita em `/internal/processar-lembretes` | Sim | C | É identificador, não segredo forte; perder = rota de lembretes fecha até reconfigurar |
| `REMINDER_SCHEDULER_EXPECTED_SERVICE_ACCOUNT` | idem | Conta de serviço que pode chamar essa rota | Sim | C | Idem |
| `GCP_WIF_PROVIDER`, `GCP_SA_EMAIL`, `GCP_HOSTING_SA_EMAIL` | GitHub Actions | Federação (OIDC) do deploy: **sem chave de longa duração** | — | C | Identificadores; o deploy usa Workload Identity, não há chave de SA a guardar |

### Configuração (não é segredo)

`NODE_ENV`, `CONFIG_SOURCE`, `CORS_ORIGIN`, `LOG_LEVEL`, `PORT` (injetada pelo Cloud Run), `APP_ROOT_DOMAIN` (boot),
`EMAIL_FROM` (boot), `EMAIL_PROVIDER`, `WHATSAPP_PROVIDER`, `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`,
`TOTP_ISSUER`, `ANTHROPIC_MODEL`, `GCP_PROJECT_ID`, `KMS_KEY_RING`, `KMS_KEY`,
`INSCRICOES_TESTE_EMAIL_AVISO`, `INSCRICOES_TESTE_EMAIL_RESPOSTA`, `ALLOW_PUBLIC_REGISTRATION`, `EXPOSE_DOCS`,
`DNS_SERVERS`, `TURN_URL`, `TURN_USERNAME`, `VITE_API_URL` (secret do GitHub, mas é URL pública), `VITE_BASE`,
`VITE_PROXY_TARGET`, `TWILIO_FROM`.

### Só de scripts (não rodam na API)

`SUPER_ADMIN_EMAIL/NOME/PASSWORD`, `ADMIN_EMAIL/PASSWORD`, `MEDICO_EMAIL/PASS`, `CLINICA_ID`, `BOOTSTRAP_SECRET_INPUT`,
`EXPECTED_DB_NAME`, `EXPECTED_DB_HOST`, `TOTP_SECRET` (script `totp.mjs`), `ROTATION_SCHEDULE_DAYS`, `PW_CHANNEL`.
São entradas de execução manual; nenhuma mora em ambiente de produção.

## Órfãos e divergências

1. **Secret Manager e KMS desabilitados, mas o código tem um caminho inteiro para eles.** O ramo `CONFIG_SOURCE=gcp`
   (`google-secrets.service.ts`, nomes como `patient-data-encryption-key`) nunca é usado em produção. Há docs em
   `infra/` descrevendo esse caminho como o oficial. O doc e a realidade divergem.
2. **`SECRETS_BACKEND`** está no Cloud Run (valor `local-env`) e **o código não lê**: órfã. Só aparece em `.env.example`
   e nos docs de `infra/`.
3. **`KMS_KEY_RING`, `KMS_KEY`, `GCP_PROJECT_ID`** estão no Cloud Run mas só alimentam o caminho `gcp`, que está
   desligado: efetivamente sem uso em produção hoje.
4. **Lido pelo código e ausente do Cloud Run, todos opcionais:** `SENDGRID_API_KEY`, `ZAPI_*`, `TURN_*`, `DNS_SERVERS`,
   `EXPOSE_DOCS`, `ALLOW_PUBLIC_REGISTRATION` (padrão em produção: fechado). Nenhuma obrigatória no boot falta:
   as 18 variáveis exigidas por `requiredVars` estão presentes no serviço.
5. **`CLOUDRUN_ENV_YAML` não pôde ser inspecionado** (o GitHub não devolve o conteúdo). Por inferência do workflow
   `deploy-api.yml` (aplica o arquivo inteiro com `--env-vars-file`), seus nomes devem ser os mesmos do serviço
   acima. **Não confirmado.**
6. **Segredo de TOTP dos usuários não tem chave de cifra:** o segredo 2FA fica em texto no banco (`2faSecret`); a
   branch `fix/totp-secret-cifrado` (adiada) introduziria a chave `TOTP_ENCRYPTION_KEY`, que **seria categoria A**.
7. **O segredo fixo antigo de `scripts/totp.mjs` permanece no histórico do git** (BUG-018): rotacionar se pertenceu
   a conta real.
8. **O projeto GCP `nuvita-499800` é compartilhado com o "Nuvita original"** (comentário em `deploy-api.yml`).
   Qualquer limpeza ou desativação de API ali pode afetar o outro serviço.
9. **Não identificado neste levantamento:** provedor do Redis, provedor do armazenamento (S3 ou R2), onde o Atlas
   guarda o backup do banco, e se existe cópia pessoal de qualquer valor. Quem sabe é o Erico.
