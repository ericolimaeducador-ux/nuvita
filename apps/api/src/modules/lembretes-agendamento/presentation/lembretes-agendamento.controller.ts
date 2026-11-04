import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { LembretesAgendamentoProcessorService } from '../application/lembretes-agendamento-processor.service';
import { ProcessarLembretesResponseDto } from '../application/dto/processar-lembretes-response.dto';
import { OidcSchedulerGuardAdapter } from './guards/oidc-scheduler-guard.adapter';

/**
 * feature-consultation-reminder-scheduler: único ponto de entrada externo
 * desta feature, acionado pelo Cloud Scheduler a cada 15 minutos.
 * OidcSchedulerGuardAdapter é a ÚNICA proteção real (o Cloud Run do
 * serviço já permite allUsers em roles/run.invoker — ver Rollback
 * Strategy item 3 do design doc). Lógica real delegada a
 * LembretesAgendamentoProcessorService — o controller não reimplementa
 * nenhuma das contagens attempted/sent/deduped/failed.
 */
@Controller('internal')
export class LembretesAgendamentoController {
  constructor(private readonly processor: LembretesAgendamentoProcessorService) {}

  @Post('processar-lembretes')
  @UseGuards(OidcSchedulerGuardAdapter)
  @HttpCode(200)
  processarLembretes(): Promise<ProcessarLembretesResponseDto> {
    return this.processor.processar();
  }
}
