import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { AccountRecoveryService } from './account-recovery.service';
import { AuditLogRepository } from './ports/audit-log.repository';
import { PasswordRecoveryTokenRepository } from './ports/password-recovery-token.repository';
import { UserRepository } from './ports/user.repository';
import { AuditEvent } from '../domain/audit-event.enum';
import { PasswordRecoveryToken } from '../domain/password-recovery-token.entity';
import { User } from '../domain/user.entity';
import { AppConfigService } from '../../../common/security/config.service';
import { RedisRateLimiterService } from '../../../common/security/redis-rate-limiter.service';
import { TokenRevocationService } from '../infrastructure/redis/token-revocation.service';
import { EmailSender } from '../../notificacoes/infrastructure/senders/email.sender';
import { WhatsAppSender } from '../../notificacoes/infrastructure/senders/whatsapp.sender';
import { RequestContext } from './auth.service';

const context: RequestContext = { ip: '127.0.0.1', userAgent: 'jest' };

const baseUser: User = {
  id: 'user-1',
  nome: 'Andreia',
  email: 'andreia.administcomercial@gmail.com',
  passwordHash: 'hash-antigo',
  papel: 'SECRETARIA' as User['papel'],
  ativo: true,
  criadoEm: new Date('2026-01-01T00:00:00.000Z'),
  telefone: '11999998888',
};

// Chave de 32 bytes válida (hex) — mesma exigida por phoneHash/parseKey.
const HASH_KEY_HEX = '00'.repeat(32);

function configServiceStub(overrides: Partial<ReturnType<AppConfigService['getConfig']>> = {}) {
  return {
    getConfig: jest.fn().mockReturnValue({
      bcryptRounds: 4,
      nodeEnv: 'development',
      appRootDomain: 'nuvita.app.br',
      patientDataHashKey: HASH_KEY_HEX,
      patientDataEncryptionKey: HASH_KEY_HEX,
      ...overrides,
    }),
  } as unknown as AppConfigService;
}

function serviceWith(overrides: {
  users?: Record<string, jest.Mock>;
  tokens?: Record<string, jest.Mock>;
  auditLogs?: Record<string, jest.Mock>;
  rateLimiter?: Record<string, jest.Mock>;
  tokenRevocation?: Record<string, jest.Mock>;
  emailSender?: Record<string, jest.Mock>;
  whatsappSender?: Record<string, jest.Mock>;
  configOverrides?: Partial<ReturnType<AppConfigService['getConfig']>>;
}) {
  const users = { findByEmail: jest.fn(), findByTelefoneHash: jest.fn(), update: jest.fn(), ...overrides.users };
  const tokens = {
    create: jest.fn().mockResolvedValue(undefined),
    findByTokenHash: jest.fn(),
    findActiveByUser: jest.fn(),
    incrementAttempts: jest.fn(),
    consume: jest.fn(),
    deleteAllForUser: jest.fn(),
    ...overrides.tokens,
  };
  const auditLogs = { create: jest.fn(), ...overrides.auditLogs };
  const rateLimiter = {
    assertAllowed: jest.fn().mockResolvedValue(undefined),
    recordAttempt: jest.fn().mockResolvedValue(undefined),
    ...overrides.rateLimiter,
  };
  const tokenRevocation = { revokeAllForUser: jest.fn(), ...overrides.tokenRevocation };
  const emailSender = { send: jest.fn().mockResolvedValue(undefined), ...overrides.emailSender };
  const whatsappSender = { send: jest.fn().mockResolvedValue(undefined), ...overrides.whatsappSender };

  const service = new AccountRecoveryService(
    users as unknown as UserRepository,
    tokens as unknown as PasswordRecoveryTokenRepository,
    auditLogs as unknown as AuditLogRepository,
    configServiceStub(overrides.configOverrides),
    rateLimiter as unknown as RedisRateLimiterService,
    tokenRevocation as unknown as TokenRevocationService,
    emailSender as unknown as EmailSender,
    whatsappSender as unknown as WhatsAppSender,
  );

  return { service, users, tokens, auditLogs, rateLimiter, tokenRevocation, emailSender, whatsappSender };
}

