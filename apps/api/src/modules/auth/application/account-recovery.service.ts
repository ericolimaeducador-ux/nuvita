import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'crypto';
import { AppConfigService } from '../../../common/security/config.service';
import { hashToken } from '../../../common/security/hash-token.util';
import { normalizePhone, phoneHash } from '../../../common/security/phone-crypto.util';
import { RedisRateLimiterService } from '../../../common/security/redis-rate-limiter.service';
import { CanalNotificacao } from '../../notificacoes/domain/notificacao.entity';
import { EmailSender } from '../../notificacoes/infrastructure/senders/email.sender';
import { WhatsAppSender } from '../../notificacoes/infrastructure/senders/whatsapp.sender';
import {
  AUDIT_LOG_REPOSITORY,
  LOGIN_OTP_MAX_ATTEMPTS,
  LOGIN_OTP_TTL_SECONDS,
  PASSWORD_RECOVERY_TOKEN_REPOSITORY,
  RECOVERY_RATE_LIMIT_MAX_PER_IDENTIFIER,
  RECOVERY_RATE_LIMIT_MAX_PER_IP,
  RECOVERY_RATE_LIMIT_WINDOW_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  RESET_TOKEN_TTL_SECONDS,
  USER_REPOSITORY,
} from '../auth.constants';
import { AuditEvent } from '../domain/audit-event.enum';
import { TokenRevocationService } from '../infrastructure/redis/token-revocation.service';
import { ForgotLoginDto } from './dto/forgot-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyForgotLoginDto } from './dto/verify-forgot-login.dto';
import { AuditLogRepository } from './ports/audit-log.repository';
import { PasswordRecoveryTokenRepository } from './ports/password-recovery-token.repository';
import { UserRepository } from './ports/user.repository';
import { RequestContext } from './auth.service';

export interface VerifyForgotLoginResult {
  emailMascarado: string;
  resetToken: string;
}

