import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

/** Comparação em tempo constante. Tamanhos diferentes não lançam. */
export function pinsCoincidem(informado: string, esperado: string): boolean {
  const a = Buffer.from(informado);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * PIN compartilhado dos enfermeiros de campo. Vale só no POST público.
 * A listagem e a exportação do painel usam o login normal do Nuvita.
 */
@Injectable()
export class CaptadorPinGuard implements CanActivate {
  private readonly logger = new Logger(CaptadorPinGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['x-captador-pin'];
    const informado = Array.isArray(header) ? header[0] : header;
    const esperado = this.pinEsperado();

    if (!esperado) {
      this.logger.error('PIN_CAPTADOR não configurado. Captação pública recusada.');
      throw new UnauthorizedException('Acesso não autorizado. PIN inválido.');
    }

    if (!informado || !pinsCoincidem(informado, esperado)) {
      throw new UnauthorizedException('Acesso não autorizado. PIN inválido.');
    }

    return true;
  }

  private pinEsperado(): string | null {
    const configured = this.config.get<string>('PIN_CAPTADOR')?.trim();
    if (configured) return configured;
    // Sem PIN configurado, só desenvolvimento/teste local usa o PIN de desenvolvimento. Qualquer outro ambiente (inclusive
    // NODE_ENV ausente ou desconhecido) FALHA FECHADO: a captação pública é recusada.
    const nodeEnv = this.config.get<string>('NODE_ENV');
    if (nodeEnv === 'development' || nodeEnv === 'test') return '123456';
    return null;
  }
}
