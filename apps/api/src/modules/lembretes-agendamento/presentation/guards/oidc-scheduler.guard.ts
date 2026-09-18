import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

/**
 * Guard do endpoint POST /internal/processar-lembretes
 * (feature-consultation-reminder-scheduler) — único ponto de entrada
 * externo desta feature, chamado pelo Cloud Scheduler via token OIDC.
 *
 * verifyIdToken() já verifica assinatura, expiração e audience (recebe a
 * audience esperada e rejeita internamente se não bater — cobre os casos
 * de token forjado/expirado/de outro endpoint). issuer e identidade
 * (email da service account) são conferidos explicitamente aqui: não é
 * suficiente "ser do Google e estar assinado corretamente" — este job
 * só pode ser acionado pela identidade dedicada
 * nuvita-psi-reminder-scheduler, nunca por outra service account
 * legítima do mesmo projeto (ex.: o deployer).
 */
const ISSUERS_VALIDOS = new Set(['accounts.google.com', 'https://accounts.google.com']);

@Injectable()
export class OidcSchedulerGuard implements CanActivate {
  constructor(
    private readonly oauthClient: OAuth2Client,
    private readonly audienceEsperada: string,
    private readonly serviceAccountEsperada: string,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token OIDC ausente.');
    }

    const idToken = authHeader.slice('Bearer '.length);

    let ticket;
    try {
      ticket = await this.oauthClient.verifyIdToken({ idToken, audience: this.audienceEsperada });
    } catch {
      throw new UnauthorizedException('Token OIDC inválido.');
    }

    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedException('Token OIDC sem payload.');
    }

    if (!ISSUERS_VALIDOS.has(payload.iss as string)) {
      throw new UnauthorizedException('Issuer do token OIDC inválido.');
    }

    if (payload.email !== this.serviceAccountEsperada) {
      throw new UnauthorizedException('Identidade do token OIDC não autorizada.');
    }

    return true;
  }
}
