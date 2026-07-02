/**
 * Environment Configuration Service
 * 
 * Loads and validates configuration from:
 * 1. Google Secret Manager (production)
 * 2. .env file (development)
 * 3. Environment variables (override)
 * 
 * @author Philips Medical - Enterprise Security
 */

import { Injectable, Logger } from '@nestjs/common';
import { GoogleSecretsService } from './google-secrets.service';

export type ConfigSource = 'gcp' | 'env';

/**
 * Decide de onde os segredos são carregados, de forma INDEPENDENTE da postura de
 * segurança (NODE_ENV). Isso permite rodar com NODE_ENV=production (Swagger
 * fechado, CSP ligado, logs sane) e ainda injetar segredos por variáveis de
 * ambiente — útil quando o GCP Secret Manager ainda não está provisionado.
 *
 * - CONFIG_SOURCE=gcp|env força explicitamente.
 * - Sem a flag: production/staging => gcp; caso contrário => env.
 */
export function resolveConfigSource(): ConfigSource {
  const explicit = (process.env.CONFIG_SOURCE || '').toLowerCase();
  if (explicit === 'gcp' || explicit === 'env') return explicit;
  const nodeEnv = process.env.NODE_ENV || 'development';
  return nodeEnv === 'production' || nodeEnv === 'staging' ? 'gcp' : 'env';
}

function resolveAllowPublicRegistration(nodeEnv: string): boolean {
  const explicit = process.env.ALLOW_PUBLIC_REGISTRATION;
  if (explicit !== undefined) return explicit === 'true';
  return nodeEnv !== 'production';
}

export interface AppConfig {
  // Server
  port: number;
  nodeEnv: 'development' | 'staging' | 'production';
  corsOrigin: string[];

  // Database
  mongodbUri: string;
  redisUrl: string;

  // JWT & Authentication
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  bcryptRounds: number;

  // Patient Data Encryption (LGPD/HIPAA)
  patientDataEncryptionKey: string;
  patientDataHashKey?: string;

  // Document Storage (S3/R2)
  documentStorageBucket: string;
  documentStorageRegion: string;
  documentStorageEndpoint: string;
  documentStorageForcePathStyle: boolean;
  documentStorageAccessKeyId: string;
  documentStorageSecretAccessKey: string;

  // Email
  emailProvider: 'resend' | 'sendgrid';
  emailFrom: string;
  resendApiKey?: string;
  sendgridApiKey?: string;

  // WhatsApp
  whatsappProvider?: 'evolution' | 'zapi';
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstance?: string;
  zapiInstanceId?: string;
  zapiToken?: string;
  zapiClientToken?: string;

  // SMS
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFrom?: string;

  // Multi-tenancy
  appRootDomain: string;
  bootstrapSecret: string;
  totpIssuer: string;

  // Auth
  // Registro público (/auth/register) cria contas PACIENTE sem vínculo com
  // clínica. Fora de produção fica liberado (seeds/dev); em produção só com
  // ALLOW_PUBLIC_REGISTRATION=true explícito.
  allowPublicRegistration: boolean;

  // Prontuário
  prontuarioSignatureSecret: string;

