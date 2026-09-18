import type { AppConfig } from './config.service';
import { validarForcaDosSegredos } from './config-validation';

/** Segredo forte qualquer, longo o bastante para passar no mínimo. */
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
    ...overrides,
  };
}

describe('validarForcaDosSegredos', () => {
  it('aceita uma configuração de produção com segredos fortes', () => {
    expect(validarForcaDosSegredos(configValida())).toEqual({ erros: [], avisos: [] });
  });

  it('não valida nada fora de produção/staging — .env.example precisa continuar funcionando', () => {
    const dev = configValida({
      nodeEnv: 'development',
      jwtAccessSecret: 'change-me-access-secret-min-32-chars',
      jwtRefreshSecret: 'change-me-refresh-secret-min-32-chars',
      bootstrapSecret: 'change-in-production',
    });

    expect(validarForcaDosSegredos(dev).erros).toHaveLength(0);
  });

  it('rejeita o placeholder do .env.example em produção', () => {
    const { erros } = validarForcaDosSegredos(
      configValida({ jwtAccessSecret: 'change-me-access-secret-min-32-chars' }),
    );

    expect(erros).toContainEqual(expect.stringContaining('JWT_ACCESS_SECRET'));
  });

  it('rejeita placeholder mesmo tendo o comprimento mínimo', () => {
    // 'change-me-access-secret-min-32-chars' tem 36 caracteres: passaria no
    // teste de tamanho. É o caso que motiva a lista de placeholders existir.
    expect('change-me-access-secret-min-32-chars'.length).toBeGreaterThanOrEqual(32);

    const { erros } = validarForcaDosSegredos(
      configValida({ jwtAccessSecret: 'change-me-access-secret-min-32-chars' }),
    );

    expect(erros).toHaveLength(1);
  });

  it('rejeita segredo curto em produção', () => {
    const { erros } = validarForcaDosSegredos(configValida({ bootstrapSecret: 'curto' }));

    expect(erros).toContainEqual(expect.stringContaining('BOOTSTRAP_SECRET'));
  });

  it('rejeita access e refresh secret idênticos', () => {
    const { erros } = validarForcaDosSegredos(
      configValida({ jwtAccessSecret: FORTE_A, jwtRefreshSecret: FORTE_A }),
    );

    expect(erros).toContainEqual(expect.stringContaining('idênticos'));
  });

  it('acumula todos os problemas em vez de parar no primeiro', () => {
    const { erros } = validarForcaDosSegredos(
      configValida({
        jwtAccessSecret: 'change-me-access-secret-min-32-chars',
        jwtRefreshSecret: 'curto',
        prontuarioSignatureSecret: 'long-random-secret-for-digital-signatures',
      }),
    );

    expect(erros).toHaveLength(3);
  });

  it('trata registro público aberto como aviso, não como erro de boot', () => {
    const { erros, avisos } = validarForcaDosSegredos(
      configValida({ allowPublicRegistration: true }),
    );

    expect(erros).toHaveLength(0);
    expect(avisos).toContainEqual(expect.stringContaining('ALLOW_PUBLIC_REGISTRATION'));
  });

  it('ignora anthropicApiKey ausente', () => {
    const { erros } = validarForcaDosSegredos(
      configValida({ anthropicApiKey: undefined }),
    );

    expect(erros).toHaveLength(0);
  });

  it('rejeita chave da Anthropic com o valor de exemplo', () => {
    const { erros } = validarForcaDosSegredos(
      configValida({ anthropicApiKey: 'sk-ant-your-api-key-here' }),
    );

    expect(erros).toContainEqual(expect.stringContaining('ANTHROPIC_API_KEY'));
  });

  it('rejeita REMINDER_SCHEDULER_EXPECTED_AUDIENCE/SERVICE_ACCOUNT com o valor de exemplo (feature-consultation-reminder-scheduler)', () => {
    const { erros } = validarForcaDosSegredos(
      configValida({
        reminderSchedulerExpectedAudience: 'https://your-cloud-run-service-url/internal/processar-lembretes',
        reminderSchedulerExpectedServiceAccount: 'your-reminder-scheduler-sa@your-gcp-project.iam.gserviceaccount.com',
      }),
    );

    expect(erros).toContainEqual(expect.stringContaining('REMINDER_SCHEDULER_EXPECTED_AUDIENCE'));
    expect(erros).toContainEqual(expect.stringContaining('REMINDER_SCHEDULER_EXPECTED_SERVICE_ACCOUNT'));
  });
});
