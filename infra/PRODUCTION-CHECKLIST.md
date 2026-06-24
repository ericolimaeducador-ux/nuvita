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

### 2. Configurar os GitHub Secrets (para o CD automático)
Settings → Secrets and variables → Actions:
- `GCP_SA_KEY` — JSON da service account (papéis: Cloud Run Admin, Cloud Build Editor,
  Artifact Registry Writer, Service Account User, Storage Admin)
- `GCP_PROJECT_ID` — ex.: `nuvita-499800`
- `CLOUDRUN_ENV_YAML` — conteúdo completo de `cloudrun.env.yaml` (já com segredos rotacionados)
- `VITE_API_URL` — URL pública da API no Cloud Run (para o build do GitHub Pages)

### 3. MongoDB Atlas — acesso de rede
Cloud Run usa IPs dinâmicos. Em Atlas → Network Access, libere `0.0.0.0/0`
(protegido por usuário/senha forte) **ou** configure VPC peering / Private Endpoint.

### 4. APP_ROOT_DOMAIN
Hoje `localhost`. Se o multi-tenancy por subdomínio for usado em produção, ajuste
para o domínio real antes do deploy. Para domínio único (GitHub Pages) é inofensivo.

### 5. Primeiro deploy / bootstrap
- Merge `integracao` → `main` dispara CI + deploy (web e API).
- Rodar o bootstrap do admin no banco de produção (ver `scripts/`).
- Confirmar `CORS_ORIGIN` cobre o domínio final do frontend.

## 📌 Recomendado (não bloqueia, mas importante)
- Ampliar a cobertura de testes (hoje 8 testes) — pelo menos um e2e do pipeline clínico VaPro.
- Definir limites de recursos do Cloud Run (`--memory`, `--cpu`, `--max-instances`).
- Monitoramento/alertas (Cloud Run métricas + uptime check no `/health`).
