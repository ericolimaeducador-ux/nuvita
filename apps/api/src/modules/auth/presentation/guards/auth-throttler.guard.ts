import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { extractClientIp } from '../../../../common/http/client-ip';

/**
 * Rate limiting das rotas de autenticação (anti brute-force de senha/TOTP).
 * Usa o mesmo extractClientIp da auditoria — a ÚLTIMA entrada de
 * X-Forwarded-For, anexada pelo proxy confiável (Cloud Run/nginx) — em vez do
 * req.ip cru, que atrás do balanceador seria o mesmo para todos os usuários
 * e faria um único limite global em produção.
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    return Promise.resolve(extractClientIp(req));
  }
}
