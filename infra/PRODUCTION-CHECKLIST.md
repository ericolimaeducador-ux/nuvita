# Nuvita — Checklist de Produção

Estado após o hardening de configuração. O código está **pronto para produção segura**.
As pendências restantes são ações de nuvem/credenciais que exigem suas chaves.

## ✅ Já feito (código)

- **Postura de segurança desacoplada da fonte de segredos.** Rodar `NODE_ENV=production`
  agora liga CSP, HSTS e fecha o Swagger, **sem** exigir o GCP Secret Manager —
  basta `CONFIG_SOURCE=env`. Verificado em runtime: `/health` 200, `/docs` 404,
  headers CSP/HSTS presentes.
- **Swagger `/docs` fechado em produção** (reabre só com `EXPOSE_DOCS=true`).
- **CSP do Helmet ligado** fora de `development`.
- **LOG_LEVEL=info** em produção (sem logs `debug` verbosos com possível PII).
- **`gen-cloudrun-env.cjs`** agora gera `NODE_ENV=production` + `CONFIG_SOURCE=env` + `LOG_LEVEL=info`.
- **CI** (`ci.yml`) roda em `main` e `integracao`, cobrindo API (type-check/build/test) e web (build).
- **CD da API** (`deploy-api.yml`) — deploy automatizado no Cloud Run em push para `main`.

## 🔧 Pendências de nuvem (você precisa executar)

### 1. Rotacionar os segredos antes do go-live  🔴
Os valores em `apps/api/.env` / `cloudrun.env.yaml` foram expostos em sessões de dev.
Antes de tráfego real, rotacione e regenere o env-vars-file:
- Senha do usuário do MongoDB Atlas
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`)
- `PATIENT_DATA_ENCRYPTION_KEY` / `PATIENT_DATA_HASH_KEY` ⚠️ trocar a encryption key invalida dados já criptografados — só antes de ter dados reais
- `PRONTUARIO_SIGNATURE_SECRET`, `BOOTSTRAP_SECRET`
- Tokens Resend, Cloudflare R2, Z-API, Upstash Redis
- Depois: `node scripts/gen-cloudrun-env.cjs`

### 2. GitHub Secrets (para o CD automático) — ✅ FEITO via Workload Identity Federation
Configurado em 2026-06-24 (a org bloqueia chaves de SA, então usamos WIF/OIDC — sem
chave de longa duração). Já criados no repo:
- `GCP_PROJECT_ID` = `nuvita-499800`
- `GCP_WIF_PROVIDER` = provider OIDC (pool `github-pool`, restrito ao owner `ericolimaeducador-ux`)
- `GCP_SA_EMAIL` = `gh-actions-deployer@nuvita-499800.iam.gserviceaccount.com`
  (papéis: run.admin, cloudbuild.builds.editor, artifactregistry.admin, iam.serviceAccountUser, storage.admin)
- `CLOUDRUN_ENV_YAML` = conteúdo de `cloudrun.env.yaml` ⚠️ **regerar e re-setar após rotacionar os segredos (item 1)**

Ainda falta:
- `VITE_API_URL` — URL pública da API no Cloud Run (sai após o 1º deploy; usar no build do GitHub Pages)

### 3. MongoDB Atlas — acesso de rede
Cloud Run usa IPs dinâmicos. Em Atlas → Network Access, libere `0.0.0.0/0`
(protegido por usuário/senha forte) **ou** configure VPC peering / Private Endpoint.

### 4. APP_ROOT_DOMAIN — ✅ FEITO
`gen-cloudrun-env.cjs` agora grava `APP_ROOT_DOMAIN=nuvita.app.br` no env de produção.

### 4b. Domínio próprio www.nuvita.app.br + api.nuvita.app.br — DNS pendente (registro.br)
Config de código já feita: `VITE_BASE=/`, `apps/web/public/CNAME=www.nuvita.app.br`,
CORS com www/apex, secret `VITE_API_URL=https://api.nuvita.app.br`.

**Falta no registro.br (DNS):**
- `www` → CNAME `ericolimaeducador-ux.github.io.`  (frontend no Pages)
- apex `nuvita.app.br` → 4 registros A do GitHub Pages:
  `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- GitHub → Settings → Pages → Custom domain = `www.nuvita.app.br` (Enforce HTTPS)

**api.nuvita.app.br (após o 1º deploy da API):**
1. Verificar o domínio no Google (Search Console) — adicionar o TXT que o GCP indicar.
2. `gcloud run domain-mappings create --service nuvita-api --domain api.nuvita.app.br --region southamerica-east1`
   (se a região não suportar domain mapping, usar um Load Balancer externo global).
3. Adicionar no registro.br o registro (CNAME/A) que o comando retornar.

### 5. Primeiro deploy / bootstrap
- Merge `integracao` → `main` dispara CI + deploy (web e API).
- Rodar o bootstrap do admin no banco de produção (ver `scripts/`).
- Confirmar `CORS_ORIGIN` cobre o domínio final do frontend.

## 📌 Recomendado (não bloqueia, mas importante)
- Ampliar a cobertura de testes (hoje 8 testes) — pelo menos um e2e do pipeline clínico de incontinência urinária.
- Definir limites de recursos do Cloud Run (`--memory`, `--cpu`, `--max-instances`).
- Monitoramento/alertas (Cloud Run métricas + uptime check no `/health`).
