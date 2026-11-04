import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { AppConfigService } from '../../../../common/security/config.service';

/**
 * Criptografia dedicada da trilha de auditoria de uso de IA.
 *
 * Mesma técnica do PacienteCryptoService (AES-256-GCM, IV aleatório por
 * registro, authTag), mas com chave PRÓPRIA (IA_USO_ENCRYPTION_KEY). Domínios
 * de segredo separados de propósito: a lógica de parse/encrypt/decrypt é
 * copiada, não reutilizada, para que uma mudança em um domínio não arraste o
 * outro — e a chave nunca é compartilhada com o módulo de pacientes.
 *
 * Ao contrário do PacienteCryptoService, que serializa tudo numa string
 * `v1:iv:ct:tag`, aqui os três componentes voltam separados: cada um vai para
 * um campo distinto de registros_uso_ia (o trio input* e o trio output*).
 */
@Injectable()
export class IaUsoCryptoService {
  private readonly key: Buffer;

  constructor(configService: AppConfigService) {
    this.key = this.parseKey(configService.getConfig().iaUsoEncryptionKey);
  }

  encrypt(texto: string): { cifrado: string; iv: string; authTag: string } {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      cifrado: ciphertext.toString('base64url'),
      iv: iv.toString('base64url'),
      authTag: authTag.toString('base64url'),
    };
  }

  decrypt(cifrado: string, iv: string, authTag: string): string {
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(cifrado, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  /**
   * Aceita a chave em base64, hex ou UTF-8 cru — o que importa é decodificar
   * para exatamente 32 bytes. Chave ausente ou de tamanho errado derruba a
   * construção do serviço (fail-fast), mesmo comportamento do
   * PacienteCryptoService.
   */
  private parseKey(value: string | undefined): Buffer {
    const candidates = [
      Buffer.from(value ?? '', 'base64'),
      Buffer.from(value ?? '', 'hex'),
      Buffer.from(value ?? '', 'utf8'),
    ];

    const key = candidates.find((candidate) => candidate.length === 32);
    if (!key) {
      throw new Error(
        'IA_USO_ENCRYPTION_KEY deve ter 32 bytes, codificada em base64, hex ou UTF-8 cru.',
      );
    }

    return key;
  }
}
