import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { extractClientIp } from './client-ip';

/**
 * Guard de throttling aplicado GLOBALMENTE (via APP_GUARD no AppModule).
 *
 * Antes existiam dois guards de throttling declarados manualmente em dois
 * controllers (auth e ia-clinica); todo o resto da API — incluindo as rotas
 * públicas e sem autenticação de `telemedicina/acesso` — rodava sem limite
 * nenhum. Como guard global, o limite padrão passa a valer para toda rota, e
 * cada controller só precisa de `@Throttle()` quando quer apertar ou afrouxar.
 *
 * O tracker é o `extractClientIp` — a ÚLTIMA entrada de X-Forwarded-For, a
 * anexada pelo proxy confiável — e não o `req.ip` cru, que é controlado pelo
 * cliente e permitiria escapar do limite trocando o header.
 *
 * Limitação conhecida: o storage padrão do @nestjs/throttler é em memória, ou
 * seja, o limite vale POR INSTÂNCIA do Cloud Run. Com N instâncias o teto
 * efetivo é N × limite. Isso ainda protege a CPU de cada instância (que é o
 * risco do polling da telemedicina), mas não é um limite global exato. Para
 * limite global seria preciso um storage compartilhado no Redis — ver
 * infra/PRODUCTION-BACKEND.md, seção 6.
 */
@Injectable()
export class GlobalThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    return Promise.resolve(extractClientIp(req));
  }
}
