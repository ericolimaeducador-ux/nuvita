import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { abortarSeChaveReaproveitada, CHAVES_REAPROVEITADAS } from './lib/segredos-reaproveitados.mjs';

// R1: nenhum argumento pode pedir para gerar as chaves reaproveitadas (ex.: --incluir=PATIENT_DATA_HASH_KEY).
try {
  abortarSeChaveReaproveitada(process.argv.slice(2), 'gen-production-secrets');
} catch (erro) {
  console.error(`⛔ ${erro.message}`);
  process.exit(1);
}

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
  
  // R1: PATIENT_DATA_ENCRYPTION_KEY, PATIENT_DATA_HASH_KEY e PRONTUARIO_SIGNATURE_SECRET NÃO são geradas aqui —
  // são reaproveitadas do serviço real do Nuvita (ver scripts/lib/segredos-reaproveitados.mjs).
  
  
  // Bootstrap do SuperAdmin inicial
  BOOTSTRAP_SECRET: generateUrlSafeSecret(32),
  
  // Credenciais internas seguras do Banco e Fila
  MONGO_ROOT_PASSWORD: generateUrlSafeSecret(24),
  MONGO_APP_PASSWORD: generateUrlSafeSecret(24),
  REDIS_PASSWORD: generateUrlSafeSecret(24),
};

// R1: trava também a própria lista (se alguém voltar a incluir uma das chaves reaproveitadas, o script aborta).
abortarSeChaveReaproveitada(Object.keys(secrets), 'gen-production-secrets (lista de segredos)');

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

# Criptografia de dados de paciente e selo de integridade: REAPROVEITADOS do serviço real do Nuvita.
# COPIE os valores ATUAIS do Secret Manager — nunca gere nem rotacione (senão os dados reais ficam indecifráveis).
PATIENT_DATA_ENCRYPTION_KEY=
PATIENT_DATA_HASH_KEY=
PRONTUARIO_SIGNATURE_SECRET=


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
console.log(`- ${Object.keys(CHAVES_REAPROVEITADAS).join(', ')}: NÃO geradas — copiar do serviço real do Nuvita.`);
console.log(`- BOOTSTRAP_SECRET: [${secrets.BOOTSTRAP_SECRET.substring(0, 8)}...]`);
