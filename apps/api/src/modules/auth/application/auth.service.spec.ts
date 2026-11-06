import { BadRequestException, ConflictException, Logger, UnauthorizedException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import {
  TERMO_DE_TESTE_VERSAO_ATUAL,
  TERMOS_DE_USO_VERSAO_ATUAL,
} from '../../../../../../packages/shared/src/termos';
import { AuditLogRepository } from './ports/audit-log.repository';
import { UserRepository } from './ports/user.repository';
import { AuditEvent } from '../domain/audit-event.enum';
import { User } from '../domain/user.entity';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hash'),
}));

const TERMOS = { versao: '1.0', dataAceite: new Date('2026-09-10T12:00:00.000Z') };

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    nome: 'Fulana',
    email: 'fulana@nuvita.test',
    passwordHash: 'hash-bcrypt',
    papel: Papel.SECRETARIA,
    clinicaId: 'c1',
    ativo: true,
    criadoEm: new Date('2026-09-10T00:00:00.000Z'),
    deveTrocarSenha: false,
    termosAceitos: null,
    ...overrides,
  };
}

function makeService(user: User) {
  const users = {
    findByEmailWithSecrets: jest.fn().mockResolvedValue(user),
    findById: jest.fn().mockResolvedValue(user),
    update: jest.fn().mockImplementation((_id: string, patch: Partial<User>) =>
      Promise.resolve({ ...user, ...patch }),
    ),
  } as unknown as UserRepository;

  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogRepository;

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn().mockResolvedValue({
      typ: 'refresh',
      jti: 'refresh-jti',
      sub: user.id,
      email: user.email,
      papel: user.papel,
      clinicaId: user.clinicaId,
    }),
  };

  const configService = {
    getConfig: jest.fn().mockReturnValue({
      bcryptRounds: 12,
      jwtAccessSecret: 'access-secret',
      jwtRefreshSecret: 'refresh-secret',
    }),
  };

  const loginRateLimiter = {
    assertAllowed: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    recordFailure: jest.fn().mockResolvedValue(undefined),
  };

  const tokenRevocation = {
    isRevoked: jest.fn().mockResolvedValue(false),
    revoke: jest.fn().mockResolvedValue(undefined),
  };

  const service = new AuthService(
    users,
    auditLogs,
    jwtService as never,
    configService as never,
    loginRateLimiter as never,
    tokenRevocation as never,
  );

  return { service, users, auditLogs, jwtService, tokenRevocation };
}

const context = { ip: '127.0.0.1', userAgent: 'jest' };

describe('AuthService — contrato do user na resposta (Fase 2)', () => {
  it('login expõe deveTrocarSenha e termosAceitos no user quando setados', async () => {
    const user = makeUser({ deveTrocarSenha: true, termosAceitos: TERMOS });
    const { service } = makeService(user);

    const res = await service.login({ email: user.email, password: 'x' }, context);

    expect(res.user.deveTrocarSenha).toBe(true);
    expect(res.user.termosAceitos).toEqual(TERMOS);
  });

  it('login expõe deveTrocarSenha=false e termosAceitos=null para conta comum', async () => {
    const user = makeUser({ deveTrocarSenha: false, termosAceitos: null });
    const { service } = makeService(user);

    const res = await service.login({ email: user.email, password: 'x' }, context);

    expect(res.user.deveTrocarSenha).toBe(false);
    expect(res.user.termosAceitos ?? null).toBeNull();
  });

  it('refresh expõe os dois campos no user', async () => {
    const user = makeUser({
      papel: Papel.ENFERMEIRO,
      deveTrocarSenha: true,
      termosAceitos: TERMOS,
    });
    const { service } = makeService(user);

    const res = await service.refresh('refresh-token', context);

    expect(res.user.deveTrocarSenha).toBe(true);
    expect(res.user.termosAceitos).toEqual(TERMOS);
  });

  it('a resposta nunca vaza passwordHash nem twoFactorSecret', async () => {
    const user = makeUser({ twoFactorSecret: 'BASE32' });
    const { service } = makeService(user);

    const res = await service.login({ email: user.email, password: 'x' }, context);
    const asRecord = res.user as unknown as Record<string, unknown>;

    expect(asRecord.passwordHash).toBeUndefined();
    expect(asRecord.twoFactorSecret).toBeUndefined();
  });
});

