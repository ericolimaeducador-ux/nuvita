import { createHmac } from 'crypto';
import { AppConfigService } from './config.service';

/** Só dígitos, sem espaços/traços/parênteses/DDI. */
export function normalizePhone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

/**
 * HMAC-SHA256 determinístico do telefone, pra permitir busca sem guardar o
 * número em claro — mesmo padrão do cpfHash em PacienteCryptoService, mas
 * independente dele: PacientesModule não exporta PacienteCryptoService, e
 * acoplar o módulo de auth ao de pacientes só por causa de um HMAC não vale a
 * pena. Reusa a mesma chave de config (patientDataHashKey).
 */
export function phoneHash(telefone: string, configService: AppConfigService): string {
  const config = configService.getConfig();
  const key = config.patientDataHashKey ?? config.patientDataEncryptionKey;
  return createHmac('sha256', parseKey(key)).update(normalizePhone(telefone)).digest('hex');
}

function parseKey(value: string): Buffer {
  const candidates = [Buffer.from(value, 'base64'), Buffer.from(value, 'hex'), Buffer.from(value, 'utf8')];
  const key = candidates.find((candidate) => candidate.length === 32);
  if (!key) {
    throw new Error('Patient/phone hash key must be 32 bytes, base64-encoded, hex-encoded, or raw UTF-8.');
  }
  return key;
}
