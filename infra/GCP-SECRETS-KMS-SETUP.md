# 🔐 Google Secret Manager & KMS Setup Guide

## Overview

Nuvita usa um sistema enterprise de gerenciamento de secrets com:
- **Google Secret Manager** para armazenar secrets
- **Google Cloud KMS** para envelope encryption
- **Key Rotation** automática (quarterly)
- **Auditoria completa** de acesso (LGPD/HIPAA)

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│           NestJS Application                    │
│  ┌─────────────────────────────────────────┐   │
│  │  ConfigService (env-aware)              │   │
│  └──────────────────┬──────────────────────┘   │
│                     │                           │
│      ┌──────────────┼──────────────┐            │
│      │              │              │            │
│ DEV  │         PROD/STAGING        │            │
│      │              │              │            │
│   .env file    GCP Secret Manager  │            │
│      │      (with KMS envelope)    │            │
│      │              │              │            │
│      └──────────────┼──────────────┘            │
│                     │                           │
│         ┌───────────▼────────────┐              │
│         │  GoogleSecretsService  │              │
│         │  + KMS Encryption      │              │
│         └────────────────────────┘              │
└─────────────────────────────────────────────────┘
         │
    ┌────▼─────────────────────────┐
    │  Google Cloud KMS            │
    │  Master Key (nuvita-master)  │
    │  ├─ Envelope Encryption      │
    │  ├─ Data Key Wrapping        │
    │  └─ Automatic Rotation       │
    └──────────────────────────────┘
```

---

## Development Setup (Local)

### 1. Create .env.local

```bash
cp .env.example .env.local
```

### 2. Generate Encryption Keys

```bash
# Generate 32-byte key in base64 format
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate 32-byte key in hex format
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Fill .env.local

```bash
# Required
PATIENT_DATA_ENCRYPTION_KEY=<generated-base64-32-bytes>
JWT_ACCESS_SECRET=<generated-hex-32-bytes>
JWT_REFRESH_SECRET=<generated-hex-32-bytes>

# For development
MONGODB_URI=mongodb://localhost:27017/nuvita
REDIS_URL=redis://localhost:6379
```

### 4. Start Application

```bash
npm install
npm run api:dev
```

---

## Production Setup (GCP)

### 1. Prerequisites

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login
gcloud config set project nuvita-499800

# Enable required APIs
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudkms.googleapis.com
gcloud services enable logging.googleapis.com

# Grant permissions to service account
gcloud projects add-iam-policy-binding nuvita-499800 \
  --member=serviceAccount:SERVICE_ACCOUNT@nuvita-499800.iam.gserviceaccount.com \
  --role=roles/secretmanager.admin

gcloud projects add-iam-policy-binding nuvita-499800 \
  --member=serviceAccount:SERVICE_ACCOUNT@nuvita-499800.iam.gserviceaccount.com \
  --role=roles/cloudkms.admin
```

### 2. Initialize Secrets in GCP

```bash
# Interactive setup
npm run gcp:init-secrets -- --env production

# Or: Automated setup (read from .env)
NODE_ENV=production npm run gcp:init-secrets -- --env production
```

This will:
1. Create KMS key ring `nuvita-keyring`
2. Create KMS crypto key `nuvita-master-key`
3. Create all required secrets in Secret Manager
4. Set proper labels and metadata

### 3. Verify Secrets Created

```bash
# List all secrets
gcloud secrets list --filter="labels.service=nuvita-api"

# View secret metadata
gcloud secrets describe patient-data-encryption-key

# View secret value (latest version)
gcloud secrets versions access latest --secret=patient-data-encryption-key
```

### 4. Update Environment Variables

In production, set:

```env
NODE_ENV=production
SECRETS_BACKEND=gcp-secret-manager
GCP_PROJECT_ID=nuvita-499800
KMS_KEY_RING=nuvita-keyring
KMS_KEY=nuvita-master-key
```

---

## Key Rotation (Quarterly)

### Automated Rotation

Deploy rotation worker as Cloud Scheduler job:

```bash
# Run manually
npm run gcp:rotate-secrets

# Check rotation status
gcloud secrets list --filter="labels.service=nuvita-api" --format=json | jq '.[] | {name, updated_time: .updated}'
```

### Rotation Policy

| Secret | Interval | Manual | Reason |
|--------|----------|--------|--------|
| `jwt-access-secret` | 90 days | No | Automatic rotation |
| `jwt-refresh-secret` | 90 days | No | Automatic rotation |
| `bootstrap-secret` | 90 days | Yes | Critical - requires review |
| `patient-data-*` | 365 days | Yes | Annual - requires planning |
| `document-storage-*` | 180 days | Yes | Semi-annual - provider coordination |

### Manual Rotation

```bash
# Generate new value
NEW_VALUE=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# Create new version
gcloud secrets versions add patient-data-encryption-key --data-file=-  <<< "$NEW_VALUE"