describe('AuthService.validateAccessPayload — enriquece request.user (Fase 2b)', () => {
  const accessPayload = {
    typ: 'access' as const,
    jti: 'access-jti',
    sub: 'u1',
    email: 'fulana@nuvita.test',
    papel: Papel.ENFERMEIRO,
    // Token coerente com o usuário de teste (R1: papel e clínica do token precisam ser os atuais).
    clinicaId: 'c1',
  };

  it('anexa deveTrocarSenha e termosAceitos ao que retorna', async () => {
    const termos = { versao: '1.0', dataAceite: new Date('2026-09-10T12:00:00.000Z') };
    const user = makeUser({ papel: Papel.ENFERMEIRO, deveTrocarSenha: true, termosAceitos: termos });
    const { service } = makeService(user);

    const result = await service.validateAccessPayload(accessPayload);

    expect(result.deveTrocarSenha).toBe(true);
    expect(result.termosAceitos).toEqual(termos);
    expect(result.sub).toBe('u1');
    expect(result.typ).toBe('access');
  });

  it('normaliza ausência para false / null', async () => {
    const user = makeUser({ papel: Papel.ENFERMEIRO, deveTrocarSenha: false, termosAceitos: null });
    const { service } = makeService(user);

    const result = await service.validateAccessPayload(accessPayload);

    expect(result.deveTrocarSenha).toBe(false);
    expect(result.termosAceitos).toBeNull();
  });
});

describe('AuthService.aceitarTermos (Fase 5)', () => {
  const context = { ip: '127.0.0.1', userAgent: 'jest' };

  it('rejeita versão diferente da vigente com 400', async () => {
    const { service } = makeService(makeUser({ papel: Papel.ENFERMEIRO }));

    await expect(service.aceitarTermos('u1', '0.9', context)).rejects.toThrow(BadRequestException);
  });

  it('registra termosAceitos { versao, dataAceite } e escreve TERMS_ACCEPTED', async () => {
    const user = makeUser({ papel: Papel.ENFERMEIRO, termosAceitos: null });
    const { service, users, auditLogs } = makeService(user);

    const res = await service.aceitarTermos('u1', TERMOS_DE_USO_VERSAO_ATUAL, context);

    expect(users.update).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        termosAceitos: expect.objectContaining({ versao: TERMOS_DE_USO_VERSAO_ATUAL, dataAceite: expect.any(Date) }),
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ event: AuditEvent.TERMS_ACCEPTED, metadata: { versao: TERMOS_DE_USO_VERSAO_ATUAL } }),
    );
    expect(res.user.termosAceitos?.versao).toBe(TERMOS_DE_USO_VERSAO_ATUAL);
  });

  it('é idempotente: aceitar de novo a mesma versão não regrava nem re-audita', async () => {
    const user = makeUser({
      papel: Papel.ENFERMEIRO,
      termosAceitos: { versao: TERMOS_DE_USO_VERSAO_ATUAL, dataAceite: new Date('2026-09-10') },
    });
    const { service, users, auditLogs } = makeService(user);

    const res = await service.aceitarTermos('u1', TERMOS_DE_USO_VERSAO_ATUAL, context);

    expect(users.update).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
    expect(res.user.termosAceitos?.versao).toBe(TERMOS_DE_USO_VERSAO_ATUAL);
  });

  it('não vaza passwordHash/twoFactorSecret na resposta', async () => {
    const user = makeUser({ papel: Papel.ENFERMEIRO, twoFactorSecret: 'BASE32', termosAceitos: null });
    const { service } = makeService(user);

    const res = await service.aceitarTermos('u1', TERMOS_DE_USO_VERSAO_ATUAL, context);
    const asRecord = res.user as unknown as Record<string, unknown>;

    expect(asRecord.passwordHash).toBeUndefined();
    expect(asRecord.twoFactorSecret).toBeUndefined();
  });
});

