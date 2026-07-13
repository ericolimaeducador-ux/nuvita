import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, Papel, PAPEIS_PROFISSIONAIS } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { TelemedicinaService, RequestAuditContext } from '../application/telemedicina.service';
import { CreateSalaDto } from '../application/dto/create-sala.dto';
import { ListSalasQueryDto } from '../application/dto/list-salas-query.dto';

@Controller('telemedicina')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
export class TelemedicinaController {
  constructor(private readonly telemedicinaService: TelemedicinaService) {}

  @Post('salas')
  @Roles(...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  createSala(@Body() dto: CreateSalaDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.telemedicinaService.createSala(dto, this.ctx(req, user));
  }

  @Get('salas')
  @Roles(...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  listar(
    @Query() query: ListSalasQueryDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.telemedicinaService.listar(query, this.ctx(req, user));
  }

  @Get('salas/agendamento/:agendamentoId')
  @Roles(...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  findByAgendamento(
    @Param('agendamentoId') agendamentoId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.telemedicinaService.findByAgendamento(agendamentoId, clinicaId, this.ctx(req, user));
  }

  @Get('salas/:id')
  @Roles(...PAPEIS_PROFISSIONAIS, Papel.PACIENTE, Papel.ADMIN)
  findById(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.telemedicinaService.findById(id, clinicaId, this.ctx(req, user));
  }

  @Post('salas/:token/entrar')
  @Roles(...PAPEIS_PROFISSIONAIS, Papel.PACIENTE)
  joinSala(@Param('token') token: string, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.telemedicinaService.joinSala(token, this.ctx(req, user));
  }

  @Get('salas/:id/eventos')
  @Roles(...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  listarEventos(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.telemedicinaService.listarEventos(id, clinicaId, this.ctx(req, user));
  }

  @Patch('salas/:id/encerrar')
  @Roles(...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  encerrarSala(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.telemedicinaService.encerrarSala(id, clinicaId, this.ctx(req, user));
  }

  private ctx(req: Request, user: AuthTokenPayload): RequestAuditContext {
    return { ...extractRequestMeta(req), user };
  }
}
