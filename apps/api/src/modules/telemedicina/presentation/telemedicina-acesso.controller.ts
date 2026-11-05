import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { TelemedicinaService } from '../application/telemedicina.service';
import { EnviarSinalDto } from '../application/dto/enviar-sinal.dto';
import { RegistrarEventoDto } from '../application/dto/registrar-evento.dto';

/**
 * Acesso à sala SEM login: o token UUID (entregue ao paciente por link fora de
 * banda) é a credencial. Nada aqui expõe dados pessoais — só estado da sala,
 * sinalização WebRTC opaca e o registro de eventos do atendimento.
 *
 * Estas são as ÚNICAS rotas públicas e sem autenticação da API além do
 * /health, então cada uma leva um limite explícito. O token é UUIDv4 (122 bits
 * de entropia), o que torna a enumeração inviável — o risco aqui é abuso de
 * recurso (CPU e custo de Cloud Run, crescimento indefinido das collections de
 * sinais/eventos), não acesso indevido à sala. Os limites abaixo são
 * calibrados pelo consumo real do SalaVideo.tsx, não por chute.
 */
@Controller('telemedicina/acesso')
export class TelemedicinaAcessoController {
  constructor(private readonly telemedicinaService: TelemedicinaService) {}

  // Chamado uma vez ao abrir o link. 20/min já cobre reload insistente.
  @Get(':token')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  acessar(@Param('token') token: string) {
    return this.telemedicinaService.acessarPorToken(token);
  }

  // Entrada na sala: uma vez por sessão, mais as reentradas por queda de rede.
  @Post(':token/entrar')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  entrar(@Param('token') token: string, @Req() req: Request) {
    return this.telemedicinaService.entrarPorToken(token, extractRequestMeta(req));
  }

  // Escrita de sinalização WebRTC: rajada curta e intensa na negociação
  // (offer/answer + um candidate ICE por interface de rede), depois silêncio.
  // 120/min absorve a rajada e ainda barra escrita contínua na collection.
  @Post(':token/sinais')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  enviarSinal(@Param('token') token: string, @Body() dto: EnviarSinalDto) {
    return this.telemedicinaService.enviarSinal(token, dto);
  }

  // A rota de polling: SalaVideo.tsx consulta a cada 1200ms => 50 req/min por
  // participante. 150/min dá margem de 3x (dois participantes atrás do mesmo
  // IP, mais reconexões) sem deixar um loop de retry desgovernado passar.
  @Get(':token/sinais')
  @Throttle({ default: { ttl: 60_000, limit: 150 } })
  listarSinais(@Param('token') token: string, @Query('after') after?: string) {
    return this.telemedicinaService.listarSinais(token, after);
  }

  // Eventos do atendimento (entrou, saiu, encerrou): poucos por sessão.
  @Post(':token/eventos')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  registrarEvento(@Param('token') token: string, @Body() dto: RegistrarEventoDto, @Req() req: Request) {
    return this.telemedicinaService.registrarEventoPorToken(token, dto, extractRequestMeta(req));
  }
}
