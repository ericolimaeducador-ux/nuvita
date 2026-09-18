import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { AppConfigService } from '../../../../common/security/config.service';
import { OidcSchedulerGuard } from './oidc-scheduler.guard';

/**
 * Adapter que permite Nest resolver OidcSchedulerGuard via @UseGuards().
 *
 * OidcSchedulerGuard recebe audience/service-account esperados por
 * construtor (não por decorator) de propósito — é assim que fica testável
 * sem Nest (ver oidc-scheduler.guard.spec.ts, 6 casos, já aprovados). Mas
 * uma classe referenciada em @UseGuards(Classe) é auto-instanciada pelo
 * scanner de dependências do Nest via os paramtypes do PRÓPRIO construtor,
 * ignorando qualquer provider customizado (`useFactory`/`useValue`) que se
 * registre sob o mesmo token — não dá pra sobrescrever isso de fora.
 *
 * Este adapter resolve isso sem tocar em OidcSchedulerGuard: tem um
 * construtor 100% resolvível por DI comum (OAuth2Client e AppConfigService
 * já são providers normais do módulo), e só delega o canActivate() pro
 * guard real, construído aqui com os valores de config corretos.
 */
@Injectable()
export class OidcSchedulerGuardAdapter implements CanActivate {
  private readonly guard: OidcSchedulerGuard;

  constructor(oauthClient: OAuth2Client, appConfigService: AppConfigService) {
    const config = appConfigService.getConfig();
    this.guard = new OidcSchedulerGuard(
      oauthClient,
      config.reminderSchedulerExpectedAudience!,
      config.reminderSchedulerExpectedServiceAccount!,
    );
  }

  canActivate(context: ExecutionContext): Promise<boolean> {
    return this.guard.canActivate(context);
  }
}
