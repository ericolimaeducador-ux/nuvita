import { ExecutionContext } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { AppConfig, AppConfigService } from '../../../../common/security/config.service';
import { OidcSchedulerGuardAdapter } from './oidc-scheduler-guard.adapter';

/**
 * feature-consultation-reminder-scheduler: NÃO repete as 6 checagens de
 * OidcSchedulerGuard (já cobertas em oidc-scheduler.guard.spec.ts). Só
 * prova as duas coisas que são responsabilidade do ADAPTER, e só dele:
 * (a) ler audience/service-account de AppConfigService.getConfig() e
 *     construir o guard real com esses valores;
 * (b) delegar canActivate() pro guard real — aceitar E rejeitar, sem
 *     reimplementar nenhuma checagem própria no meio do caminho.
 */
const AUDIENCE = 'https://exemplo.run.app/internal/processar-lembretes';
const SERVICE_ACCOUNT = 'nuvita-psi-reminder-scheduler@nuvita-499800.iam.gserviceaccount.com';
const OUTRA_SA_LEGITIMA_DO_PROJETO = 'nuvita-psi-deployer@nuvita-499800.iam.gserviceaccount.com';

function makeContext(authHeader?: string): ExecutionContext {
  const request = { headers: authHeader !== undefined ? { authorization: authHeader } : {} };
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

function makeAdapter(verifyIdToken: jest.Mock) {
  const oauthClient = { verifyIdToken } as unknown as OAuth2Client;
  const appConfigService = {
    getConfig: (): Partial<AppConfig> => ({
      reminderSchedulerExpectedAudience: AUDIENCE,
      reminderSchedulerExpectedServiceAccount: SERVICE_ACCOUNT,
    }),
  } as unknown as AppConfigService;

  return new OidcSchedulerGuardAdapter(oauthClient, appConfigService);
}

describe('OidcSchedulerGuardAdapter', () => {
  it('constrói o guard real com audience/service-account de AppConfigService e ACEITA quando o token bate (delegação, caminho feliz)', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({ iss: 'https://accounts.google.com', email: SERVICE_ACCOUNT }),
    });
    const adapter = makeAdapter(verifyIdToken);

    await expect(adapter.canActivate(makeContext('Bearer token-valido'))).resolves.toBe(true);
    // Prova que a audience passada a verifyIdToken vem de AppConfigService, não hardcoded no adapter.
    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'token-valido', audience: AUDIENCE });
  });

  it('delega a REJEIÇÃO pro guard real quando a identidade não bate — o adapter não intercepta nem reimplementa essa checagem', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({ iss: 'https://accounts.google.com', email: OUTRA_SA_LEGITIMA_DO_PROJETO }),
    });
    const adapter = makeAdapter(verifyIdToken);

    await expect(adapter.canActivate(makeContext('Bearer token-de-outra-sa'))).rejects.toThrow();
  });
});