  // GCP
  gcpProjectId: string;
  kmsKeyRing: string;
  kmsKey: string;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);
  private config: AppConfig | null = null;

  constructor(private googleSecrets: GoogleSecretsService) {}

  /**
   * Initialize configuration
   * Load secrets from GCP or .env depending on environment
   */
  async initialize(): Promise<AppConfig> {
    this.logger.log('Initializing configuration...');

    const source = resolveConfigSource();
    this.logger.log(`Config source: ${source} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);

    if (source === 'gcp') {
      return this.loadFromGCP();
    } else {
      return this.loadFromEnv();
    }
  }

  /**
   * Load configuration from Google Secret Manager (Production)
   */
  private async loadFromGCP(): Promise<AppConfig> {
    this.logger.log('Loading configuration from Google Secret Manager...');

    try {
      const [
        mongodbUri,
        redisUrl,
        jwtAccessSecret,
        jwtRefreshSecret,
        patientDataEncryptionKey,
        patientDataHashKey,
        documentStorageBucket,
        documentStorageRegion,
        documentStorageEndpoint,
        documentStorageAccessKeyId,
        documentStorageSecretAccessKey,
        emailProvider,
        emailFrom,
        resendApiKey,
        sendgridApiKey,
        whatsappProvider,
        evolutionApiUrl,
        evolutionApiKey,
        evolutionInstance,
        zapiInstanceId,
        zapiToken,
        zapiClientToken,
        totpIssuer,
        appRootDomain,
        bootstrapSecret,
        prontuarioSignatureSecret,
      ] = await Promise.all([
        this.getSecretOrThrow('mongodb-uri'),
        this.getSecretOrThrow('redis-url'),
        this.getSecretOrThrow('jwt-access-secret'),
        this.getSecretOrThrow('jwt-refresh-secret'),
        this.getSecretOrThrow('patient-data-encryption-key'),
        this.getSecretOrDefault('patient-data-hash-key', undefined),
        this.getSecretOrThrow('document-storage-bucket'),
        this.getSecretOrThrow('document-storage-region'),
        this.getSecretOrThrow('document-storage-endpoint'),
        this.getSecretOrThrow('document-storage-access-key-id'),
        this.getSecretOrThrow('document-storage-secret-access-key'),
        this.getSecretOrDefault('email-provider', 'resend'),
        this.getSecretOrThrow('email-from'),
        this.getSecretOrDefault('resend-api-key', undefined),
        this.getSecretOrDefault('sendgrid-api-key', undefined),
        this.getSecretOrDefault('whatsapp-provider', undefined),
        this.getSecretOrDefault('evolution-api-url', undefined),
        this.getSecretOrDefault('evolution-api-key', undefined),
        this.getSecretOrDefault('evolution-instance', undefined),
        this.getSecretOrDefault('zapi-instance-id', undefined),
        this.getSecretOrDefault('zapi-token', undefined),
        this.getSecretOrDefault('zapi-client-token', undefined),
        this.getSecretOrDefault('totp-issuer', 'Nuvita'),
        this.getSecretOrThrow('app-root-domain'),
        this.getSecretOrThrow('bootstrap-secret'),
        this.getSecretOrThrow('prontuario-signature-secret'),
      ]);

      const config: AppConfig = {
        port: parseInt(process.env.PORT || '3000', 10),
        nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'production',
        corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
        mongodbUri,
        redisUrl,
        jwtAccessSecret,
        jwtRefreshSecret,
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
        patientDataEncryptionKey,
        patientDataHashKey,
        documentStorageBucket,
        documentStorageRegion,
        documentStorageEndpoint,
        documentStorageForcePathStyle: true,
        documentStorageAccessKeyId,
        documentStorageSecretAccessKey,
        emailProvider: (emailProvider as 'resend' | 'sendgrid') || 'resend',
        emailFrom,
        resendApiKey,
        sendgridApiKey,
        whatsappProvider: (whatsappProvider as 'evolution' | 'zapi' | undefined),
        evolutionApiUrl,
        evolutionApiKey,
        evolutionInstance,
        zapiInstanceId,
        zapiToken,
        zapiClientToken,
        totpIssuer: totpIssuer ?? 'Nuvita',
        appRootDomain,
        bootstrapSecret,
        prontuarioSignatureSecret,
        allowPublicRegistration: resolveAllowPublicRegistration(
          (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'production',
        ),
        gcpProjectId: process.env.GCP_PROJECT_ID!,
        kmsKeyRing: process.env.KMS_KEY_RING || 'nuvita-keyring',
        kmsKey: process.env.KMS_KEY || 'nuvita-master-key',
        logLevel: (process.env.LOG_LEVEL as AppConfig['logLevel']) || 'info',
      };

      this.config = config;
      this.logger.log('✓ Configuration loaded from Google Secret Manager');
      return config;
    } catch (error) {
      this.logger.error('Failed to load configuration from GCP:', error);
      throw error;
    }
  }

  /**
   * Load configuration from .env file (Development)
   */
  private loadFromEnv(): AppConfig {
    this.logger.log('Loading configuration from environment variables...');

    const requiredVars = [
      'MONGODB_URI',
      'REDIS_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'PATIENT_DATA_ENCRYPTION_KEY',
      'DOCUMENT_STORAGE_BUCKET',
      'DOCUMENT_STORAGE_REGION',
      'DOCUMENT_STORAGE_ENDPOINT',
      'DOCUMENT_STORAGE_ACCESS_KEY_ID',
      'DOCUMENT_STORAGE_SECRET_ACCESS_KEY',
      'EMAIL_FROM',
      'APP_ROOT_DOMAIN',
      'BOOTSTRAP_SECRET',
      'PRONTUARIO_SIGNATURE_SECRET',
    ];

    const missing = requiredVars.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        `Please copy .env.example to .env and fill in the values.`,
      );
    }

    const config: AppConfig = {
      port: parseInt(process.env.PORT || '3000', 10),
      nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
      corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
      mongodbUri: process.env.MONGODB_URI!,
      redisUrl: process.env.REDIS_URL!,
      jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
      patientDataEncryptionKey: process.env.PATIENT_DATA_ENCRYPTION_KEY!,
      patientDataHashKey: process.env.PATIENT_DATA_HASH_KEY,
      documentStorageBucket: process.env.DOCUMENT_STORAGE_BUCKET!,
      documentStorageRegion: process.env.DOCUMENT_STORAGE_REGION!,
      documentStorageEndpoint: process.env.DOCUMENT_STORAGE_ENDPOINT!,
      documentStorageForcePathStyle: process.env.DOCUMENT_STORAGE_FORCE_PATH_STYLE === 'true',
      documentStorageAccessKeyId: process.env.DOCUMENT_STORAGE_ACCESS_KEY_ID!,
      documentStorageSecretAccessKey: process.env.DOCUMENT_STORAGE_SECRET_ACCESS_KEY!,
      emailProvider: (process.env.EMAIL_PROVIDER || 'resend') as 'resend' | 'sendgrid',
      emailFrom: process.env.EMAIL_FROM!,
      resendApiKey: process.env.RESEND_API_KEY,
      sendgridApiKey: process.env.SENDGRID_API_KEY,
      whatsappProvider: (process.env.WHATSAPP_PROVIDER || undefined) as 'evolution' | 'zapi' | undefined,
      evolutionApiUrl: process.env.EVOLUTION_API_URL,
      evolutionApiKey: process.env.EVOLUTION_API_KEY,
      evolutionInstance: process.env.EVOLUTION_INSTANCE,
      zapiInstanceId: process.env.ZAPI_INSTANCE_ID,
      zapiToken: process.env.ZAPI_TOKEN,
      zapiClientToken: process.env.ZAPI_CLIENT_TOKEN,
      totpIssuer: process.env.TOTP_ISSUER || 'Nuvita',
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioFrom: process.env.TWILIO_FROM,
      appRootDomain: process.env.APP_ROOT_DOMAIN!,
      bootstrapSecret: process.env.BOOTSTRAP_SECRET!,
      prontuarioSignatureSecret: process.env.PRONTUARIO_SIGNATURE_SECRET!,
      allowPublicRegistration: resolveAllowPublicRegistration(
        (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
      ),
      gcpProjectId: process.env.GCP_PROJECT_ID || 'nuvita-499800',
      kmsKeyRing: process.env.KMS_KEY_RING || 'nuvita-keyring',
      kmsKey: process.env.KMS_KEY || 'nuvita-master-key',
      logLevel: (process.env.LOG_LEVEL as AppConfig['logLevel']) || 'debug',
    };

    this.config = config;
    this.logger.log('✓ Configuration loaded from environment variables');
    return config;
  }

  /**
   * Get configuration object
   */
  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
    return this.config;
  }

  /**
   * Helper: Get secret from GCP or throw error
   */
  private async getSecretOrThrow(secretName: string): Promise<string> {
    const value = await this.googleSecrets.getSecret(secretName);
    if (!value) {
      throw new Error(`Secret not found: ${secretName}`);
    }
    return value;
  }

  /**
   * Helper: Get secret from GCP or return default
   */
  private async getSecretOrDefault(secretName: string, defaultValue?: string): Promise<string | undefined> {
    try {
      return await this.googleSecrets.getSecret(secretName);
    } catch {
      return defaultValue;
    }
  }
}