@Injectable()
export class AccountRecoveryService {
  private readonly logger = new Logger(AccountRecoveryService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_RECOVERY_TOKEN_REPOSITORY) private readonly tokens: PasswordRecoveryTokenRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly configService: AppConfigService,
    private readonly rateLimiter: RedisRateLimiterService,
    private readonly tokenRevocation: TokenRevocationService,
    private readonly emailSender: EmailSender,
    private readonly whatsappSender: WhatsAppSender,
  ) {}

  async forgotPassword(dto: ForgotPasswordDto, context: RequestContext): Promise<{ ok: true }> {
    const email = dto.email.toLowerCase();
    await this.assertRecoveryRateLimit('forgot-password', context.ip, email);

    const user = await this.users.findByEmail(email);
    if (user && user.ativo) {
      const token = await this.issueResetToken(user.id);
      this.sendResetEmail(user.email, token);
      await this.auditLogs.create({
        event: AuditEvent.PASSWORD_RESET_REQUESTED,
        userId: user.id,
        email: user.email,
        ip: context.ip,
        userAgent: context.userAgent,
      });
    }

    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto, context: RequestContext): Promise<{ ok: true }> {
    const tokenHash = hashToken(dto.token);
    const record = await this.tokens.findByTokenHash(tokenHash);

    if (!record || record.tipo !== 'reset' || record.expiresAt.getTime() < Date.now()) {
      await this.auditLogs.create({
        event: AuditEvent.PASSWORD_RESET_FAILED,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { reason: 'invalid-or-expired-token' },
      });
      throw new BadRequestException('Link inválido ou expirado.');
    }

    const passwordHash = await bcrypt.hash(dto.novaSenha, this.configService.getConfig().bcryptRounds);
    await this.users.update(record.userId, { passwordHash });
    await this.tokens.consume(record.id);
    await this.tokenRevocation.revokeAllForUser(record.userId, REFRESH_TOKEN_TTL_SECONDS);

    await this.auditLogs.create({
      event: AuditEvent.PASSWORD_RESET_COMPLETED,
      userId: record.userId,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return { ok: true };
  }

  async forgotLogin(dto: ForgotLoginDto, context: RequestContext): Promise<{ ok: true }> {
    const telefoneHash = phoneHash(dto.telefone, this.configService);
    await this.assertRecoveryRateLimit('forgot-login', context.ip, telefoneHash);

    const user = await this.users.findByTelefoneHash(telefoneHash);
    if (user && user.ativo) {
      await this.tokens.deleteAllForUser(user.id, 'login-otp');
      const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
      await this.tokens.create({
        userId: user.id,
        tipo: 'login-otp',
        tokenHash: hashToken(codigo),
        expiresAt: new Date(Date.now() + LOGIN_OTP_TTL_SECONDS * 1000),
      });
      this.sendOtpWhatsapp(user.telefone ?? dto.telefone, codigo);
      await this.auditLogs.create({
        event: AuditEvent.LOGIN_RECOVERY_REQUESTED,
        userId: user.id,
        ip: context.ip,
        userAgent: context.userAgent,
      });
    }

    return { ok: true };
  }

  async verifyForgotLogin(dto: VerifyForgotLoginDto, context: RequestContext): Promise<VerifyForgotLoginResult> {
    const telefoneHash = phoneHash(dto.telefone, this.configService);
    const user = await this.users.findByTelefoneHash(telefoneHash);
    const invalid = () => {
      throw new BadRequestException('Código inválido ou expirado.');
    };

    if (!user) {
      await this.auditLogs.create({
        event: AuditEvent.LOGIN_RECOVERY_FAILED,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { reason: 'phone-not-found' },
      });
      return invalid();
    }

    const record = await this.tokens.findActiveByUser(user.id, 'login-otp');
    if (!record) {
      await this.auditLogs.create({
        event: AuditEvent.LOGIN_RECOVERY_FAILED,
        userId: user.id,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { reason: 'no-pending-code' },
      });
      return invalid();
    }

    if (record.attempts >= LOGIN_OTP_MAX_ATTEMPTS) {
      await this.tokens.consume(record.id);
      await this.auditLogs.create({
        event: AuditEvent.LOGIN_RECOVERY_FAILED,
        userId: user.id,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { reason: 'max-attempts' },
      });
      return invalid();
    }

    if (record.tokenHash !== hashToken(dto.codigo)) {
      await this.tokens.incrementAttempts(record.id);
      await this.auditLogs.create({
        event: AuditEvent.LOGIN_RECOVERY_FAILED,
        userId: user.id,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { reason: 'wrong-code' },
      });
      return invalid();
    }

    await this.tokens.consume(record.id);
    const resetToken = await this.issueResetToken(user.id);

    await this.auditLogs.create({
      event: AuditEvent.LOGIN_RECOVERY_VERIFIED,
      userId: user.id,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return { emailMascarado: this.maskEmail(user.email), resetToken };
  }

  private async issueResetToken(userId: string): Promise<string> {
    await this.tokens.deleteAllForUser(userId, 'reset');
    const token = randomBytes(32).toString('base64url');
    await this.tokens.create({
      userId,
      tipo: 'reset',
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000),
    });
    return token;
  }

  /** `andreia.administcomercial@gmail.com` -> `a***@g***.com` */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    const domainParts = domain.split('.');
    const maskedDomain = domainParts
      .map((part, i) => (i === domainParts.length - 1 ? part : `${part[0]}***`))
      .join('.');
    return `${local[0]}***@${maskedDomain}`;
  }

  private frontendBaseUrl(): string {
    const config = this.configService.getConfig();
    return config.nodeEnv === 'production' ? `https://www.${config.appRootDomain}` : 'http://localhost:5173';
  }

  // Envio em fire-and-forget: a resposta do endpoint não espera a rede do
  // Resend/Z-API, então o tempo de resposta não denuncia se o e-mail/telefone
  // existe ou não (proteção contra enumeração).
  private sendResetEmail(email: string, token: string): void {
    const link = `${this.frontendBaseUrl()}/redefinir-senha?token=${token}`;
    const mensagem =
      'Olá,\n\n' +
      'Recebemos uma solicitação para redefinir a senha da sua conta Nuvita.\n\n' +
      `Para criar uma nova senha, acesse o link abaixo (válido por 1 hora):\n${link}\n\n` +
      'Se você não solicitou essa alteração, ignore este e-mail — sua senha permanece a mesma.\n\n' +
      'Equipe Nuvita';

    this.emailSender
      .send({
        canal: CanalNotificacao.EMAIL,
        conteudo: { assunto: 'Redefinição de senha — Nuvita', mensagem, destino: email },
      })
      .catch((err) => this.logger.error(`Falha ao enviar e-mail de reset de senha: ${(err as Error).message}`));
  }

  private sendOtpWhatsapp(telefone: string, codigo: string): void {
    const mensagem = `Nuvita: seu código de verificação é ${codigo}. Válido por 10 minutos. Não compartilhe este código com ninguém.`;

    this.whatsappSender
      .send({ canal: CanalNotificacao.WHATSAPP, conteudo: { mensagem, destino: normalizePhone(telefone) } })
      .catch((err) => this.logger.error(`Falha ao enviar codigo de recuperacao por WhatsApp: ${(err as Error).message}`));
  }

  private async assertRecoveryRateLimit(prefix: string, ip: string, identifier: string): Promise<void> {
    const ipKey = `auth:${prefix}:ip:${ip}`;
    const idKey = `auth:${prefix}:id:${hashToken(identifier)}`;

    await this.rateLimiter.assertAllowed(ipKey, RECOVERY_RATE_LIMIT_MAX_PER_IP, RECOVERY_RATE_LIMIT_WINDOW_SECONDS);
    await this.rateLimiter.assertAllowed(
      idKey,
      RECOVERY_RATE_LIMIT_MAX_PER_IDENTIFIER,
      RECOVERY_RATE_LIMIT_WINDOW_SECONDS,
    );
    await this.rateLimiter.recordAttempt(ipKey, RECOVERY_RATE_LIMIT_WINDOW_SECONDS);
    await this.rateLimiter.recordAttempt(idKey, RECOVERY_RATE_LIMIT_WINDOW_SECONDS);
  }
}
