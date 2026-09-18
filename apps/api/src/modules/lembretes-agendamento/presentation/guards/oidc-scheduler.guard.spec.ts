import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { OAuth2Client } from 'google-auth-library';
import { OidcSchedulerGuard } from './oidc-scheduler.guard';

/**
 * feature-consultation-reminder-scheduler, fase 3: guard OIDC do endpoint
 * POST /internal/processar-lembretes — único ponto de entrada externo desta
 * feature, maior risco de segurança. "É do Google e está assinado
 * corretamente" NÃO basta: o guard precisa conferir a IDENTIDADE específica
 * esperada (a service account dedicada nuvita-psi-reminder-scheduler),
 * senão qualquer outra identidade legítima do Google — inclusive outra
 * service account real do MESMO projeto — passaria (caso 5 abaixo).
 *
 * verifyIdToken() do google-auth-library já faz signature+expiry+audience
 * check internamente (por isso os casos 2/3 simulam rejeição da própria
 * lib); iss e email (identidade) são conferidos explicitamente pelo guard
 * depois, porque são exatamente o tipo de checagem que não dá pra
 * simplesmente confiar estar "implícita" numa lib genérica — tem que ser
 * visível e testável aqui.
 */
const AUDIENCE_ESPERADA = 'https://nuvita-psi-api-xyz-uc.a.run.app/internal/processar-lembretes';
const SERVICE_ACCOUNT_ESPERADA = 'nuvita-psi-reminder-scheduler@nuvita-499800.iam.gserviceaccount.com';
// Identidade real, legítima, DO MESMO projeto — não é um impostor externo,
// é outra SA de verdade (roles/run.admin) que não deveria ter acesso a ESTE endpoint.
const OUTRA_SA_LEGITIMA_DO_PROJETO = 'nuvita-psi-deployer@nuvita-499800.iam.gserviceaccount.com';

function makeContext(authHeader?: string): ExecutionContext {
  const request = { headers: authHeader !== undefined ? { authorization: authHeader } : {} };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function makeTicket(payload: Record<string, unknown> | null) {
  return { getPayload: () => payload };
}

function makeGuard(verifyIdToken: jest.Mock) {
  const oauthClient = { verifyIdToken } as unknown as OAuth2Client;
  return new OidcSchedulerGuard(oauthClient, AUDIENCE_ESPERADA, SERVICE_ACCOUNT_ESPERADA);
}

describe('OidcSchedulerGuard', () => {
  it('1. requisição sem header Authorization é rejeitada (401), sem sequer chamar verifyIdToken', async () => {
    const verifyIdToken = jest.fn();
    const guard = makeGuard(verifyIdToken);

    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(UnauthorizedException);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('2. token JWT de usuário comum (não OIDC do Google) é rejeitado — verifyIdToken não valida assinatura HS256 de sessão', async () => {
    const verifyIdToken = jest.fn().mockRejectedValue(new Error('Wrong number of segments in token'));
    const guard = makeGuard(verifyIdToken);

    await expect(guard.canActivate(makeContext('Bearer jwt-de-sessao-de-usuario.assinado.hs256'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('3. token OIDC com audience errada (endpoint diferente) é rejeitado', async () => {
    const verifyIdToken = jest.fn().mockRejectedValue(new Error('Wrong recipient, payload audience != requiredAudience'));
    const guard = makeGuard(verifyIdToken);

    await expect(guard.canActivate(makeContext('Bearer token-com-audience-errada'))).rejects.toThrow(UnauthorizedException);
    expect(verifyIdToken).toHaveBeenCalledWith(expect.objectContaining({ audience: AUDIENCE_ESPERADA }));
  });

  it('4. token OIDC com issuer errado (não accounts.google.com) é rejeitado', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue(
      makeTicket({ iss: 'https://outro-issuer.example.com', email: SERVICE_ACCOUNT_ESPERADA }),
    );
    const guard = makeGuard(verifyIdToken);

    await expect(guard.canActivate(makeContext('Bearer token-com-issuer-errado'))).rejects.toThrow(UnauthorizedException);
  });

  it('5. [CASO CRÍTICO] token OIDC de OUTRA service account legítima do MESMO projeto (nuvita-psi-deployer) é rejeitado', async () => {
    // Assinatura válida, issuer correto (accounts.google.com), audience correta
    // (é a mesma Cloud Run app) — mas a IDENTIDADE não é a esperada. Isso prova
    // que o guard confere QUEM especificamente chamou, não só "alguém do Google
    // com token bem formado e assinado".
    const verifyIdToken = jest.fn().mockResolvedValue(
      makeTicket({ iss: 'https://accounts.google.com', email: OUTRA_SA_LEGITIMA_DO_PROJETO }),
    );
    const guard = makeGuard(verifyIdToken);

    await expect(guard.canActivate(makeContext('Bearer token-de-outra-sa-legitima-do-projeto'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('6. todos os critérios corretos (issuer, audience, service account, assinatura válida) → aceita', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue(
      makeTicket({ iss: 'https://accounts.google.com', email: SERVICE_ACCOUNT_ESPERADA }),
    );
    const guard = makeGuard(verifyIdToken);

    await expect(guard.canActivate(makeContext('Bearer token-valido'))).resolves.toBe(true);
    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'token-valido', audience: AUDIENCE_ESPERADA });
  });
});
