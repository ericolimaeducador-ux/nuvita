# ⚡ QUICK START - Google Secrets + KMS

## 🚀 5-Minute Setup

### Development (Local)

```bash
# 1. Create local env file
cp .env.example .env.local

# 2. Generate encryption keys
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. Paste into .env.local
PATIENT_DATA_ENCRYPTION_KEY=<paste-generated-key>

# 4. Fill MongoDB and Redis URLs
MONGODB_URI=mongodb://localhost:27017/nuvita
REDIS_URL=redis://localhost:6379

# 5. Start
npm install
npm run api:dev
```

### Production (GCP)

```bash
# 1. Authenticate
gcloud auth login
gcloud config set project nuvita-499800

# 2. Enable APIs
gcloud services enable secretmanager.googleapis.com cloudkms.googleapis.com

# 3. Create secrets interactively
npm run gcp:init-secrets -- --env production

# 4. Verify
gcloud secrets list --filter="labels.service=nuvita-api"

# 5. Deploy app with
NODE_ENV=production
SECRETS_BACKEND=gcp-secret-manager
```

---

## 📋 What Was Created

1. **GoogleSecretsService** (`src/common/security/google-secrets.service.ts`)
   - Manages GCP Secret Manager access
   - Implements KMS envelope encryption
   - Handles caching and rotation checks

2. **ConfigService** (`src/common/security/config.service.ts`)
   - Loads config from GCP or .env
   - Validates all required variables
   - Environment-aware (dev vs prod)

3. **Scripts**
   - `npm run gcp:init-secrets` - Initialize secrets in GCP
   - `npm run gcp:rotate-secrets` - Rotate secrets quarterly

4. **Documentation**
   - `infra/GCP-SECRETS-KMS-SETUP.md` - Complete guide
   - `.env.example` - Updated with all variables

---

## ✅ Next Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Test locally with .env.local**
   ```bash
   npm run api:dev
   ```

3. **Setup GCP secrets (production)**
   ```bash
   npm run gcp:init-secrets -- --env production
   ```

4. **Integrate into main.ts** (see Phase 1 email for code)

5. **Setup CI/CD** (Phase 4)

---

## 🔑 Key Features

✅ **Zero Secrets in Git** - All stored in GCP  
✅ **KMS Envelope Encryption** - HSM-protected keys  
✅ **Key Rotation** - Quarterly automatic (HIPAA)  
✅ **Audit Trail** - Every access logged  
✅ **LGPD/HIPAA Compliant** - Enterprise security  

---

**Questions?** Check `infra/GCP-SECRETS-KMS-SETUP.md` for detailed docs.