describe('AccountRecoveryService', () => {
  describe('forgotPassword — não deve revelar se o e-mail existe', () => {
    it('e-mail inexistente: retorna {ok:true} sem criar token nem enviar e-mail', async () => {
      const { service, users, tokens, emailSender } = serviceWith({
        users: { findByEmail: jest.fn().mockResolvedValue(null) },
      });

      const result = await service.forgotPassword({ email: 'ninguem@nuvita.test' }, context);

      expect(result).toEqual({ ok: true });
      expect(tokens.create).not.toHaveBeenCalled();
      expect(emailSender.send).not.toHaveBeenCalled();
    });

    it('e-mail existente: mesma resposta {ok:true}, mas cria token e envia e-mail', async () => {
      const { service, users, tokens, emailSender, auditLogs } = serviceWith({
        users: { findByEmail: jest.fn().mockResolvedValue(baseUser) },
      });

      const result = await service.forgotPassword({ email: baseUser.email }, context);

      expect(result).toEqual({ ok: true });
      expect(tokens.create).toHaveBeenCalledWith(expect.objectContaining({ userId: baseUser.id, tipo: 'reset' }));
      expect(emailSender.send).toHaveBeenCalledTimes(1);
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: AuditEvent.PASSWORD_RESET_REQUESTED, userId: baseUser.id }),
      );
    });

    it('usuário inativo é tratado como inexistente', async () => {
      const { service, tokens, emailSender } = serviceWith({
        users: { findByEmail: jest.fn().mockResolvedValue({ ...baseUser, ativo: false }) },
      });

      const result = await service.forgotPassword({ email: baseUser.email }, context);

      expect(result).toEqual({ ok: true });
      expect(tokens.create).not.toHaveBeenCalled();
      expect(emailSender.send).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const validRecord: PasswordRecoveryToken = {
      id: 'token-1',
      userId: baseUser.id,
      tipo: 'reset',
      tokenHash: 'qualquer-hash',
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
    };

    it('token inexistente: 400 genérico, não mexe em senha nem sessão', async () => {
      const { service, users, tokenRevocation, auditLogs } = serviceWith({
        tokens: { findByTokenHash: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.resetPassword({ token: 'abc', novaSenha: '1234567890' }, context)).rejects.toThrow(
        BadRequestException,
      );
      expect(users.update).not.toHaveBeenCalled();
      expect(tokenRevocation.revokeAllForUser).not.toHaveBeenCalled();
      expect(auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ event: AuditEvent.PASSWORD_RESET_FAILED }));
    });

    it('token expirado: 400 genérico', async () => {
      const { service } = serviceWith({
        tokens: {
          findByTokenHash: jest.fn().mockResolvedValue({ ...validRecord, expiresAt: new Date(Date.now() - 1000) }),
        },
      });

      await expect(service.resetPassword({ token: 'abc', novaSenha: '1234567890' }, context)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('token válido: troca a senha, consome o token e revoga todas as sessões', async () => {
      const { service, users, tokens, tokenRevocation, auditLogs } = serviceWith({
        tokens: { findByTokenHash: jest.fn().mockResolvedValue(validRecord) },
      });

      const result = await service.resetPassword({ token: 'abc', novaSenha: '1234567890' }, context);

      expect(result).toEqual({ ok: true });
      expect(users.update).toHaveBeenCalledWith(baseUser.id, expect.objectContaining({ passwordHash: expect.any(String) }));
      expect(tokens.consume).toHaveBeenCalledWith(validRecord.id);
      expect(tokenRevocation.revokeAllForUser).toHaveBeenCalledWith(baseUser.id, expect.any(Number));
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: AuditEvent.PASSWORD_RESET_COMPLETED, userId: baseUser.id }),
      );
    });

    it('reuso do mesmo token: 2ª tentativa falha porque o repositório não devolve token consumido', async () => {
      // findByTokenHash já filtra consumedAt no repositório real — aqui simulamos
      // a 2ª chamada retornando null, como aconteceria após consume().
      const findByTokenHash = jest.fn().mockResolvedValueOnce(validRecord).mockResolvedValueOnce(null);
      const { service } = serviceWith({ tokens: { findByTokenHash } });

      await service.resetPassword({ token: 'abc', novaSenha: '1234567890' }, context);
      await expect(service.resetPassword({ token: 'abc', novaSenha: '1234567890' }, context)).rejects.toThrow(
        BadRequestException,
      );
      expect(findByTokenHash).toHaveBeenCalledTimes(2);
    });
  });

  describe('forgotLogin — não deve revelar se o telefone existe', () => {
    it('telefone inexistente: {ok:true} sem criar OTP nem enviar WhatsApp', async () => {
      const { service, tokens, whatsappSender } = serviceWith({
        users: { findByTelefoneHash: jest.fn().mockResolvedValue(null) },
      });

      const result = await service.forgotLogin({ telefone: '11900000000' }, context);

      expect(result).toEqual({ ok: true });
      expect(tokens.create).not.toHaveBeenCalled();
      expect(whatsappSender.send).not.toHaveBeenCalled();
    });

    it('telefone existente: invalida OTP anterior, cria um novo e envia WhatsApp', async () => {
      const { service, tokens, whatsappSender, auditLogs } = serviceWith({
        users: { findByTelefoneHash: jest.fn().mockResolvedValue(baseUser) },
      });

      const result = await service.forgotLogin({ telefone: baseUser.telefone! }, context);

      expect(result).toEqual({ ok: true });
      expect(tokens.deleteAllForUser).toHaveBeenCalledWith(baseUser.id, 'login-otp');
      expect(tokens.create).toHaveBeenCalledWith(expect.objectContaining({ userId: baseUser.id, tipo: 'login-otp' }));
      expect(whatsappSender.send).toHaveBeenCalledTimes(1);
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: AuditEvent.LOGIN_RECOVERY_REQUESTED, userId: baseUser.id }),
      );
    });
  });

  describe('verifyForgotLogin', () => {
    const activeOtp: PasswordRecoveryToken = {
      id: 'otp-1',
      userId: baseUser.id,
      tipo: 'login-otp',
      tokenHash: createHash('sha256').update('123456').digest('hex'),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
    };

    it('telefone não encontrado: erro genérico, audita phone-not-found', async () => {
      const { service, auditLogs } = serviceWith({
        users: { findByTelefoneHash: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.verifyForgotLogin({ telefone: '11900000000', codigo: '123456' }, context),
      ).rejects.toThrow(BadRequestException);
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: AuditEvent.LOGIN_RECOVERY_FAILED, metadata: { reason: 'phone-not-found' } }),
      );
    });

    it('sem código pendente: erro genérico, audita no-pending-code', async () => {
      const { service, auditLogs } = serviceWith({
        users: { findByTelefoneHash: jest.fn().mockResolvedValue(baseUser) },
        tokens: { findActiveByUser: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.verifyForgotLogin({ telefone: baseUser.telefone!, codigo: '123456' }, context),
      ).rejects.toThrow(BadRequestException);
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: AuditEvent.LOGIN_RECOVERY_FAILED, metadata: { reason: 'no-pending-code' } }),
      );
    });

    it('tentativas esgotadas: consome o código e nega mesmo se o código estiver certo', async () => {
      const { service, tokens, auditLogs } = serviceWith({
        users: { findByTelefoneHash: jest.fn().mockResolvedValue(baseUser) },
        tokens: { findActiveByUser: jest.fn().mockResolvedValue({ ...activeOtp, attempts: 5 }) },
      });

      await expect(
        service.verifyForgotLogin({ telefone: baseUser.telefone!, codigo: '123456' }, context),
      ).rejects.toThrow(BadRequestException);
      expect(tokens.consume).toHaveBeenCalledWith(activeOtp.id);
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: AuditEvent.LOGIN_RECOVERY_FAILED, metadata: { reason: 'max-attempts' } }),
      );
    });

    it('código errado: incrementa tentativas e nega, sem consumir o registro', async () => {
      const { service, tokens, auditLogs } = serviceWith({
        users: { findByTelefoneHash: jest.fn().mockResolvedValue(baseUser) },
        tokens: { findActiveByUser: jest.fn().mockResolvedValue(activeOtp) },
      });

      await expect(
        service.verifyForgotLogin({ telefone: baseUser.telefone!, codigo: '000000' }, context),
      ).rejects.toThrow(BadRequestException);
      expect(tokens.incrementAttempts).toHaveBeenCalledWith(activeOtp.id);
      expect(tokens.consume).not.toHaveBeenCalled();
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: AuditEvent.LOGIN_RECOVERY_FAILED, metadata: { reason: 'wrong-code' } }),
      );
    });

    it('código certo: consome o OTP, emite token de reset e mascara o e-mail', async () => {
      const { service, tokens, auditLogs } = serviceWith({
        users: { findByTelefoneHash: jest.fn().mockResolvedValue(baseUser) },
        tokens: { findActiveByUser: jest.fn().mockResolvedValue(activeOtp) },
      });

      const result = await service.verifyForgotLogin({ telefone: baseUser.telefone!, codigo: '123456' }, context);

      expect(tokens.consume).toHaveBeenCalledWith(activeOtp.id);
      expect(result.emailMascarado).toBe('a***@g***.com');
      expect(typeof result.resetToken).toBe('string');
      expect(result.resetToken.length).toBeGreaterThan(20);
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: AuditEvent.LOGIN_RECOVERY_VERIFIED, userId: baseUser.id }),
      );
    });
  });

  describe('rate limiting', () => {
    it('forgotPassword propaga o erro do rate limiter e não chega a criar token', async () => {
      const limitError = new Error('Muitas tentativas.');
      const { service, tokens } = serviceWith({
        users: { findByEmail: jest.fn().mockResolvedValue(baseUser) },
        rateLimiter: { assertAllowed: jest.fn().mockRejectedValue(limitError) },
      });

      await expect(service.forgotPassword({ email: baseUser.email }, context)).rejects.toThrow(limitError);
      expect(tokens.create).not.toHaveBeenCalled();
    });

    it('forgotLogin checa limite por IP e por telefone (2 chaves) antes de seguir', async () => {
      const { service, rateLimiter } = serviceWith({
        users: { findByTelefoneHash: jest.fn().mockResolvedValue(baseUser) },
      });

      await service.forgotLogin({ telefone: baseUser.telefone! }, context);

      expect(rateLimiter.assertAllowed).toHaveBeenCalledTimes(2);
      expect(rateLimiter.assertAllowed).toHaveBeenCalledWith(
        expect.stringContaining('auth:forgot-login:ip:'),
        expect.any(Number),
        expect.any(Number),
      );
      expect(rateLimiter.assertAllowed).toHaveBeenCalledWith(
        expect.stringContaining('auth:forgot-login:id:'),
        expect.any(Number),
        expect.any(Number),
      );
    });
  });
});
