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
import { validarForcaDosSegredos } from './config-validation';
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
  patientDataHashKey: string;

  // AI usage audit trail — encryption of stored AI input/output.
  // Own secret domain, never PATIENT_DATA_ENCRYPTION_KEY. Presence is required
  // in every environment (enforced by the loader); the 32-byte format is
  // checked by IaUsoCryptoService. Optional here only so the typed config
  // fixtures keep compiling.
  iaUsoEncryptionKey?: string;

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

  // Consultation Reminder Scheduler (feature-consultation-reminder-scheduler)
  // — guard OIDC de POST /internal/processar-lembretes. Presença é obrigatória
  // em todo ambiente (enforced pelo loader, ver requiredVars/getSecretOrThrow);
  // opcional aqui só para os fixtures tipados de config-validation.spec.ts
  // continuarem compilando (mesmo padrão de iaUsoEncryptionKey acima).
  reminderSchedulerExpectedAudience?: string;
  reminderSchedulerExpectedServiceAccount?: string;

  // IA clínica (sugestão de abordagem + prescrição de exercícios)
  anthropicApiKey?: string;
  anthropicModel: string;

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

    const config = source === 'gcp' ? await this.loadFromGCP() : this.loadFromEnv();

    this.validate(config);

    return config;
  }

  /**
   * Fail-fast de configuração. Carregar sem erro só provava que as variáveis
   * EXISTEM; aqui checamos se o conteúdo presta. Roda depois de qualquer uma
   * das duas fontes (GCP ou env) justamente porque o risco é o mesmo nas duas:
   * o CONFIG_SOURCE decide de onde vem o segredo, não se ele é forte.
   */
  private validate(config: AppConfig): void {
    const { erros, avisos } = validarForcaDosSegredos(config);

    for (const aviso of avisos) {
      this.logger.warn(aviso);
    }

    if (erros.length > 0) {
      const lista = erros.map((problema) => `  - ${problema}`).join('\n');
      throw new Error(
        `Configuração inválida para NODE_ENV=${config.nodeEnv}:\n${lista}\n` +
          'Gere segredos novos (ex.: openssl rand -base64 48) e atualize o Secret Manager.',
      );
    }

    this.logger.log('✓ Segredos validados');
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
        iaUsoEncryptionKey,
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
        anthropicApiKey,
        anthropicModel,
        reminderSchedulerExpectedAudience,
        reminderSchedulerExpectedServiceAccount,
      ] = await Promise.all([
        this.getSecretOrThrow('mongodb-uri'),
        this.getSecretOrThrow('redis-url'),
        this.getSecretOrThrow('jwt-access-secret'),
        this.getSecretOrThrow('jwt-refresh-secret'),
        this.getSecretOrThrow('patient-data-encryption-key'),
        this.getSecretOrThrow('patient-data-hash-key'),
        this.getSecretOrThrow('ia-uso-encryption-key'),
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
        this.getSecretOrDefault('totp-issuer', 'Nuvita Psi'),
        this.getSecretOrThrow('app-root-domain'),
        this.getSecretOrThrow('bootstrap-secret'),
        this.getSecretOrThrow('prontuario-signature-secret'),
        this.getSecretOrDefault('anthropic-api-key', undefined),
        this.getSecretOrDefault('anthropic-model', 'claude-sonnet-5'),
        this.getSecretOrThrow('reminder-scheduler-expected-audience'),
        this.getSecretOrThrow('reminder-scheduler-expected-service-account'),
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
        iaUsoEncryptionKey,
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
        totpIssuer: totpIssuer ?? 'Nuvita Psi',
        appRootDomain,
        bootstrapSecret,
        prontuarioSignatureSecret,
        allowPublicRegistration: resolveAllowPublicRegistration(
          (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'production',
        ),
        gcpProjectId: process.env.GCP_PROJECT_ID!,
        kmsKeyRing: process.env.KMS_KEY_RING || 'nuvita-psi-keyring',
        kmsKey: process.env.KMS_KEY || 'nuvita-psi-master-key',
        anthropicApiKey,
        anthropicModel: anthropicModel ?? 'claude-sonnet-5',
        reminderSchedulerExpectedAudience,
        reminderSchedulerExpectedServiceAccount,
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
      'PATIENT_DATA_HASH_KEY',
      'IA_USO_ENCRYPTION_KEY',
      'DOCUMENT_STORAGE_BUCKET',
      'DOCUMENT_STORAGE_REGION',
      'DOCUMENT_STORAGE_ENDPOINT',
      'DOCUMENT_STORAGE_ACCESS_KEY_ID',
      'DOCUMENT_STORAGE_SECRET_ACCESS_KEY',
      'EMAIL_FROM',
      'APP_ROOT_DOMAIN',
      'BOOTSTRAP_SECRET',
      'PRONTUARIO_SIGNATURE_SECRET',
      'REMINDER_SCHEDULER_EXPECTED_AUDIENCE',
      'REMINDER_SCHEDULER_EXPECTED_SERVICE_ACCOUNT',
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
      patientDataHashKey: process.env.PATIENT_DATA_HASH_KEY!,
      iaUsoEncryptionKey: process.env.IA_USO_ENCRYPTION_KEY!,
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
      totpIssuer: process.env.TOTP_ISSUER || 'Nuvita Psi',
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioFrom: process.env.TWILIO_FROM,
      appRootDomain: process.env.APP_ROOT_DOMAIN!,
      bootstrapSecret: process.env.BOOTSTRAP_SECRET!,
      prontuarioSignatureSecret: process.env.PRONTUARIO_SIGNATURE_SECRET!,
      allowPublicRegistration: resolveAllowPublicRegistration(
        (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
      ),
      gcpProjectId: process.env.GCP_PROJECT_ID || '',
      kmsKeyRing: process.env.KMS_KEY_RING || 'nuvita-psi-keyring',
      kmsKey: process.env.KMS_KEY || 'nuvita-psi-master-key',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      reminderSchedulerExpectedAudience: process.env.REMINDER_SCHEDULER_EXPECTED_AUDIENCE!,
      reminderSchedulerExpectedServiceAccount: process.env.REMINDER_SCHEDULER_EXPECTED_SERVICE_ACCOUNT!,
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