describe('AuthService.trocarSenhaObrigatoria (Fase 6)', () => {
  const context = { ip: '127.0.0.1', userAgent: 'jest' };

  it('rejeita com 409 quando deveTrocarSenha já é false', async () => {
    const { service } = makeService(makeUser({ deveTrocarSenha: false }));

    await expect(
      service.trocarSenhaObrigatoria('u1', 'novaSenhaSegura123', context),
    ).rejects.toThrow(ConflictException);
  });

  it('atualiza o hash, zera deveTrocarSenha e escreve FORCED_PASSWORD_CHANGED', async () => {
    const user = makeUser({ deveTrocarSenha: true });
    const { service, users, auditLogs } = makeService(user);

    const res = await service.trocarSenhaObrigatoria('u1', 'novaSenhaSegura123', context);

    expect(users.update).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ passwordHash: expect.any(String), deveTrocarSenha: false }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ event: AuditEvent.FORCED_PASSWORD_CHANGED }),
    );
    expect(res.user.deveTrocarSenha).toBe(false);
  });

  it('o passwordHash gravado não é a senha em claro', async () => {
    const user = makeUser({ deveTrocarSenha: true });
    const { service, users } = makeService(user);

    await service.trocarSenhaObrigatoria('u1', 'novaSenhaSegura123', context);

    const patch = (users.update as jest.Mock).mock.calls[0][1];
    expect(patch.passwordHash).not.toBe('novaSenhaSegura123');
  });

  it('não vaza passwordHash/twoFactorSecret na resposta', async () => {
    const user = makeUser({ deveTrocarSenha: true, twoFactorSecret: 'BASE32' });
    const { service } = makeService(user);

    const res = await service.trocarSenhaObrigatoria('u1', 'novaSenhaSegura123', context);
    const asRecord = res.user as unknown as Record<string, unknown>;

    expect(asRecord.passwordHash).toBeUndefined();
    expect(asRecord.twoFactorSecret).toBeUndefined();
  });
});

