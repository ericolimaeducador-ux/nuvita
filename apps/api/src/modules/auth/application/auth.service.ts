import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppConfigService } from '../../../common/security/config.service';
import { randomUUID } from 'crypto';
import * as speakeasy from 'speakeasy';
import {
  AuthTokenPayload,
  exigeTwoFactor,
  Papel,
} from '../../../../../../packages/shared/src/auth';
import {
  ACCESS_TOKEN_TTL,
  AUDIT_LOG_REPOSITORY,
  REFRESH_TOKEN_TTL,
  REFRESH_TOKEN_TTL_SECONDS,
  USER_REPOSITORY,
} from '../auth.constants';
import { AuditEvent } from '../domain/audit-event.enum';
import { PublicUser, toPublicUser, User } from '../domain/user.entity';
import { LoginRateLimiterService } from '../infrastructure/redis/login-rate-limiter.service';
import { TokenRevocationService } from '../infrastructure/redis/token-revocation.service';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { AuditLogRepository } from './ports/audit-log.repository';
import { UserRepository } from './ports/user.repository';

export interface RequestContext {
  ip: string;
  userAgent: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: PublicUser;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
    private readonly loginRateLimiter: LoginRateLimiterService,
    private readonly tokenRevocation: TokenRevocationService,
  ) {}

  async register(dto: RegisterUserDto, context: RequestContext): Promise<{
    user: PublicUser;
    twoFactorSetup?: { required: true; otpauthUrl: string; base32: string };
  }> {
    if (!this.configService.getConfig().allowPublicRegistration) {
      throw new ForbiddenException('Registro publico desabilitado neste ambiente.');
    }

    const email = dto.email.toLowerCase();
    const existingUser = await this.users.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email ja cadastrado.');
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      this.configService.getConfig().bcryptRounds,
    );

    const user = await this.users.create({
      nome: dto.nome,
      email,
      passwordHash,
      papel: Papel.PACIENTE,
      clinicaId: null,
    });

    await this.auditLogs.create({
      event: AuditEvent.USER_REGISTERED,
      userId: user.id,
      email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { papel: user.papel, clinicaId: user.clinicaId },
    });

    return {
      user: toPublicUser(user),
    };
  }

  async login(dto: LoginDto, context: RequestContext): Promise<AuthResponse> {
    const email = dto.email.toLowerCase();
    await this.loginRateLimiter.assertAllowed(context.ip);

    const user = await this.users.findByEmailWithSecrets(email);
    if (!user || !user.ativo) {
      await this.recordLoginFailure(email, context, 'INVALID_CREDENTIALS');
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      await this.recordLoginFailure(email, context, 'INVALID_CREDENTIALS', user.id);
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    try {
      this.assertTwoFactorIfRequired(user, dto.totpCode);
    } catch (error) {
      await this.recordLoginFailure(email, context, 'INVALID_2FA', user.id);
      throw error;
    }

    await this.loginRateLimiter.clear(context.ip);
    const tokens = await this.issueTokens(user);

    await this.auditLogs.create({
      event: AuditEvent.LOGIN_SUCCESS,
      userId: user.id,
      email: user.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { papel: user.papel, clinicaId: user.clinicaId },
    });

    return {
      ...tokens,
      user: toPublicUser(user),
    };
  }

  async refresh(refreshToken: string, context: RequestContext): Promise<AuthResponse> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.users.findById(payload.sub);

    if (!user || !user.ativo) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    await this.tokenRevocation.revoke(payload.jti, REFRESH_TOKEN_TTL_SECONDS);
    const tokens = await this.issueTokens(user);

    await this.auditLogs.create({
      event: AuditEvent.TOKEN_REFRESH,
      userId: user.id,
      email: user.email,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return {
      ...tokens,
      user: toPublicUser(user),
    };
  }

  async logout(
    accessPayload: AuthTokenPayload | undefined,
    refreshToken: string | undefined,
    context: RequestContext,
  ): Promise<void> {
    if (accessPayload?.jti) {
      await this.tokenRevocation.revoke(accessPayload.jti, 15 * 60);
    }

    let refreshPayload: AuthTokenPayload | undefined;
    if (refreshToken) {
      try {
        refreshPayload = await this.verifyRefreshToken(refreshToken, false);
        if (refreshPayload?.jti) {
          await this.tokenRevocation.revoke(refreshPayload.jti, REFRESH_TOKEN_TTL_SECONDS);
        }
      } catch {
        refreshPayload = undefined;
      }
    }

    await this.auditLogs.create({
      event: AuditEvent.LOGOUT,
      userId: accessPayload?.sub ?? refreshPayload?.sub,
      email: accessPayload?.email ?? refreshPayload?.email,
      ip: context.ip,
      userAgent: context.userAgent,
    });
  }

  async validateAccessPayload(payload: AuthTokenPayload): Promise<AuthTokenPayload> {
    if (payload.typ !== 'access' || (await this.tokenRevocation.isRevoked(payload.jti))) {
      throw new UnauthorizedException('Token invalido.');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.ativo) {
      throw new UnauthorizedException('Usuario inativo ou inexistente.');
    }

    return payload;
  }

  private assertTwoFactorIfRequired(user: User, token?: string): void {
    if (!exigeTwoFactor(user.papel)) {
      return;
    }

    if (!token || !user.twoFactorSecret) {
      throw new UnauthorizedException('Codigo 2FA obrigatorio.');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      throw new UnauthorizedException('Codigo 2FA invalido.');
    }
  }

  private async recordLoginFailure(
    email: string,
    context: RequestContext,
    reason: string,
    userId?: string,
  ): Promise<void> {
    await this.loginRateLimiter.recordFailure(context.ip);
    await this.auditLogs.create({
      event: AuditEvent.LOGIN_FAILURE,
      userId,
      email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { reason },
    });
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const basePayload = {
      sub: user.id,
      email: user.email,
      papel: user.papel,
      clinicaId: user.clinicaId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...basePayload, jti: accessJti, typ: 'access' } satisfies AuthTokenPayload,
        {
          secret: this.configService.getConfig().jwtAccessSecret,
          expiresIn: ACCESS_TOKEN_TTL,
        },
      ),
      this.jwtService.signAsync(
        { ...basePayload, jti: refreshJti, typ: 'refresh' } satisfies AuthTokenPayload,
        {
          secret: this.configService.getConfig().jwtRefreshSecret,
          expiresIn: REFRESH_TOKEN_TTL,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(
    refreshToken: string,
    failIfRevoked = true,
  ): Promise<AuthTokenPayload> {
    const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(refreshToken, {
      secret: this.configService.getConfig().jwtRefreshSecret,
    });

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    if (failIfRevoked && (await this.tokenRevocation.isRevoked(payload.jti))) {
      throw new UnauthorizedException('Refresh token revogado.');
    }

    return payload;
  }
}