# View version history
gcloud secrets versions list patient-data-encryption-key
```

---

## KMS Envelope Encryption

### How It Works

1. **Data Encryption Key (DEK)**: Random 32-byte key, generated per encryption
2. **Key Encryption Key (KEK)**: Master key stored in KMS
3. **Envelope**: Encrypted DEK is stored alongside ciphertext

```
Plaintext (e.g., patient name)
       ▼
    AES-256-GCM encryption with DEK
       ▼
Ciphertext + IV + Auth Tag
       ▼
Wrap DEK with KMS master key
       ▼
Store: {ciphertext, encrypted_dek}
```

### Usage in Code

```typescript
// Encrypt
const { ciphertext, dataKeyEncrypted } = 
  await googleSecrets.encryptWithKMS('sensitive data');

// Store
await db.pacientes.updateOne({
  _id: patientId,
  nome_encrypted: ciphertext,
  nome_dek: dataKeyEncrypted,
});

// Decrypt
const encryptedData = {
  ciphertext,
  dataKeyEncrypted,
};
const plaintext = await googleSecrets.decryptWithKMS(encryptedData);
```

---

## Monitoring & Auditing

### View Access Logs

```bash
# All Secret Manager access
gcloud logging read "resource.type=secretmanager.googleapis.com" \
  --limit=50 \
  --format=json

# Filter by operation
gcloud logging read "resource.type=secretmanager.googleapis.com AND protoPayload.methodName=google.cloud.secretmanager.v1.SecretManagerService.AccessSecretVersion" \
  --limit=50
```

### View KMS Logs

```bash
# KMS encryption operations
gcloud logging read "resource.type=cloudkms.googleapis.com" \
  --limit=50
```

### Set Up Alerts

```bash
# Alert on secret access
gcloud alpha monitoring policies create \
  --display-name="Secret Manager Access" \
  --condition-display-name="High access rate" \
  --notification-channels=CHANNEL_ID
```

---

## Troubleshooting

### Permission Errors

```bash
# Check service account permissions
gcloud projects get-iam-policy nuvita-499800 \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:*"

# Grant Secret Manager Admin role
gcloud projects add-iam-policy-binding nuvita-499800 \
  --member=serviceAccount:SERVICE_ACCOUNT@nuvita-499800.iam.gserviceaccount.com \
  --role=roles/secretmanager.admin
```

### Secret Not Found

```bash
# List all secrets
gcloud secrets list

# Check if created
gcloud secrets describe patient-data-encryption-key

# Recreate if needed
npm run gcp:init-secrets -- --env production
```

### KMS Key Ring Not Found

```bash
# List key rings
gcloud kms keyrings list --location global

# Create if missing
gcloud kms keyrings create nuvita-keyring --location global

# Create key
gcloud kms keys create nuvita-master-key \
  --location global \
  --keyring nuvita-keyring \
  --purpose encryption
```

---

## Security Best Practices

### ✅ DO

- ✅ Use GCP Secret Manager in production
- ✅ Rotate secrets quarterly (HIPAA requirement)
- ✅ Use KMS HSM for sensitive keys
- ✅ Enable audit logging for all access
- ✅ Use service accounts with minimal permissions
- ✅ Store .env.local in .gitignore
- ✅ Use separate KMS keys per environment
- ✅ Monitor access logs regularly

### ❌ DON'T

- ❌ Commit secrets to git (use .env.local)
- ❌ Use same secrets in dev/staging/prod
- ❌ Rotate secrets manually without planning
- ❌ Share KMS keys between services
- ❌ Log secret values (sanitize logs)
- ❌ Use default passwords in production
- ❌ Store backups with production keys
- ❌ Disable audit logging

---

## LGPD/HIPAA Compliance

### Encryption at Rest
✅ Patient data encrypted with AES-256-GCM + KMS
✅ Database encryption enabled (MongoDB Atlas)
✅ Storage encryption enabled (S3/R2)

### Key Management
✅ Keys rotated quarterly (HIPAA)
✅ HSM protected master key (production)
✅ Audit trail of all key access
✅ Separation of duties (key holders ≠ users)

### Audit & Accountability
✅ All access logged to Cloud Logging
✅ PII never logged (sanitized)
✅ Deletion tracking with soft deletes
✅ Right to erasure support

### Data Protection
✅ TLS 1.3 for transit
✅ VPC endpoints for GCP services
✅ Network policies for API access
✅ Rate limiting on sensitive endpoints

---

## References

- [GCP Secret Manager Docs](https://cloud.google.com/secret-manager/docs)
- [GCP Cloud KMS Docs](https://cloud.google.com/kms/docs)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/)
- [LGPD (Lei 13.709/2018)](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709.htm)
- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)

---

**Last Updated**: 2026-06-17  
**Author**: Philips Medical - Healthcare Security Team  
**Status**: Production Ready ✅