describe('AuthService — observabilidade dos gates (Fase 13)', () => {
  const context = { ip: '127.0.0.1', userAgent: 'jest' };
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  const payloadsOf = (spy: jest.SpyInstance) =>
    spy.mock.calls.map((c) => JSON.parse(c[0] as string));

  it('aceitarTermos: versão inválida → warn gate_endpoint_4xx status=400 gate=terms', async () => {
    const { service } = makeService(makeUser({ papel: Papel.ENFERMEIRO }));

    await expect(service.aceitarTermos('u1', '0.9', context)).rejects.toThrow(BadRequestException);

    expect(payloadsOf(warnSpy)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'warn',
          event: 'gate_endpoint_4xx',
          status: 400,
          gate: 'terms',
          userId: 'u1',
        }),
      ]),
    );
  });

  it('trocarSenhaObrigatoria: flag já false → warn gate_endpoint_4xx status=409 gate=password', async () => {
    const { service } = makeService(makeUser({ deveTrocarSenha: false }));

    await expect(
      service.trocarSenhaObrigatoria('u1', 'novaSenhaSegura123', context),
    ).rejects.toThrow(ConflictException);

    expect(payloadsOf(warnSpy)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'warn',
          event: 'gate_endpoint_4xx',
          status: 409,
          gate: 'password',
          userId: 'u1',
        }),
      ]),
    );
  });

  it('aceitarTermos: falha ao persistir → error auth_gate_persist_failure gate=terms', async () => {
    const user = makeUser({ papel: Papel.ENFERMEIRO, termosAceitos: null });
    const { service, users } = makeService(user);
    (users.update as jest.Mock).mockRejectedValueOnce(new Error('mongo down'));

    await expect(
      service.aceitarTermos('u1', TERMOS_DE_USO_VERSAO_ATUAL, context),
    ).rejects.toThrow('mongo down');

    expect(payloadsOf(errorSpy)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          event: 'auth_gate_persist_failure',
          gate: 'terms',
          userId: 'u1',
        }),
      ]),
    );
  });

  it('trocarSenhaObrigatoria: falha ao persistir → error auth_gate_persist_failure gate=password', async () => {
    const user = makeUser({ deveTrocarSenha: true });
    const { service, users } = makeService(user);
    (users.update as jest.Mock).mockRejectedValueOnce(new Error('mongo down'));

    await expect(
      service.trocarSenhaObrigatoria('u1', 'novaSenhaSegura123', context),
    ).rejects.toThrow('mongo down');

    expect(payloadsOf(errorSpy)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          event: 'auth_gate_persist_failure',
          gate: 'password',
          userId: 'u1',
        }),
      ]),
    );
  });

  it('caminho feliz de cada gate → nenhum evento de erro/warn', async () => {
    const psi = makeService(makeUser({ papel: Papel.ENFERMEIRO, termosAceitos: null }));
    await psi.service.aceitarTermos('u1', TERMOS_DE_USO_VERSAO_ATUAL, context);

    const pwd = makeService(makeUser({ deveTrocarSenha: true }));
    await pwd.service.trocarSenhaObrigatoria('u1', 'novaSenhaSegura123', context);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

/**
 * Fase 3 (feature-session-revocation-on-password-change): validateAccessPayload
 * e refresh() passam a rejeitar token cujo iat é anterior a
 * user.tokensValidosApartirDe. O caso mais sensível (critério de aceite
 * fixado no design): tokensValidosApartirDe ausente/null NUNCA pode ser
 * tratado como "sempre inválido" — significa "nenhuma troca de senha jamais
 * invalidou sessões deste usuário", ou seja, sempre válido nesse check.
 */
describe('AuthService — revogação de sessão na troca de senha (Fase 3)', () => {
  const accessPayload = {
    typ: 'access' as const,
    jti: 'access-jti',
    sub: 'u1',
    email: 'fulana@nuvita.test',
    papel: Papel.ENFERMEIRO,
    // Token coerente com o usuário de teste (R1: papel e clínica do token precisam ser os atuais).
    clinicaId: 'c1',
  };

  const cutoff = new Date('2026-09-12T10:00:00.000Z');
  const cutoffEpoch = Math.floor(cutoff.getTime() / 1000);

  describe('validateAccessPayload', () => {
    it('rejeita access token cujo iat é anterior a tokensValidosApartirDe', async () => {
      const user = makeUser({ papel: Papel.ENFERMEIRO, tokensValidosApartirDe: cutoff });
      const { service } = makeService(user);

      await expect(
        service.validateAccessPayload({ ...accessPayload, iat: cutoffEpoch - 60 }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('aceita access token cujo iat é igual ou posterior a tokensValidosApartirDe', async () => {
      const user = makeUser({ papel: Papel.ENFERMEIRO, tokensValidosApartirDe: cutoff });
      const { service } = makeService(user);

      const result = await service.validateAccessPayload({ ...accessPayload, iat: cutoffEpoch + 60 });

      expect(result.sub).toBe('u1');
    });

    it('REGRESSÃO CRÍTICA: tokensValidosApartirDe ausente nunca rejeita, mesmo com iat muito antigo', async () => {
      const user = makeUser({ papel: Papel.ENFERMEIRO, tokensValidosApartirDe: undefined });
      const { service } = makeService(user);

      const result = await service.validateAccessPayload({ ...accessPayload, iat: 1 });

      expect(result.sub).toBe('u1');
    });

    it('REGRESSÃO CRÍTICA: tokensValidosApartirDe null nunca rejeita, mesmo com iat muito antigo', async () => {
      const user = makeUser({ papel: Papel.ENFERMEIRO, tokensValidosApartirDe: null });
      const { service } = makeService(user);

      const result = await service.validateAccessPayload({ ...accessPayload, iat: 1 });

      expect(result.sub).toBe('u1');
    });
  });

  describe('refresh', () => {
    it('rejeita refresh token cujo iat é anterior a tokensValidosApartirDe', async () => {
      const user = makeUser({ papel: Papel.ENFERMEIRO, tokensValidosApartirDe: cutoff });
      const { service, jwtService } = makeService(user);
      (jwtService.verifyAsync as jest.Mock).mockResolvedValueOnce({
        typ: 'refresh',
        jti: 'refresh-jti',
        sub: user.id,
        email: user.email,
        papel: user.papel,
        clinicaId: user.clinicaId,
        iat: cutoffEpoch - 60,
      });

      await expect(service.refresh('refresh-token', context)).rejects.toThrow(UnauthorizedException);
    });

    it('aceita refresh token cujo iat é igual ou posterior a tokensValidosApartirDe', async () => {
      const user = makeUser({ papel: Papel.ENFERMEIRO, tokensValidosApartirDe: cutoff });
      const { service, jwtService } = makeService(user);
      (jwtService.verifyAsync as jest.Mock).mockResolvedValueOnce({
        typ: 'refresh',
        jti: 'refresh-jti',
        sub: user.id,
        email: user.email,
        papel: user.papel,
        clinicaId: user.clinicaId,
        iat: cutoffEpoch + 60,
      });

      const res = await service.refresh('refresh-token', context);

      expect(res.user.id).toBe('u1');
    });

    it('REGRESSÃO CRÍTICA: tokensValidosApartirDe ausente nunca rejeita o refresh, mesmo com iat muito antigo', async () => {
      const user = makeUser({ papel: Papel.ENFERMEIRO, tokensValidosApartirDe: undefined });
      const { service, jwtService } = makeService(user);
      (jwtService.verifyAsync as jest.Mock).mockResolvedValueOnce({
        typ: 'refresh',
        jti: 'refresh-jti',
        sub: user.id,
        email: user.email,
        papel: user.papel,
        clinicaId: user.clinicaId,
        iat: 1,
      });

      const res = await service.refresh('refresh-token', context);

      expect(res.user.id).toBe('u1');
    });

    it('REGRESSÃO CRÍTICA: tokensValidosApartirDe null nunca rejeita o refresh, mesmo com iat muito antigo', async () => {
      const user = makeUser({ papel: Papel.ENFERMEIRO, tokensValidosApartirDe: null });
      const { service, jwtService } = makeService(user);
      (jwtService.verifyAsync as jest.Mock).mockResolvedValueOnce({
        typ: 'refresh',
        jti: 'refresh-jti',
        sub: user.id,
        email: user.email,
        papel: user.papel,
        clinicaId: user.clinicaId,
        iat: 1,
      });

      const res = await service.refresh('refresh-token', context);

      expect(res.user.id).toBe('u1');
    });
  });
});

/**
 * Fase 4 (feature-session-revocation-on-password-change): trocarSenhaObrigatoria
 * estampa tokensValidosApartirDe no mesmo write que troca a senha — mesma
 * disciplina de falha já usada para deveTrocarSenha/termosAceitos (uma falha
 * ao persistir não pode deixar o usuário com senha nova mas sem o stamp).
 */
describe('AuthService.trocarSenhaObrigatoria — revogação de sessão (Fase 4)', () => {
  it('estampa tokensValidosApartirDe com a hora atual no mesmo update que troca a senha', async () => {
    const user = makeUser({ deveTrocarSenha: true });
    const { service, users } = makeService(user);

    const before = Date.now();
    await service.trocarSenhaObrigatoria('u1', 'novaSenhaSegura123', context);
    const after = Date.now();

    expect(users.update).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ tokensValidosApartirDe: expect.any(Date) }),
    );
    const patch = (users.update as jest.Mock).mock.calls[0][1];
    expect(patch.tokensValidosApartirDe.getTime()).toBeGreaterThanOrEqual(before);
    expect(patch.tokensValidosApartirDe.getTime()).toBeLessThanOrEqual(after);
  });

  it('falha ao persistir não estampa parcialmente — o erro se propaga sem reportar sucesso', async () => {
    const user = makeUser({ deveTrocarSenha: true });
    const { service, users } = makeService(user);
    (users.update as jest.Mock).mockRejectedValueOnce(new Error('mongo down'));

    await expect(
      service.trocarSenhaObrigatoria('u1', 'novaSenhaSegura123', context),
    ).rejects.toThrow('mongo down');
  });
});

/**
 * Fase 5 (feature-session-revocation-on-password-change): dois itens do
 * mesmo tipo de garantia — visibilidade (evento de monitoring) e isolamento
 * (a checagem de jti no Redis e a de tokensValidosApartirDe no Mongo não
 * podem mascarar uma à outra).
 *
 * NOTA DE HONESTIDADE (mesmo espírito das Fases 2b/3): o bloco "independência"
 * abaixo não tem Red de verdade — a ordem de checks já implementada nas
 * Fases 3/4 (isRevoked antes, assertTokenNotStale depois, sequenciais e sem
 * dependência mútua) já garante isso estruturalmente. Esses testes nascem
 * verdes; o valor deles é travar a garantia como regressão, não provar algo
 * novo agora. Já o bloco "monitoring" tem Red real: nenhum evento é emitido
 * hoje em nenhuma rejeição.
 */
describe('AuthService — visibilidade e isolamento da revogação de sessão (Fase 5)', () => {
  const accessPayload = {
    typ: 'access' as const,
    jti: 'access-jti',
    sub: 'u1',
    email: 'fulana@nuvita.test',
    papel: Papel.ENFERMEIRO,
    // Token coerente com o usuário de teste (R1: papel e clínica do token precisam ser os atuais).
    clinicaId: 'c1',
  };
  const cutoff = new Date('2026-09-12T10:00:00.000Z');
  const cutoffEpoch = Math.floor(cutoff.getTime() / 1000);

  describe('independência entre a checagem de jti (Redis) e a de tokensValidosApartirDe (Mongo)', () => {
    it('jti revogado rejeita mesmo com token fresco e sem tokensValidosApartirDe setado', async () => {
      const user = makeUser({ papel: Papel.ENFERMEIRO, tokensValidosApartirDe: undefined });
      const { service, tokenRevocation } = makeService(user);
      (tokenRevocation.isRevoked as jest.Mock).mockResolvedValueOnce(true);

      await expect(
        service.validateAccessPayload({ ...accessPayload, iat: Math.floor(Date.now() / 1000) }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('token stale rejeita mesmo com jti não revogado', async () => {
      const user = makeUser({ papel: Papel.ENFERMEIRO, tokensValidosApartirDe: cutoff });
      const { service, tokenRevocation } = makeService(user);
      (tokenRevocation.isRevoked as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.validateAccessPayload({ ...accessPayload, iat: cutoffEpoch - 60 }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('nenhum dos dois mecanismos mascara o outro: quando ambos passam, o token é aceito', async () => {
      const user = makeUser({ papel: Papel.ENFERMEIRO, tokensValidosApartirDe: cutoff });
      const { service, tokenRevocation } = makeService(user);
      (tokenRevocation.isRevoked as jest.Mock).mockResolvedValueOnce(false);

      const result = await service.validateAccessPayload({ ...accessPayload, iat: cutoffEpoch + 60 });

      expect(result.sub).toBe('u1');
    });
  });

  describe('evento de monitoring token_rejected_stale_session', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
      warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    const payloadsOf = (spy: jest.SpyInstance) => spy.mock.calls.map((c) => JSON.parse(c[0] as string));

    it('emite token_rejected_stale_session ao rejeitar access token stale', async () => {
      const user = makeUser({ papel: Papel.ENFERMEIRO, tokensValidosApartirDe: cutoff });
      const { service } = makeService(user);

      await expect(
        service.validateAccessPayload({ ...accessPayload, iat: cutoffEpoch - 60 }),
      ).rejects.toThrow(UnauthorizedException);

      expect(payloadsOf(warnSpy)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'warn',
            event: 'token_rejected_stale_session',
            userId: 'u1',
            typ: 'access',
          }),
        ]),
      );
    });

    it('emite token_rejected_stale_session ao rejeitar refresh token stale', async () => {
      const user = makeUser({ papel: Papel.ENFERMEIRO, tokensValidosApartirDe: cutoff });
      const { service, jwtService } = makeService(user);
      (jwtService.verifyAsync as jest.Mock).mockResolvedValueOnce({
        typ: 'refresh',
        jti: 'refresh-jti',
        sub: user.id,
        email: user.email,
        papel: user.papel,
        clinicaId: user.clinicaId,
        iat: cutoffEpoch - 60,
      });

      await expect(service.refresh('refresh-token', context)).rejects.toThrow(UnauthorizedException);

      expect(payloadsOf(warnSpy)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'warn',
            event: 'token_rejected_stale_session',
            userId: 'u1',
            typ: 'refresh',
          }),
        ]),
      );
    });

    it('rejeição por jti revogado NÃO emite token_rejected_stale_session (evento distinto por causa)', async () => {
      const user = makeUser({ papel: Papel.ENFERMEIRO, tokensValidosApartirDe: undefined });
      const { service, tokenRevocation } = makeService(user);
      (tokenRevocation.isRevoked as jest.Mock).mockResolvedValueOnce(true);

      await expect(
        service.validateAccessPayload({ ...accessPayload, iat: Math.floor(Date.now() / 1000) }),
      ).rejects.toThrow(UnauthorizedException);

      expect(payloadsOf(warnSpy)).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ event: 'token_rejected_stale_session' })]),
      );
    });
  });
});

