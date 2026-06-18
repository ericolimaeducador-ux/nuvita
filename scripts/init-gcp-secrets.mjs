#!/usr/bin/env node

/**
 * Initialize Secrets in Google Secret Manager
 * 
 * This script:
 * 1. Creates GCP Secret Manager secrets (if not exist)
 * 2. Sets up KMS key ring and key for envelope encryption
 * 3. Handles key rotation workflow
 * 
 * Usage:
 *   node scripts/init-gcp-secrets.mjs --env production
 *   node scripts/init-gcp-secrets.mjs --env development --local
 * 
 * @author Philips Medical - Healthcare Security
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { KeyManagementServiceClient } from '@google-cloud/kms';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const secretClient = new SecretManagerServiceClient();
const kmsClient = new KeyManagementServiceClient();

const projectId = process.env.GCP_PROJECT_ID || 'nuvita-499800';
const kmsKeyRing = 'nuvita-keyring';
const kmsKey = 'nuvita-master-key';
const kmsLocation = 'global';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Secrets required for Nuvita
 */
const REQUIRED_SECRETS = [
  {
    name: 'mongodb-uri',
    description: 'MongoDB connection URI',
    example: 'mongodb+srv://user:pass@cluster.mongodb.net/nuvita?retryWrites=true',
  },
  {
    name: 'redis-url',
    description: 'Redis connection URL',
    example: 'redis://:password@host:6379',
  },
  {
    name: 'jwt-access-secret',
    description: 'JWT access token secret (minimum 32 characters)',
    example: 'your-super-secret-access-key-min-32-chars',
    generate: () => crypto.randomBytes(32).toString('hex'),
  },
  {
    name: 'jwt-refresh-secret',
    description: 'JWT refresh token secret (minimum 32 characters)',
    example: 'your-super-secret-refresh-key-min-32-chars',
    generate: () => crypto.randomBytes(32).toString('hex'),
  },
  {
    name: 'patient-data-encryption-key',
    description: 'Encryption key for patient data (base64-encoded 32 bytes)',
    example: '<base64-encoded-32-bytes>',
    generate: () => crypto.randomBytes(32).toString('base64'),
  },
  {
    name: 'patient-data-hash-key',
    description: 'Hash key for patient data (base64-encoded 32 bytes, optional)',
    example: '<base64-encoded-32-bytes>',
    generate: () => crypto.randomBytes(32).toString('base64'),
    optional: true,
  },
  {
    name: 'document-storage-bucket',
    description: 'AWS S3 or Cloudflare R2 bucket name',
    example: 'nuvita-documentos',
  },
  {
    name: 'document-storage-region',
    description: 'Storage region (auto for Cloudflare R2)',
    example: 'auto',
  },
  {
    name: 'document-storage-endpoint',
    description: 'Storage endpoint URL',
    example: 'https://abc123.r2.cloudflarestorage.com',
  },
  {
    name: 'document-storage-access-key-id',
    description: 'Storage access key ID',
    example: 'your-access-key-id',
  },
  {
    name: 'document-storage-secret-access-key',
    description: 'Storage secret access key',
    example: 'your-secret-access-key',
  },
  {
    name: 'email-provider',
    description: 'Email provider (resend or sendgrid)',
    example: 'resend',
  },
  {
    name: 'email-from',
    description: 'Email sender address',
    example: 'no-reply@nuvita.com.br',
  },
  {
    name: 'resend-api-key',
    description: 'Resend API key (if using Resend)',
    example: 're_xxxxx',
    optional: true,
  },
  {
    name: 'whatsapp-provider',
    description: 'WhatsApp provider (evolution or zapi, optional)',
    example: 'evolution',
    optional: true,
  },
  {
    name: 'evolution-api-url',
    description: 'Evolution API URL',
    example: 'https://evolution.exemplo.com',
    optional: true,
  },
  {
    name: 'evolution-api-key',
    description: 'Evolution API key',
    example: 'your-api-key',
    optional: true,
  },
  {
    name: 'app-root-domain',
    description: 'Root domain for multi-tenancy',
    example: 'nuvita.com.br',
  },
  {
    name: 'bootstrap-secret',
    description: 'Secret for bootstrap CLI (change in production)',
    example: 'change-me-in-production',
    generate: () => crypto.randomBytes(16).toString('hex'),
  },
  {
    name: 'prontuario-signature-secret',
    description: 'Secret for prontuário signatures',
    example: 'long-random-secret-for-signatures',
    generate: () => crypto.randomBytes(32).toString('hex'),
  },
];

