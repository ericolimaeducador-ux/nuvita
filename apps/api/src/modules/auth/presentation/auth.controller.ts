import {
  Body,
  Controller,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { AuthService, AuthTokens, RequestContext } from '../application/auth.service';
import { LoginDto } from '../application/dto/login.dto';
import { RegisterUserDto } from '../application/dto/register-user.dto';
import {
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../auth.constants';
import { AceitarTermosDto } from '../application/dto/aceitar-termos.dto';
import { AtualizarPerfilDto } from '../application/dto/atualizar-perfil.dto';
import { TrocarSenhaObrigatoriaDto } from '../application/dto/trocar-senha-obrigatoria.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { GateExempt } from './decorators/gate-exempt.decorator';
import { AuthGatesGuard } from './guards/auth-gates.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AllowWithoutTenant } from '../../../common/tenancy/tenant-required.guard';

// Rate limiting por IP (anti brute-force de senha/TOTP). O guard é global
// (GlobalThrottlerGuard, registrado como APP_GUARD no AppModule) e usa o mesmo
// tracker por X-Forwarded-For; aqui só apertamos o limite bem abaixo do teto
// padrão de 300/min nas rotas que aceitam credencial.
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @AllowWithoutTenant()
  async register(@Body() dto: RegisterUserDto, @Req() request: Request) {
    return this.authService.register(dto, this.contextFromRequest(request));
  }

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @AllowWithoutTenant()
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto, this.contextFromRequest(request));
    this.setRefreshCookie(response, result);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token ausente.');
    }

    const result = await this.authService.refresh(refreshToken, this.contextFromRequest(request));
    this.setRefreshCookie(response, result);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, AuthGatesGuard)
  @GateExempt()
  async logout(
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(
      user,
      request.cookies?.[REFRESH_TOKEN_COOKIE],
      this.contextFromRequest(request),
    );

    response.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/auth' });
    return { ok: true };
  }

  // Isento do gate (@GateExempt): é justamente o endpoint que resolve o gate
  // de termos — sem a isenção, um ENFERMEIRO com termos pendentes nunca
  // conseguiria aceitá-los (deadlock). Ver §2.6/§9 do TDD.
  @Post('aceitar-termos')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @UseGuards(JwtAuthGuard, AuthGatesGuard)
  @GateExempt()
  @AllowWithoutTenant()
  async aceitarTermos(
    @Body() dto: AceitarTermosDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.authService.aceitarTermos(user.sub, dto.versao, this.contextFromRequest(request));
  }

  // Isento do gate (@GateExempt): é o endpoint que resolve o gate de troca de
  // senha obrigatória — sem a isenção, quem tem `deveTrocarSenha` nunca
  // conseguiria trocá-la (deadlock). Ver §2.6/§9 do TDD.
  @Post('trocar-senha-obrigatoria')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(JwtAuthGuard, AuthGatesGuard)
  @GateExempt()
  @AllowWithoutTenant()
  async trocarSenhaObrigatoria(
    @Body() dto: TrocarSenhaObrigatoriaDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.authService.trocarSenhaObrigatoria(
      user.sub,
      dto.novaSenha,
      this.contextFromRequest(request),
    );
  }

  // O profissional grava o PRÓPRIO COREN (uma vez). O id vem do token; o corpo só aceita `coren`.
  @Patch('me')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @UseGuards(JwtAuthGuard, AuthGatesGuard)
  @AllowWithoutTenant()
  async atualizarPerfil(
    @Body() dto: AtualizarPerfilDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.authService.atualizarMeuCoren(user.sub, dto.coren, this.contextFromRequest(request));
  }

  private setRefreshCookie(response: Response, tokens: AuthTokens): void {
    response.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth',
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
    });
  }

  private contextFromRequest(request: Request): RequestContext {
    return {
      ...extractRequestMeta(request),
    };
  }
}
