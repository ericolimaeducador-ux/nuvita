import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
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
import { TERMOS_DE_USO_VERSAO_ATUAL } from '../../../../../../packages/shared/src/termos';
import {
  ACCESS_TOKEN_TTL,
  AUDIT_LOG_REPOSITORY,
  REFRESH_TOKEN_TTL,
  REFRESH_TOKEN_TTL_SECONDS,
  USER_REPOSITORY,
} from '../auth.constants';
import { AuditEvent } from '../domain/audit-event.enum';
import { AuthenticatedUser } from '../domain/authenticated-user';
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
  private readonly logger = new Logger(AuthService.name);

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
    await this.loginRateLimiter.assertAllowed(context.ip, email);

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

    // Zera só o par (ip, conta) que logou: o histórico de falhas de OUTRAS contas
    // no mesmo IP (NAT, atacante) não pode ser apagado por um acerto.
    await this.loginRateLimiter.clear(context.ip, email);
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

    this.assertTokenNotStale(payload, user.tokensValidosApartirDe);

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

  /**
   * Registra o aceite dos Termos de Uso do PSICOLOGO (feature-terms-of-service-acceptance).
   * Endpoint isento do gate (@GateExempt), senão o usuário travaria: não pode
   * aceitar porque aceitar está bloqueado pelo próprio gate de termos.
   *
   * Idempotente para a mesma versão: reenviar não regrava nem re-audita.
   */
  async aceitarTermos(
    userId: string,
    versao: string,
    context: RequestContext,
  ): Promise<{ user: PublicUser }> {
    if (versao !== TERMOS_DE_USO_VERSAO_ATUAL) {
      if (!TERMOS_DE_USO_VERSAO_ATUAL) {
        // Constante compartilhada vazia no runtime (build quebrado): o gate não
        // tem versão vigente para validar. Fail-closed — ninguém aceita nada.
        this.logEventoObservabilidade('error', {
          msg: 'Versao vigente dos Termos de Uso indisponivel no runtime.',
          event: 'terms_source_unavailable',
          userId,
        });
        throw new ServiceUnavailableException('Termos de Uso indisponiveis no momento.');
      }
      this.logEventoObservabilidade('warn', {
        msg: 'Aceite de Termos rejeitado: versao invalida ou desatualizada.',
        event: 'gate_endpoint_4xx',
        status: 400,
        gate: 'terms',
        userId,
      });
      throw new BadRequestException('Versao dos Termos de Uso invalida ou desatualizada.');
    }

    const user = await this.users.findById(userId);
    if (!user || !user.ativo) {
      throw new UnauthorizedException('Usuario inativo ou inexistente.');
    }

    if (user.termosAceitos?.versao === versao) {
      return { user: toPublicUser(user) };
    }

    const updated = await this.persistirEstadoDoGate(
      'terms',
      userId,
      () => this.users.update(userId, { termosAceitos: { versao, dataAceite: new Date() } }),
    );
    if (!updated) {
      throw new UnauthorizedException('Usuario inativo ou inexistente.');
    }

    await this.auditLogs.create({
      event: AuditEvent.TERMS_ACCEPTED,
      userId: updated.id,
      email: updated.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { versao },
    });

    return { user: toPublicUser(updated) };
  }

  /**
   * Conclui a troca de senha obrigatória do primeiro login
   * (feature-forced-password-change). Válido só enquanto `deveTrocarSenha` é
   * true; não é um "trocar minha senha" genérico (esse não passa por aqui e
   * exigiria a senha atual). Endpoint isento do gate (@GateExempt).
   */
  async trocarSenhaObrigatoria(
    userId: string,
    novaSenha: string,
    context: RequestContext,
  ): Promise<{ user: PublicUser }> {
    const user = await this.users.findById(userId);
    if (!user || !user.ativo) {
      throw new UnauthorizedException('Usuario inativo ou inexistente.');
    }

    if (!user.deveTrocarSenha) {
      this.logEventoObservabilidade('warn', {
        msg: 'Troca de senha obrigatoria rejeitada: nao ha troca pendente para a conta.',
        event: 'gate_endpoint_4xx',
        status: 409,
        gate: 'password',
        userId,
      });
      throw new ConflictException('Nao ha troca de senha obrigatoria pendente para esta conta.');
    }

    const passwordHash = await bcrypt.hash(novaSenha, this.configService.getConfig().bcryptRounds);
    const updated = await this.persistirEstadoDoGate('password', userId, () =>
      this.users.update(userId, {
        passwordHash,
        deveTrocarSenha: false,
        tokensValidosApartirDe: new Date(),
      }),
    );
    if (!updated) {
      throw new UnauthorizedException('Usuario inativo ou inexistente.');
    }

    await this.auditLogs.create({
      event: AuditEvent.FORCED_PASSWORD_CHANGED,
      userId: updated.id,
      email: updated.email,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return { user: toPublicUser(updated) };
  }

  /**
   * Persiste a mudança de estado de um gate pós-login (aceite de termos ou
   * troca de senha obrigatória). Se a escrita lançar, emite
   * `auth_gate_persist_failure` (§11 do TDD — o usuário completou o gate mas
   * ficou preso nele) e re-lança.
   */
  private async persistirEstadoDoGate<T>(
    gate: 'terms' | 'password',
    userId: string,
    persist: () => Promise<T>,
  ): Promise<T> {
    try {
      return await persist();
    } catch (error) {
      this.logEventoObservabilidade('error', {
        msg: 'Falha ao persistir a conclusao de um gate pos-login.',
        event: 'auth_gate_persist_failure',
        gate,
        userId,
      });
      throw error;
    }
  }

  /**
   * Observabilidade (§11 do TDD): sem lib de métricas — log estruturado, JSON
   * numa linha, só ids/enums. Nunca senha, senha nova, segredo 2FA nem texto
   * dos Termos.
   */
  private logEventoObservabilidade(
    level: 'error' | 'warn',
    payload: Record<string, unknown>,
  ): void {
    this.logger[level](JSON.stringify({ level, ...payload }));
  }

  async validateAccessPayload(payload: AuthTokenPayload): Promise<AuthenticatedUser> {
    if (payload.typ !== 'access' || (await this.tokenRevocation.isRevoked(payload.jti))) {
      throw new UnauthorizedException('Token invalido.');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.ativo) {
      throw new UnauthorizedException('Usuario inativo ou inexistente.');
    }

    this.assertTokenNotStale(payload, user.tokensValidosApartirDe);

    // Enriquece request.user com o estado de conta que o AuthGatesGuard avalia
    // (mesmo findById acima — sem round-trip extra).
    return {
      ...payload,
      deveTrocarSenha: user.deveTrocarSenha ?? false,
      termosAceitos: user.termosAceitos ?? null,
    };
  }

  /**
   * Revogação de sessão na troca de senha (feature-session-revocation-on-password-change).
   * tokensValidosApartirDe ausente/null = nenhuma troca de senha jamais invalidou
   * sessões deste usuário → NUNCA rejeitar nesse caso, é o critério de aceite
   * mais sensível desta feature.
   */
  private assertTokenNotStale(
    payload: AuthTokenPayload,
    tokensValidosApartirDe: Date | null | undefined,
  ): void {
    if (!tokensValidosApartirDe) {
      return;
    }

    const iatMs = payload.iat != null ? payload.iat * 1000 : undefined;
    if (iatMs === undefined || iatMs < tokensValidosApartirDe.getTime()) {
      this.logEventoObservabilidade('warn', {
        msg: 'Token rejeitado: emitido antes da ultima troca de senha do usuario.',
        event: 'token_rejected_stale_session',
        userId: payload.sub,
        typ: payload.typ,
      });
      throw new UnauthorizedException('Token invalido.');
    }
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
    await this.loginRateLimiter.recordFailure(context.ip, email);
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
      nome: user.nome,
      registroProfissional: user.registroProfissional,
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