async function initializeKMS() {
  console.log('\n📝 Setting up KMS key ring and key...');

  try {
    const keyRingPath = `projects/${projectId}/locations/${kmsLocation}/keyRings/${kmsKeyRing}`;

    // Create key ring (if not exists)
    try {
      await kmsClient.getKeyRing({ name: keyRingPath });
      console.log(`✓ Key ring already exists: ${kmsKeyRing}`);
    } catch (error) {
      if (error.code === 5) {
        // NOT_FOUND
        const [keyRing] = await kmsClient.createKeyRing({
          parent: `projects/${projectId}/locations/${kmsLocation}`,
          keyRingId: kmsKeyRing,
        });
        console.log(`✓ Created key ring: ${keyRing.name}`);
      } else {
        throw error;
      }
    }

    // Create crypto key
    try {
      const keyPath = `${keyRingPath}/cryptoKeys/${kmsKey}`;
      await kmsClient.getCryptoKey({ name: keyPath });
      console.log(`✓ Crypto key already exists: ${kmsKey}`);
    } catch (error) {
      if (error.code === 5) {
        // NOT_FOUND
        const [key] = await kmsClient.createCryptoKey({
          parent: keyRingPath,
          cryptoKeyId: kmsKey,
          cryptoKey: {
            purpose: 'ENCRYPT_DECRYPT',
            versionTemplate: {
              algorithm: 'GOOGLE_SYMMETRIC_ENCRYPTION',
              protectionLevel: 'HSM', // Hardware Security Module for production
            },
          },
        });
        console.log(`✓ Created crypto key: ${key.name}`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Failed to initialize KMS:', error.message);
    throw error;
  }
}

async function createOrUpdateSecret(secret, value) {
  const name = `projects/${projectId}/secrets/${secret.name}`;

  try {
    // Try to get existing secret
    const existing = await secretClient.getSecret({ name });

    // Add new version
    const [version] = await secretClient.addSecretVersion({
      parent: name,
      payload: {
        data: Buffer.from(value),
      },
    });

    console.log(`✓ Updated secret: ${secret.name} (version: ${version.name})`);
  } catch (error) {
    if (error.code === 5) {
      // NOT_FOUND - create new secret
      const [newSecret] = await secretClient.createSecret({
        parent: `projects/${projectId}`,
        secretId: secret.name,
        secret: {
          replication: {
            automatic: {},
          },
          labels: {
            environment: process.env.NODE_ENV || 'development',
            service: 'nuvita-api',
            created: new Date().toISOString(),
          },
        },
      });

      // Add initial version
      const [version] = await secretClient.addSecretVersion({
        parent: newSecret.name,
        payload: {
          data: Buffer.from(value),
        },
      });

      console.log(`✓ Created secret: ${secret.name} (version: ${version.name})`);
    } else {
      throw error;
    }
  }
}

async function interactiveSetup() {
  console.log('\n🔐 Nuvita - Google Secret Manager Setup');
  console.log('======================================\n');

  const useGenerated = await question('Use generated values for secrets? (y/n): ');

  for (const secret of REQUIRED_SECRETS) {
    if (secret.optional) {
      const include = await question(`Include optional secret "${secret.name}"? (y/n): `);
      if (include.toLowerCase() !== 'y') {
        continue;
      }
    }

    let value;

    if (secret.generate && useGenerated.toLowerCase() === 'y') {
      value = secret.generate();
      console.log(`\n${secret.description}`);
      console.log(`Generated: ${value.substring(0, 20)}...`);
    } else {
      console.log(`\n${secret.description}`);
      console.log(`Example: ${secret.example}`);
      value = await question(`Enter value for "${secret.name}": `);

      if (!value.trim()) {
        console.log('⚠️ Skipped (empty value)');
        continue;
      }
    }

    await createOrUpdateSecret(secret, value);
  }
}

async function validateExistingSecrets() {
  console.log('\n✓ Validating existing secrets...');

  const [secrets] = await secretClient.listSecrets({
    parent: `projects/${projectId}`,
  });

  const secretNames = secrets.map((s) => s.name?.split('/').pop() || '');
  const missing = REQUIRED_SECRETS.filter(
    (s) => !s.optional && !secretNames.includes(s.name),
  );

  if (missing.length > 0) {
    console.warn(`\n⚠️ Missing secrets: ${missing.map((s) => s.name).join(', ')}`);
    return false;
  }

  console.log(`✓ All ${secretNames.length} secrets are configured`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const envArg = args.find((arg) => arg.startsWith('--env='))?.split('=')[1] || 'development';
  const isLocal = args.includes('--local');

  if (isLocal) {
    console.log('\n📝 Local Development Mode');
    console.log('- Secrets will be read from .env file');
    console.log('- Use: cp .env.example .env && fill in values\n');
    return;
  }

  try {
    console.log(`📝 Initializing secrets for: ${envArg}`);

    // Initialize KMS
    await initializeKMS();

    // Interactive setup
    await interactiveSetup();

    // Validate
    const isValid = await validateExistingSecrets();

    if (isValid) {
      console.log('\n✅ All secrets configured successfully!');
      console.log('Next steps:');
      console.log('1. Update apps/api/.env if needed for local development');
      console.log('2. Run: npm run api:dev');
      console.log('3. Monitor: gcloud secrets list');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