describe('AuthService.aceitarTermos — fase de teste (C3, 2026-10-15)', () => {
  it('usuário de clínica em teste aceita o Termo de Teste', async () => {
    const user = makeUser({ papel: Papel.ADMIN, termosAceitos: null, faseTeste: true });
    const { service, users } = makeService(user);

    await service.aceitarTermos('u1', TERMO_DE_TESTE_VERSAO_ATUAL, context);
    expect(users.update).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ termosAceitos: expect.objectContaining({ versao: TERMO_DE_TESTE_VERSAO_ATUAL }) }),
    );
  });

  it('usuário de clínica em teste NÃO aceita os Termos de Uso no lugar do Termo de Teste', async () => {
    const { service } = makeService(makeUser({ papel: Papel.ADMIN, termosAceitos: null, faseTeste: true }));
    await expect(service.aceitarTermos('u1', TERMOS_DE_USO_VERSAO_ATUAL, context)).rejects.toThrow(BadRequestException);
  });

  it('usuário fora do teste NÃO aceita o Termo de Teste', async () => {
    const { service } = makeService(makeUser({ papel: Papel.ENFERMEIRO, termosAceitos: null, faseTeste: false }));
    await expect(service.aceitarTermos('u1', TERMO_DE_TESTE_VERSAO_ATUAL, context)).rejects.toThrow(BadRequestException);
  });
});

