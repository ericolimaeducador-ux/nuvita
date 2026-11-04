import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'net';
import { OAuth2Client } from 'google-auth-library';
import { AppConfigService, AppConfig } from '../../../common/security/config.service';
import { LembretesAgendamentoProcessorService } from '../application/lembretes-agendamento-processor.service';
import { LembretesAgendamentoController } from './lembretes-agendamento.controller';
import { OidcSchedulerGuardAdapter } from './guards/oidc-scheduler-guard.adapter';

/**
 * feature-consultation-reminder-scheduler: prova que o CONTROLLER de fato
 * delega pro guard OIDC antes do handler rodar, E delega o processamento
 * pro LembretesAgendamentoProcessorService (fase 4) sem reimplementar
 * nenhuma contagem. Não repete os 6 casos de rejeição do guard
 * (oidc-scheduler.guard.spec.ts) nem a orquestração attempted/sent/
 * deduped/failed (lembretes-agendamento-processor.service.spec.ts) — só a
 * fiação real, via app Nest de verdade (Test.createTestingModule + fetch,
 * mesmo padrão de common/http/global-throttler.guard.spec.ts).
 *
 * OidcSchedulerGuardAdapter (não OidcSchedulerGuard direto) é quem entra
 * em @UseGuards() no controller — ver comentário no próprio adapter:
 * classes referenciadas em @UseGuards(Classe) são auto-instanciadas pelo
 * Nest via os paramtypes do construtor, ignorando providers customizados
 * (useFactory/useValue) que se registrem sob o mesmo token.
 */
const AUDIENCE_ESPERADA = 'https://nuvita-psi-api-xyz-uc.a.run.app/internal/processar-lembretes';
const SERVICE_ACCOUNT_ESPERADA = 'nuvita-psi-reminder-scheduler@nuvita-499800.iam.gserviceaccount.com';

describe('LembretesAgendamentoController — POST /internal/processar-lembretes', () => {
  let app: INestApplication;
  let baseUrl: string;
  let verifyIdToken: jest.Mock;
  let processar: jest.Mock;

  beforeAll(async () => {
    verifyIdToken = jest.fn();
    processar = jest.fn();
    const oauthClientFake = { verifyIdToken } as unknown as OAuth2Client;
    const appConfigServiceFake = {
      getConfig: (): Partial<AppConfig> => ({
        reminderSchedulerExpectedAudience: AUDIENCE_ESPERADA,
        reminderSchedulerExpectedServiceAccount: SERVICE_ACCOUNT_ESPERADA,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [LembretesAgendamentoController],
      providers: [
        { provide: OAuth2Client, useValue: oauthClientFake },
        { provide: AppConfigService, useValue: appConfigServiceFake },
        OidcSchedulerGuardAdapter,
        { provide: LembretesAgendamentoProcessorService, useValue: { processar } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  function post(authHeader?: string) {
    return fetch(`${baseUrl}/internal/processar-lembretes`, {
      method: 'POST',
      headers: authHeader !== undefined ? { authorization: authHeader } : {},
    });
  }

  it('sem Authorization o guard bloqueia ANTES do handler rodar (401) — prova a fiação, não repete os 6 casos do guard', async () => {
    const res = await post(undefined);
    expect(res.status).toBe(401);
    expect(processar).not.toHaveBeenCalled();
  });

  it('com token OIDC válido (guard aceita) o handler delega pro processor e responde 200 com o resultado dele, sem reimplementar as contagens', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ iss: 'https://accounts.google.com', email: SERVICE_ACCOUNT_ESPERADA }),
    });
    processar.mockResolvedValue({ attempted: 3, sent: 2, deduped: 0, failed: 1 });

    const res = await post('Bearer token-valido');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ attempted: 3, sent: 2, deduped: 0, failed: 1 });
    expect(processar).toHaveBeenCalledTimes(1);
  });
});
