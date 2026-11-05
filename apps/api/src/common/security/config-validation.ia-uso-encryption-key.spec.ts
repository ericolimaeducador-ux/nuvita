import type { AppConfig } from './config.service';
import { validarForcaDosSegredos } from './config-validation';

/**
 * Valor de exemplo que o .env.example carrega para IA_USO_ENCRYPTION_KEY.
 * Precisa ser rejeitado em produção/staging pelo mesmo motivo dos outros
 * placeholders: é o que um deploy copiado do template sobe sem querer.
 */
const IA_USO_KEY_PLACEHOLDER = 'your-ia-uso-base64-encoded-32-bytes-here';

/** Segredos fortes quaisquer, longos o bastante para passar no mínimo. */
const FORTE_A = 'Rm9ydGVBLTQ4Ynl0ZXMtYWxlYXRvcmlvcy1wYXJhLXRlc3RlLTAwMQ==';
const FORTE_B = 'Rm9ydGVCLTQ4Ynl0ZXMtYWxlYXRvcmlvcy1wYXJhLXRlc3RlLTAwMg==';

function configValida(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: 3000,
    nodeEnv: 'production',
    corsOrigin: ['https://psi.nuvita.app.br'],
    mongodbUri: 'mongodb://localhost:27017/nuvita',
    redisUrl: 'redis://localhost:6379',
    jwtAccessSecret: FORTE_A,
    jwtRefreshSecret: FORTE_B,
    bcryptRounds: 12,
    patientDataEncryptionKey: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
    patientDataHashKey: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmI=',
    documentStorageBucket: 'nuvita-docs',
    documentStorageRegion: 'auto',
    documentStorageEndpoint: 'https://storage.example.com',
    documentStorageForcePathStyle: true,
    documentStorageAccessKeyId: 'AKIAREALKEYID',
    documentStorageSecretAccessKey: 'segredo-real-do-storage',
    emailProvider: 'resend',
    emailFrom: 'nao-responda@nuvita.app.br',
    appRootDomain: 'nuvita.app.br',
    bootstrapSecret: FORTE_A + 'bootstrap',
    totpIssuer: 'Nuvita Psi',
    allowPublicRegistration: false,
    prontuarioSignatureSecret: FORTE_B + 'assinatura',
    gcpProjectId: 'nuvita-psi',
    kmsKeyRing: 'nuvita-psi-keyring',
    kmsKey: 'nuvita-psi-master-key',
    anthropicModel: 'claude-sonnet-5',
    logLevel: 'info',
    iaUsoEncryptionKey: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmI=',
    ...overrides,
  };
}

describe('validarForcaDosSegredos — IA_USO_ENCRYPTION_KEY', () => {
  it('rejeita o placeholder do .env.example em produção', () => {
    const { erros } = validarForcaDosSegredos(
      configValida({ iaUsoEncryptionKey: IA_USO_KEY_PLACEHOLDER }),
    );

    expect(erros).toContainEqual(expect.stringContaining('IA_USO_ENCRYPTION_KEY'));
  });

  it('rejeita o placeholder também em staging', () => {
    const { erros } = validarForcaDosSegredos(
      configValida({ nodeEnv: 'staging', iaUsoEncryptionKey: IA_USO_KEY_PLACEHOLDER }),
    );

    expect(erros).toContainEqual(expect.stringContaining('IA_USO_ENCRYPTION_KEY'));
  });

  it('não valida o placeholder fora de produção/staging', () => {
    const { erros } = validarForcaDosSegredos(
      configValida({ nodeEnv: 'development', iaUsoEncryptionKey: IA_USO_KEY_PLACEHOLDER }),
    );

    expect(erros).toHaveLength(0);
  });

  it('aceita uma chave real em produção', () => {
    const { erros } = validarForcaDosSegredos(
      configValida({ iaUsoEncryptionKey: 'Y2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2M=' }),
    );

    expect(erros).toHaveLength(0);
  });

  it('ignora a chave ausente — presença é responsabilidade do loader, não da validação', () => {
    const { erros } = validarForcaDosSegredos(configValida({ iaUsoEncryptionKey: undefined }));

    expect(erros).toHaveLength(0);
  });
});