describe('R1.2 — revogação de acesso no servidor (papel/clínica atuais do banco)', () => {
  const payload = { typ: 'access' as const, jti: 'jti-r1', sub: 'u1', email: 'fulana@nuvita.test', papel: Papel.ENFERMEIRO, clinicaId: 'c1' };

  it('sessão aberta + mudança de PAPEL -> próxima chamada recusada (401)', async () => {
    const { service } = makeService(makeUser({ papel: Papel.ADMIN, clinicaId: 'c1' }));
    await expect(service.validateAccessPayload(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('sessão aberta + mudança de CLÍNICA -> próxima chamada recusada (401)', async () => {
    const { service } = makeService(makeUser({ papel: Papel.ENFERMEIRO, clinicaId: 'c2' }));
    await expect(service.validateAccessPayload(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('sessão aberta + usuário desativado -> recusada; sem mudança -> aceita', async () => {
    await expect(makeService(makeUser({ papel: Papel.ENFERMEIRO, clinicaId: 'c1', ativo: false })).service.validateAccessPayload(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(makeService(makeUser({ papel: Papel.ENFERMEIRO, clinicaId: 'c1' })).service.validateAccessPayload(payload)).resolves.toMatchObject({ papel: Papel.ENFERMEIRO, clinicaId: 'c1' });
  });

  it('refresh também recusa token de papel/clínica antigos', async () => {
    const { service } = makeService(makeUser({ papel: Papel.ADMIN, clinicaId: 'c1' }));
    const s = service as unknown as { verifyRefreshToken: (t: string) => Promise<unknown> };
    s.verifyRefreshToken = jest.fn().mockResolvedValue({ ...payload, typ: 'refresh' });
    await expect(service.refresh('tok', { ip: '1', userAgent: 'j' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
