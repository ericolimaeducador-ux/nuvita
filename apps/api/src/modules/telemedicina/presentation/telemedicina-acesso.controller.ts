import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { TelemedicinaService } from '../application/telemedicina.service';
import { EnviarSinalDto } from '../application/dto/enviar-sinal.dto';
import { RegistrarEventoDto } from '../application/dto/registrar-evento.dto';

/**
 * Acesso à sala SEM login: o token UUID (entregue ao paciente por link fora de
 * banda) é a credencial. Nada aqui expõe dados pessoais — só estado da sala,
 * sinalização WebRTC opaca e o registro de eventos do atendimento.
 */
@Controller('telemedicina/acesso')
export class TelemedicinaAcessoController {
  constructor(private readonly telemedicinaService: TelemedicinaService) {}

  @Get(':token')
  acessar(@Param('token') token: string) {
    return this.telemedicinaService.acessarPorToken(token);
  }

  @Post(':token/entrar')
  entrar(@Param('token') token: string, @Req() req: Request) {
    return this.telemedicinaService.entrarPorToken(token, extractRequestMeta(req));
  }

  @Post(':token/sinais')
  enviarSinal(@Param('token') token: string, @Body() dto: EnviarSinalDto) {
    return this.telemedicinaService.enviarSinal(token, dto);
  }

  @Get(':token/sinais')
  listarSinais(@Param('token') token: string, @Query('after') after?: string) {
    return this.telemedicinaService.listarSinais(token, after);
  }

  @Post(':token/eventos')
  registrarEvento(@Param('token') token: string, @Body() dto: RegistrarEventoDto, @Req() req: Request) {
    return this.telemedicinaService.registrarEventoPorToken(token, dto, extractRequestMeta(req));
  }
}
