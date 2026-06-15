import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { AuthTokenPayload } from '../../../../../packages/shared/src/auth';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tenantContext: TenantContextService,
  ) {}

  use(request: Request, _response: Response, next: NextFunction): void {
    const host = request.headers.host?.split(':')[0];
    this.tenantContext.setSubdomain(this.extractSubdomain(host));
    this.tenantContext.setClinicaId(this.extractClinicaIdFromJwt(request));
    next();
  }

  private extractClinicaIdFromJwt(request: Request): string | undefined {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return undefined;

    try {
      const payload = this.jwtService.verify<AuthTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      return payload.clinicaId ?? undefined;
    } catch {
      return undefined;
    }
  }

  private extractSubdomain(host?: string): string | undefined {
    if (!host) return undefined;
    const rootDomain = this.configService.get<string>('APP_ROOT_DOMAIN') ?? 'seuapp.com.br';
    if (!host.endsWith(rootDomain)) return undefined;
    const subdomain = host.slice(0, -rootDomain.length).replace(/\.$/, '');
    return subdomain || undefined;
  }
}
