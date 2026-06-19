import { AppConfigService } from '../../../../common/security/config.service';
import { PacienteCryptoService } from './paciente-crypto.service';

describe('PacienteCryptoService', () => {
  const configService = {
    getConfig: () => ({
      patientDataEncryptionKey: Buffer.from('0123456789abcdef0123456789abcdef').toString('base64'),
      patientDataHashKey: Buffer.from('abcdef0123456789abcdef0123456789').toString('base64'),
    }),
  };

  it('encrypts and decrypts patient fields with authenticated encryption', () => {
    const crypto = new PacienteCryptoService(configService as unknown as AppConfigService);

    const encrypted = crypto.encryptString('12345678900');

    expect(encrypted).not.toBe('12345678900');
    expect(crypto.decryptString(encrypted)).toBe('12345678900');
  });

  it('normalizes CPF before hashing', () => {
    const crypto = new PacienteCryptoService(configService as unknown as AppConfigService);

    expect(crypto.cpfHash('123.456.789-00')).toBe(crypto.cpfHash('12345678900'));
  });
});
