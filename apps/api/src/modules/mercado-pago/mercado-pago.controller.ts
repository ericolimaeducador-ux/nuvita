import { Body, Controller, Headers, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthThrottlerGuard } from '../auth/presentation/guards/auth-throttler.guard';
import { CriarPreferenciaDto } from './dto/criar-preferencia.dto';
import { MercadoPagoService } from './mercado-pago.service';

/**
 * Rotas PÚBLICAS (o visitante da landing não tem conta): a proteção é o rate limit por IP
 * na criação de preferência e a validação de assinatura + consulta à API no webhook.
 */
@ApiTags('pagamentos')
@Controller('pagamentos')
@UseGuards(AuthThrottlerGuard)
export class MercadoPagoController {
  constructor(private readonly service: MercadoPagoService) {}

  /** Recebe só o id do plano (o preço é decidido no servidor) e devolve o id da preferência. */
  @Post('preferencia')
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  criarPreferencia(@Body() dto: CriarPreferenciaDto) {
    return this.service.criarPreferencia(dto.plano);
  }

  /** Notificação do Mercado Pago. Responde 200 rápido; só falha (5xx) se precisar de retentativa. */
  @Post('webhook')
  @HttpCode(200)
  @SkipThrottle()
  webhook(
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    return this.service.processarWebhook({ query, body, xSignature, xRequestId });
  }
}
