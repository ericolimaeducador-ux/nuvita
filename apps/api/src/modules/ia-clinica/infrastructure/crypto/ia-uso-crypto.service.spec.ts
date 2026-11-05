import { AppConfigService } from '../../../../common/security/config.service';
import { IaUsoCryptoService } from './ia-uso-crypto.service';

describe('IaUsoCryptoService', () => {
  const configService = {
    getConfig: () => ({
      iaUsoEncryptionKey: Buffer.from('0123456789abcdef0123456789abcdef').toString('base64'),
    }),
  };

  function makeService(): IaUsoCryptoService {
    return new IaUsoCryptoService(configService as unknown as AppConfigService);
  }

  it('faz roundtrip de encrypt/decrypt com criptografia autenticada', () => {
    const crypto = makeService();
    const texto = JSON.stringify({ motivoAtendimento: 'ansiedade', evolucao: 'melhora leve' });

    const { cifrado, iv, authTag } = crypto.encrypt(texto);

    expect(cifrado).not.toBe(texto);
    expect(crypto.decrypt(cifrado, iv, authTag)).toBe(texto);
  });

  it('usa IV aleatório por chamada — dois encrypts do mesmo texto diferem', () => {
    const crypto = makeService();

    const a = crypto.encrypt('mesmo texto');
    const b = crypto.encrypt('mesmo texto');

    expect(a.iv).not.toBe(b.iv);
    expect(a.cifrado).not.toBe(b.cifrado);
  });

  it('falha na descriptografia se o authTag for adulterado', () => {
    const crypto = makeService();
    const { cifrado, iv, authTag } = crypto.encrypt('conteúdo sensível');

    const adulterado = Buffer.from(authTag, 'base64url');
    adulterado[0] ^= 0x01;

    expect(() => crypto.decrypt(cifrado, iv, adulterado.toString('base64url'))).toThrow();
  });

  it('falha na descriptografia se o texto cifrado for adulterado', () => {
    const crypto = makeService();
    const { cifrado, iv, authTag } = crypto.encrypt('conteúdo sensível');

    const adulterado = Buffer.from(cifrado, 'base64url');
    adulterado[0] ^= 0x01;

    expect(() => crypto.decrypt(adulterado.toString('base64url'), iv, authTag)).toThrow();
  });

  it('rejeita na construção uma chave que não decodifica para 32 bytes', () => {
    const configRuim = { getConfig: () => ({ iaUsoEncryptionKey: 'curta-demais' }) };

    expect(() => new IaUsoCryptoService(configRuim as unknown as AppConfigService)).toThrow();
  });
});
