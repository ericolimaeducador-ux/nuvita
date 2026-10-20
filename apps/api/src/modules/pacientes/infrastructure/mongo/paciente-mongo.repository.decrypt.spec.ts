import { Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../common/security/config.service';
import { PacienteCryptoService } from '../crypto/paciente-crypto.service';
import { PacienteMongoRepository } from './paciente-mongo.repository';

const crypto = new PacienteCryptoService({
  getConfig: () => ({
    patientDataEncryptionKey: Buffer.from('0123456789abcdef0123456789abcdef').toString('base64'),
  }),
} as unknown as AppConfigService);
const outraChave = new PacienteCryptoService({
  getConfig: () => ({
    patientDataEncryptionKey: Buffer.from('fedcba9876543210fedcba9876543210').toString('base64'),
  }),
} as unknown as AppConfigService);

function repo() {
  const r = Object.create(PacienteMongoRepository.prototype) as Record<string, unknown>;
  r.crypto = crypto;
  r.logger = new Logger('teste');
  return r as unknown as {
    decryptOptional(v?: string): string | undefined;
    decryptJsonOptional<T>(v?: string): T | undefined;
  };
}

describe('PacienteMongoRepository — leitura tolerante de campo cifrado ilegível', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });
  afterEach(() => warn.mockRestore());

  it('campo legível é decifrado; ausente vira undefined sem aviso', () => {
    const r = repo();
    expect(r.decryptOptional(crypto.encryptString('11999990000'))).toBe('11999990000');
    expect(r.decryptOptional(undefined)).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it('formato inválido e chave diferente: omite o campo, não lança, e o log não contém PII', () => {
    const r = repo();
    const cifradoOutraChave = outraChave.encryptString('CPF 12345678900 tel 11999990000 a@b.com Rua Z');
    const json = outraChave.encryptJson({ logradouro: 'Rua Z', cep: '01000000' });

    expect(r.decryptOptional('lixo-sem-formato')).toBeUndefined();
    expect(r.decryptOptional(cifradoOutraChave)).toBeUndefined();
    expect(r.decryptJsonOptional(json)).toBeUndefined();
    expect(r.decryptJsonOptional(crypto.encryptString('{não é json'))).toBeUndefined();

    expect(warn).toHaveBeenCalledTimes(4);
    const log = warn.mock.calls.map((c) => String(c[0])).join('\n');
    for (const pii of ['12345678900', '11999990000', 'a@b.com', 'Rua Z', '01000000', cifradoOutraChave]) {
      expect(log).not.toContain(pii);
    }
  });
});
