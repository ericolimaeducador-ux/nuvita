import type { AppConfig } from './config.service';

/**
 * Validação de força dos segredos, aplicada no boot.
 *
 * O carregamento de config já falha quando uma variável obrigatória está
 * AUSENTE, mas até aqui nada olhava o CONTEÚDO: era possível subir em produção
 * com `JWT_ACCESS_SECRET=change-me-access-secret-min-32-chars` — o valor
 * literal do .env.example — sem um único aviso. Estas checagens fecham essa
 * porta, e fecham no boot: um processo que sobe com segredo fraco é pior do
 * que um que não sobe.
 *
 * Só valem em produção/staging. Em desenvolvimento os placeholders continuam
 * funcionando, senão copiar o .env.example deixaria de ser o primeiro passo
 * de quem clona o repositório.
 */

/** Comprimento mínimo de um segredo usado para assinar ou autenticar. */
const MIN_SECRET_LENGTH = 32;

/**
 * Valores literais do .env.example. Não é uma lista de "senhas fracas
 * conhecidas" — é exatamente o conjunto que um deploy copiado do template
 * carregaria por descuido, que é o modo real de isso dar errado.
 */
const PLACEHOLDERS = new Set([
  'change-me-access-secret-min-32-chars',
  'change-me-refresh-secret-min-32-chars',
  'your-base64-encoded-32-bytes-here',
  'your-second-base64-encoded-32-bytes-here',
  'long-random-secret-for-digital-signatures',
  'change-in-production',
  'your-access-key-id',
  'your-secret-access-key',
  'sk-ant-your-api-key-here',
  'your-ia-uso-base64-encoded-32-bytes-here',
  'https://your-cloud-run-service-url/internal/processar-lembretes',
  'your-reminder-scheduler-sa@your-gcp-project.iam.gserviceaccount.com',
]);

/** Segredos que precisam de comprimento mínimo além de não ser placeholder. */
const SEGREDOS_COM_TAMANHO_MINIMO: ReadonlyArray<[keyof AppConfig, string]> = [
  ['jwtAccessSecret', 'JWT_ACCESS_SECRET'],
  ['jwtRefreshSecret', 'JWT_REFRESH_SECRET'],
  ['prontuarioSignatureSecret', 'PRONTUARIO_SIGNATURE_SECRET'],
  ['bootstrapSecret', 'BOOTSTRAP_SECRET'],
];

/**
 * Segredos que só não podem ser placeholder — o formato deles é validado em
 * outro lugar (ex.: a chave de paciente é conferida como 32 bytes pelo
 * PacienteCryptoService, que rejeita qualquer coisa fora disso).
 */
const SEGREDOS_SEM_PLACEHOLDER: ReadonlyArray<[keyof AppConfig, string]> = [
  ['patientDataEncryptionKey', 'PATIENT_DATA_ENCRYPTION_KEY'],
  ['patientDataHashKey', 'PATIENT_DATA_HASH_KEY'],
  ['iaUsoEncryptionKey', 'IA_USO_ENCRYPTION_KEY'],
  ['documentStorageAccessKeyId', 'DOCUMENT_STORAGE_ACCESS_KEY_ID'],
  ['documentStorageSecretAccessKey', 'DOCUMENT_STORAGE_SECRET_ACCESS_KEY'],
  ['anthropicApiKey', 'ANTHROPIC_API_KEY'],
  ['reminderSchedulerExpectedAudience', 'REMINDER_SCHEDULER_EXPECTED_AUDIENCE'],
  ['reminderSchedulerExpectedServiceAccount', 'REMINDER_SCHEDULER_EXPECTED_SERVICE_ACCOUNT'],
];

export interface ResultadoValidacao {
  /** Impedem o boot: segredo fraco em produção é falha de configuração. */
  erros: string[];
  /** Só registram em log: podem ser intencionais, a decisão é de quem opera. */
  avisos: string[];
}

/**
 * Coleta TODOS os problemas antes de falhar, em vez de estourar no primeiro.
 * Quem está configurando um deploy quer a lista inteira de uma vez, não
 * descobrir um segredo fraco por tentativa.
 */
export function validarForcaDosSegredos(config: AppConfig): ResultadoValidacao {
  if (config.nodeEnv !== 'production' && config.nodeEnv !== 'staging') {
    return { erros: [], avisos: [] };
  }

  const problemas: string[] = [];
  const avisos: string[] = [];

  for (const [chave, nomeVar] of SEGREDOS_COM_TAMANHO_MINIMO) {
    const valor = config[chave];
    if (typeof valor !== 'string') continue;

    if (PLACEHOLDERS.has(valor)) {
      problemas.push(`${nomeVar} está com o valor de exemplo do .env.example.`);
    } else if (valor.length < MIN_SECRET_LENGTH) {
      problemas.push(
        `${nomeVar} tem ${valor.length} caracteres; o mínimo é ${MIN_SECRET_LENGTH}.`,
      );
    }
  }

  for (const [chave, nomeVar] of SEGREDOS_SEM_PLACEHOLDER) {
    const valor = config[chave];
    if (typeof valor === 'string' && PLACEHOLDERS.has(valor)) {
      problemas.push(`${nomeVar} está com o valor de exemplo do .env.example.`);
    }
  }

  // Reusar o mesmo segredo nos dois tokens anula a separação entre eles: um
  // refresh token passaria a ser aceito onde se espera um access token.
  if (config.jwtAccessSecret && config.jwtAccessSecret === config.jwtRefreshSecret) {
    problemas.push('JWT_ACCESS_SECRET e JWT_REFRESH_SECRET são idênticos; use segredos distintos.');
  }

  // Aviso, não erro: em produção isso só fica ligado com
  // ALLOW_PUBLIC_REGISTRATION=true explícito, ou seja, alguém já decidiu. O
  // valor aqui é deixar rastro no log de que a porta está aberta.
  if (config.allowPublicRegistration && config.nodeEnv === 'production') {
    avisos.push(
      'ALLOW_PUBLIC_REGISTRATION=true: /auth/register está aberto e cria contas PACIENTE sem vínculo com clínica.',
    );
  }

  return { erros: problemas, avisos };
}
