/**
 * Google Secret Manager Service
 * 
 * Enterprise-grade secrets management with:
 * - Automatic caching (5-min TTL)
 * - KMS envelope encryption
 * - Key rotation support
 * - Audit logging
 * 
 * @author Philips Medical - Healthcare Security
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { KeyManagementServiceClient } from '@google-cloud/kms';
import * as crypto from 'crypto';
import { resolveConfigSource } from './config.service';

interface CachedSecret {
  value: string;
  expiresAt: number;
  version: string;
  rotatedAt: Date;
}

interface SecretMetadata {
  lastRotated: Date;
  nextRotation: Date;
  currentVersion: string;
  rotationSchedule: 'quarterly' | 'semiannual' | 'annual';
}

@Injectable()
export class GoogleSecretsService implements OnModuleInit {
  private readonly logger = new Logger(GoogleSecretsService.name);
  private secretClient: SecretManagerServiceClient = new SecretManagerServiceClient();
  private kmsClient: KeyManagementServiceClient = new KeyManagementServiceClient();
  private secretCache = new Map<string, CachedSecret>();
  private metadataCache = new Map<string, SecretMetadata>();

  private readonly projectId = process.env.GCP_PROJECT_ID;
  private readonly kmsKeyRing = process.env.KMS_KEY_RING || 'nuvita-keyring';
  private readonly kmsKey = process.env.KMS_KEY || 'nuvita-master-key';
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes
  private readonly rotationCheckInterval = 24 * 60 * 60 * 1000; // 24 hours

  async onModuleInit() {
    if (resolveConfigSource() !== 'gcp') {
      this.logger.log(
        `Skipping Google Secrets Service init (CONFIG_SOURCE=env); secrets are loaded from environment variables`,
      );
      return;
    }
    this.logger.log('Initializing Google Secrets Service...');
    await this.validateGCPSetup();
    this.startRotationMonitor();
  }

  /**
   * Get a secret from Google Secret Manager
   * With automatic caching and rotation checks
   */
  async getSecret(secretName: string): Promise<string> {
    const cacheKey = `${this.projectId}:${secretName}`;

    // Check cache (5-min TTL)
    const cached = this.secretCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      this.logger.debug(`✓ Cache hit for secret: ${secretName}`);
      return cached.value;
    }

    try {
      const secret = await this.fetchSecretFromGCP(secretName);
      const metadata = await this.getSecretMetadata(secretName);

      // Check if rotation is needed
      if (this.isRotationNeeded(metadata)) {
        this.logger.warn(`⚠️ Secret "${secretName}" needs rotation (due: ${metadata.nextRotation})`);
        // In production, trigger rotation workflow
        // await this.triggerKeyRotation(secretName);
      }

      // Cache the secret
      this.secretCache.set(cacheKey, {
        value: secret,
        expiresAt: Date.now() + this.cacheTTL,
        version: metadata.currentVersion,
        rotatedAt: metadata.lastRotated,
      });

      return secret;
    } catch (error) {
      this.logger.error(`Failed to fetch secret "${secretName}":`, error);
      throw error;
    }
  }

  /**
   * Fetch secret from GCP Secret Manager
   */
  private async fetchSecretFromGCP(secretName: string): Promise<string> {
    const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;

    try {
      const [version] = await this.secretClient.accessSecretVersion({ name });
      const secretValue = version.payload?.data?.toString() || '';

      if (!secretValue) {
        throw new Error(`Secret "${secretName}" is empty`);
      }

      this.logger.log(`✓ Fetched secret: ${secretName} (version: ${version.name})`);
      return secretValue;
    } catch (error) {
      this.logger.error(`Failed to access secret: ${name}`, error);
      throw error;
    }
  }

  /**
   * Create a secret in Google Secret Manager
   */
  async createSecret(
    secretName: string,
    secretValue: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    const parent = `projects/${this.projectId}`;

    try {
      // Create secret
      const [secret] = await (this.secretClient.createSecret({
        parent,
        secretId: secretName,
        secret: {
          replication: {
            automatic: {},
          },
          labels: {
            environment: process.env.NODE_ENV || 'development',
            service: 'nuvita-api',
            ...metadata,
          },
        },
      }) as unknown as Promise<[{ name?: string | null }]>);

      // Add secret version with the initial value
      await this.secretClient.addSecretVersion({
        parent: secret.name,
        payload: {
          data: Buffer.from(secretValue),
        },
      });

      this.logger.log(`✓ Created secret: ${secretName}`);
      return secret.name ?? '';
    } catch (error) {
      this.logger.error(`Failed to create secret "${secretName}":`, error);
      throw error;
    }
  }

  /**
   * Rotate a secret (create new version)
   * Called quarterly as per HIPAA/LGPD requirements
   */
  async rotateSecret(secretName: string, newValue: string): Promise<string> {
    const parent = `projects/${this.projectId}/secrets/${secretName}`;

    try {
      const [version] = await this.secretClient.addSecretVersion({
        parent,
        payload: {
          data: Buffer.from(newValue),
        },
      });

      // Invalidate cache
      this.secretCache.delete(`${this.projectId}:${secretName}`);
      this.metadataCache.delete(secretName);

      this.logger.log(`✓ Rotated secret: ${secretName} (new version: ${version.name})`);
      return version.name ?? '';
    } catch (error) {
      this.logger.error(`Failed to rotate secret "${secretName}":`, error);
      throw error;
    }
  }

  /**
   * Get secret metadata (rotation history, schedule)
   */
  async getSecretMetadata(secretName: string): Promise<SecretMetadata> {
    const cached = this.metadataCache.get(secretName);
    if (cached) return cached;

    const name = `projects/${this.projectId}/secrets/${secretName}`;

    try {
      const [secret] = await this.secretClient.getSecret({ name });
      const createdAt = this.timestampToDate(secret.createTime);

      const metadata: SecretMetadata = {
        lastRotated: createdAt,
        nextRotation: this.calculateNextRotation(
          createdAt,
          'quarterly',
        ),
        currentVersion: this.latestVersionAlias(secret.versionAliases),
        rotationSchedule: 'quarterly',
      };

      this.metadataCache.set(secretName, metadata);
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to get metadata for "${secretName}":`, error);
      throw error;
    }
  }

  /**
   * KMS Envelope Encryption
   * Encrypts data with data encryption key (DEK) wrapped by master key (KEK)
   */
  async encryptWithKMS(plaintext: string): Promise<{ ciphertext: string; dataKeyEncrypted: string }> {
    try {
      // Generate a random data encryption key
      const dataKey = crypto.randomBytes(32);

      // Encrypt the data with DEK using AES-256-GCM
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);

      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      // Wrap DEK with KMS master key
      const kmsKeyPath = `projects/${this.projectId}/locations/global/keyRings/${this.kmsKeyRing}/cryptoKeys/${this.kmsKey}`;
      const [encryptResponse] = await this.kmsClient.encrypt({
        name: kmsKeyPath,
        plaintext: dataKey,
      });

      const result = {
        ciphertext: `${iv.toString('hex')}:${ciphertext}:${authTag.toString('hex')}`,
        dataKeyEncrypted: this.bytesToBuffer(encryptResponse.ciphertext).toString('base64'),
      };

      this.logger.debug(`✓ Encrypted data with KMS envelope encryption`);
      return result;
    } catch (error) {
      this.logger.error('KMS envelope encryption failed:', error);
      throw error;
    }
  }

  /**
   * KMS Envelope Decryption
   * Unwraps data key with KMS, then decrypts data
   */
  async decryptWithKMS(
    encryptedData: { ciphertext: string; dataKeyEncrypted: string },
  ): Promise<string> {
    try {
      // Unwrap data key
      const kmsKeyPath = `projects/${this.projectId}/locations/global/keyRings/${this.kmsKeyRing}/cryptoKeys/${this.kmsKey}`;
      const [decryptResponse] = await this.kmsClient.decrypt({
        name: kmsKeyPath,
        ciphertext: Buffer.from(encryptedData.dataKeyEncrypted, 'base64'),
      });

      const dataKey = decryptResponse.plaintext as Buffer;

      // Decrypt data
      const [iv, ciphertext, authTag] = encryptedData.ciphertext.split(':');
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        dataKey,
        Buffer.from(iv, 'hex'),
      );

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');

      this.logger.debug(`✓ Decrypted data with KMS envelope decryption`);
      return plaintext;
    } catch (error) {
      this.logger.error('KMS envelope decryption failed:', error);
      throw error;
    }
  }

  /**
   * Validate GCP setup and permissions
   */
  private async validateGCPSetup(): Promise<void> {
    try {
      const projectName = `projects/${this.projectId}`;
      
      // Test Secret Manager access
      await this.secretClient.listSecrets({
        parent: projectName,
        pageSize: 1,
      });

      // Test KMS access
      const kmsKeyPath = `projects/${this.projectId}/locations/global/keyRings/${this.kmsKeyRing}`;
      await this.kmsClient.getKeyRing({ name: kmsKeyPath });

      this.logger.log('✓ GCP setup validated successfully');
    } catch (error) {
      this.logger.error('GCP setup validation failed:', error);
      throw new Error(
        `Failed to validate GCP setup. Ensure: 1) Project ID is correct, 2) Service account has Secret Manager Admin and Cloud KMS Admin roles, 3) KMS key ring exists`,
      );
    }
  }

  /**
   * Check if secret needs rotation
   */
  private isRotationNeeded(metadata: SecretMetadata): boolean {
    const now = new Date();
    return now >= metadata.nextRotation;
  }

  /**
   * Calculate next rotation date
   */
  private calculateNextRotation(lastRotated: Date, schedule: 'quarterly' | 'semiannual' | 'annual'): Date {
    const next = new Date(lastRotated);
    const months = { quarterly: 3, semiannual: 6, annual: 12 }[schedule];
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private timestampToDate(timestamp: { seconds?: unknown; nanos?: unknown } | null | undefined): Date {
    if (!timestamp?.seconds) {
      return new Date();
    }

    const seconds = Number(timestamp.seconds);
    const nanos = Number(timestamp.nanos ?? 0);
    return new Date(seconds * 1000 + Math.floor(nanos / 1_000_000));
  }

  private latestVersionAlias(aliases: Record<string, unknown> | null | undefined): string {
    const latest = aliases?.LATEST ?? aliases?.latest;
    return latest === undefined || latest === null ? 'latest' : String(latest);
  }

  private bytesToBuffer(value: Uint8Array | string | null | undefined): Buffer {
    if (!value) {
      return Buffer.alloc(0);
    }

    return Buffer.isBuffer(value) ? value : Buffer.from(value);
  }

  /**
   * Start rotation monitor (runs every 24 hours)
   */
  private startRotationMonitor(): void {
    setInterval(() => {
      this.logger.debug('Running rotation check...');
      // In production, check all secrets and trigger rotation if needed
    }, this.rotationCheckInterval);
  }

  /**
   * Invalidate cache for a secret
   */
  invalidateCache(secretName: string): void {
    const cacheKey = `${this.projectId}:${secretName}`;
    this.secretCache.delete(cacheKey);
    this.metadataCache.delete(secretName);
    this.logger.debug(`Cache invalidated for: ${secretName}`);
  }

  /**
   * List all secrets in GCP Secret Manager
   */
  async listSecrets(): Promise<string[]> {
    try {
      const [secrets] = await this.secretClient.listSecrets({
        parent: `projects/${this.projectId}`,
      });

      return secrets.map((secret: { name?: string }) => secret.name?.split('/').pop() || '');
    } catch (error) {
      this.logger.error('Failed to list secrets:', error);
      throw error;
    }
  }
}
