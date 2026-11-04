# Nuvita Psi — Checklist de Produção

nuvita-psi é um spin-off do [Nuvita](https://github.com/ericolimaeducador-ux/nuvita)
e roda como **subdomínio** do domínio já existente, **compartilhando o mesmo
projeto GCP** (`nuvita-499800`) — não é um projeto/infra isolado do zero.

- **Web**: `psi.nuvita.app.br` (GitHub Pages, repo próprio `nuvita-psi`)
- **API**: `api-psi.nuvita.app.br` (Cloud Run, serviço próprio `nuvita-psi-api`,
  mesmo projeto GCP do Nuvita original)
- **Banco**: cluster MongoDB Atlas — pode ser o mesmo cluster do Nuvita original
  com um banco separado (`nuvita-psi`, já configurado em `.env.example`), ou um
  cluster/projeto Atlas dedicado — decidir antes do 1º deploy.

## ✅ Já feito (código)

- Módulos e páginas específicos do pipeline de incontinência urinária/SUS
  removidos (avaliação IU, follow-up, laudo médico, entregas, produtos).
- Papel `ENFERMEIRO` e módulos de permissão associados removidos.
- Rebrand para "Nuvita Psi" (`apps/web/src/lib/brand.ts`, títulos, Swagger).
- Nomes de workspace/pacote renomeados (`@nuvita-psi/api`, `@nuvita-psi/web`).
- `KMS_KEY_RING`/`KMS_KEY` default trocados para `nuvita-psi-*` — **as chaves de
  criptografia de dados de paciente (LGPD) devem ser próprias do nuvita-psi,
  nunca reaproveitar as chaves/segredos do Nuvita original**, mesmo compartilhando
  o projeto GCP.
- `docker-compose.yml` / `Dockerfile`s ajustados para os novos nomes de
  container/workspace (`nuvita-psi-api`, `nuvita-psi-web`).
- Serviço Cloud Run renomeado para `nuvita-psi-api` em `deploy-api.yml` e
  `gen-cloudrun-env.cjs`; CORS/`APP_ROOT_DOMAIN` apontando para
  `psi.nuvita.app.br`.
- `apps/web/public/CNAME` = `psi.nuvita.app.br`.

## 🔧 Pendências de nuvem (você precisa executar)

### 1. Segredos PRÓPRIOS do nuvita-psi (não reaproveitar os do Nuvita original) 🔴
Mesmo no mesmo projeto GCP, gere segredos **novos e distintos** para:
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`)
- `PATIENT_DATA_ENCRYPTION_KEY` / `PATIENT_DATA_HASH_KEY` — **críticos**: dados
  de paciente do nuvita-psi devem estar isolados dos dados do Nuvita original.
- `PRONTUARIO_SIGNATURE_SECRET`, `BOOTSTRAP_SECRET`
- Usuário/senha do MongoDB (banco `nuvita-psi`, mesmo cluster Atlas ou um novo)
- Tokens Resend, Cloudflare R2 (bucket `nuvita-psi-documentos`), Z-API/WhatsApp
- Depois: `node scripts/gen-cloudrun-env.cjs`

### 2. GitHub Secrets do repo `nuvita-psi` (para o CD automático)
Repo novo → secrets ainda não configurados em Settings > Secrets and variables > Actions:
- `GCP_PROJECT_ID` = `nuvita-499800` (mesmo projeto do Nuvita original)
- `GCP_WIF_PROVIDER` — pode reaproveitar o provider WIF já existente do Nuvita
  original (mesmo projeto/pool), ou criar um escopo próprio — decidir com quem
  administra o GCP.
- `GCP_SA_EMAIL` — idem: reaproveitar `gh-actions-deployer@nuvita-499800.iam.gserviceaccount.com`
  (já tem `run.admin` no projeto) ou criar uma SA dedicada ao nuvita-psi.
- `CLOUDRUN_ENV_YAML` = conteúdo de `cloudrun.env.yaml` gerado no item 1.
- `VITE_API_URL` = `https://api-psi.nuvita.app.br` (ou a URL do Cloud Run antes
  do domain mapping, para o 1º deploy).

### 3. MongoDB Atlas — acesso de rede
Se reaproveitar o cluster do Nuvita original, o Network Access já deve cobrir
o Cloud Run. Se for cluster novo, libere `0.0.0.0/0` (protegido por usuário/senha
forte) ou configure VPC peering / Private Endpoint.

### 4. Domínio — psi.nuvita.app.br + api-psi.nuvita.app.br (DNS pendente)
Config de código já feita: `VITE_BASE=/`, `apps/web/public/CNAME=psi.nuvita.app.br`,
CORS para `https://psi.nuvita.app.br`, `APP_ROOT_DOMAIN=psi.nuvita.app.br`.

**Falta no DNS (mesmo provedor do domínio `nuvita.app.br`):**
- `psi` → CNAME `ericolimaeducador-ux.github.io.` (frontend no GitHub Pages
  do repo `nuvita-psi`)
- GitHub (repo `nuvita-psi`) → Settings → Pages → Custom domain =
  `psi.nuvita.app.br` (Enforce HTTPS)

**api-psi.nuvita.app.br (após o 1º deploy do serviço `nuvita-psi-api`):**
1. Verificar o domínio no Google (Search Console) — adicionar o TXT que o GCP indicar.
2. `gcloud run domain-mappings create --project nuvita-499800 --service nuvita-psi-api --domain api-psi.nuvita.app.br --region southamerica-east1`
   (se a região não suportar domain mapping, usar um Load Balancer externo global).
3. Adicionar no DNS o registro (CNAME/A) que o comando retornar.

### 5. Primeiro deploy / bootstrap
- Push em `main` do repo `nuvita-psi` dispara CI + deploy (web e API), uma vez
  os secrets do item 2 estiverem configurados.
- Rodar o bootstrap do admin no banco `nuvita-psi` de produção (ver `scripts/`).
- Confirmar `CORS_ORIGIN` cobre `https://psi.nuvita.app.br`.

## 📌 Recomendado (não bloqueia, mas importante)
- Confirmar com quem administra o GCP/DNS do Nuvita original antes de criar
  registros DNS ou reaproveitar a service account de deploy — é infraestrutura
  compartilhada com um sistema em produção.
- Definir limites de recursos do Cloud Run (`--memory`, `--cpu`, `--max-instances`)
  para o serviço `nuvita-psi-api`.
- Monitoramento/alertas (Cloud Run métricas + uptime check no `/health`) separados
  por serviço, para não confundir incidentes do nuvita-psi com os do Nuvita original.
