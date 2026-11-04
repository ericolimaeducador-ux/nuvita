import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function generateBase64Key(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64');
}

function generateHexKey(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateUrlSafeSecret(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

console.log('🔒 Gerando segredos criptográficos exclusivos de produção para o Nuvita Psi...\n');

const secrets = {
  // Autenticação e Sessões
  JWT_ACCESS_SECRET: generateUrlSafeSecret(48),
  JWT_REFRESH_SECRET: generateUrlSafeSecret(48),
  
  // Criptografia LGPD em repouso (AES-256)
  PATIENT_DATA_ENCRYPTION_KEY: generateBase64Key(32),
  PATIENT_DATA_HASH_KEY: generateHexKey(32),
  
  // Assinatura Digital Imutável de Prontuários (CFP 006/2019)
  PRONTUARIO_SIGNATURE_SECRET: generateUrlSafeSecret(48),
  
  // Bootstrap do SuperAdmin inicial
  BOOTSTRAP_SECRET: generateUrlSafeSecret(32),
  
  // Credenciais internas seguras do Banco e Fila
  MONGO_ROOT_PASSWORD: generateUrlSafeSecret(24),
  MONGO_APP_PASSWORD: generateUrlSafeSecret(24),
  REDIS_PASSWORD: generateUrlSafeSecret(24),
};

const productionEnvTemplate = `# ==============================================================================
# NUVITA PSI — CONFIGURAÇÃO DE PRODUÇÃO (CONTABO + COOLIFY)
# Gerado automaticamente em: ${new Date().toISOString()}
# ==============================================================================

NODE_ENV=production
PORT=3000
APP_NAME=Nuvita Psi

# Domínios e CORS
APP_ROOT_DOMAIN=psi.nuvita.app.br
CORS_ORIGIN=https://psi.nuvita.app.br
VITE_API_URL=https://api-psi.nuvita.app.br

# Banco de Dados MongoDB Local no Coolify
MONGODB_URI=mongodb://nuvita_app:${secrets.MONGO_APP_PASSWORD}@mongodb:27017/nuvita-psi?authSource=nuvita-psi

# Fila Redis Local no Coolify
REDIS_URL=redis://:${secrets.REDIS_PASSWORD}@redis:6379

# Segurança & Sessão (JWT)
JWT_ACCESS_SECRET=${secrets.JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Criptografia LGPD de Dados dos Pacientes (AES-256)
PATIENT_DATA_ENCRYPTION_KEY=${secrets.PATIENT_DATA_ENCRYPTION_KEY}
PATIENT_DATA_HASH_KEY=${secrets.PATIENT_DATA_HASH_KEY}

# Assinatura Digital de Prontuários (Imutabilidade CFP)
PRONTUARIO_SIGNATURE_SECRET=${secrets.PRONTUARIO_SIGNATURE_SECRET}

# Autorização do Bootstrap Inicial
BOOTSTRAP_SECRET=${secrets.BOOTSTRAP_SECRET}
ALLOW_PUBLIC_REGISTRATION=false

# Limite de Taxa (Rate Limiting)
THROTTLE_TTL=60
THROTTLE_LIMIT=120

# Provedor de Notificações (Preencher com as credenciais do seu provedor)
RESEND_API_KEY=
RESEND_FROM=Nuvita Psi <nao-responder@psi.nuvita.app.br>
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=nuvita-psi
`;

const outputPath = path.join(rootDir, '.env.production.example');
fs.writeFileSync(outputPath, productionEnvTemplate, 'utf-8');

console.log(`✅ Arquivo de configuração de produção gerado com sucesso em: ${outputPath}`);
console.log('\nChaves críticas geradas:');
console.log(`- JWT_ACCESS_SECRET: [${secrets.JWT_ACCESS_SECRET.substring(0, 8)}...]`);
console.log(`- PATIENT_DATA_ENCRYPTION_KEY: [${secrets.PATIENT_DATA_ENCRYPTION_KEY.substring(0, 8)}...] (AES-256)`);
console.log(`- PRONTUARIO_SIGNATURE_SECRET: [${secrets.PRONTUARIO_SIGNATURE_SECRET.substring(0, 8)}...]`);
console.log(`- BOOTSTRAP_SECRET: [${secrets.BOOTSTRAP_SECRET.substring(0, 8)}...]`);
