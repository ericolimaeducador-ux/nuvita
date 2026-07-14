import {
  Body,
  Controller,
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
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';
import { AllowWithoutTenant } from '../../../common/tenancy/tenant-required.guard';

// Rate limiting por IP (anti brute-force de senha/TOTP). O padrão do módulo é
// 30 req/min; login e register apertam abaixo. Só as rotas de /auth têm o
// guard — o resto da API segue sem throttling (polling da telemedicina etc.).
@Controller('auth')
@UseGuards(AuthThrottlerGuard)
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
  @UseGuards(JwtAuthGuard)
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
