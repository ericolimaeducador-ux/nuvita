import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

@Injectable()
export class PacienteCryptoService {
  private readonly encryptionKey: Buffer;
  private readonly hashKey: Buffer;

  constructor(configService: ConfigService) {
    this.encryptionKey = this.parseKey(configService.getOrThrow<string>('PATIENT_DATA_ENCRYPTION_KEY'));
    this.hashKey = this.parseKey(
      configService.get<string>('PATIENT_DATA_HASH_KEY') ??
        configService.getOrThrow<string>('PATIENT_DATA_ENCRYPTION_KEY'),
    );
  }

  encryptString(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return ['v1', iv.toString('base64url'), ciphertext.toString('base64url'), tag.toString('base64url')].join(':');
  }

  decryptString(value: string): string {
    const [version, iv, ciphertext, tag] = value.split(':');
    if (version !== 'v1' || !iv || !ciphertext || !tag) {
      throw new Error('Invalid encrypted patient field format.');
    }

    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  encryptJson<T>(value: T): string {
    return this.encryptString(JSON.stringify(value));
  }

  decryptJson<T>(value: string): T {
    return JSON.parse(this.decryptString(value)) as T;
  }

  cpfHash(cpf: string): string {
    return this.hmac(this.onlyDigits(cpf));
  }

  normalizeCpf(cpf: string): string {
    return this.onlyDigits(cpf);
  }

  private hmac(value: string): string {
    return createHmac('sha256', this.hashKey).update(value).digest('hex');
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }

  private parseKey(value: string): Buffer {
    const candidates = [
      Buffer.from(value, 'base64'),
      Buffer.from(value, 'hex'),
      Buffer.from(value, 'utf8'),
    ];

    const key = candidates.find((candidate) => candidate.length === 32);
    if (!key) {
      throw new Error('Patient encryption keys must be 32 bytes, base64-encoded, hex-encoded, or raw UTF-8.');
    }

    return key;
  }
}
