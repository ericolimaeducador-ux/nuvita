import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, Papel, PAPEIS_PROFISSIONAIS } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { AgendamentosService, RequestAuditContext } from '../application/agendamentos.service';
import { CancelAgendamentoDto } from '../application/dto/cancel-agendamento.dto';
import { CreateAgendamentoDto } from '../application/dto/create-agendamento.dto';
import { CreateBloqueioDto } from '../application/dto/create-bloqueio.dto';
import { ListAgendamentosQueryDto } from '../application/dto/list-agendamentos-query.dto';
import { ListBloqueiosQueryDto } from '../application/dto/list-bloqueios-query.dto';
import { UpdateAgendamentoDto } from '../application/dto/update-agendamento.dto';

@Controller('agendamentos')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
export class AgendamentosController {
  constructor(private readonly agendamentosService: AgendamentosService) {}

  @Post()
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  create(@Body() dto: CreateAgendamentoDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.agendamentosService.create(dto, this.ctx(req, user));
  }

  @Get()
  @Roles(Papel.SECRETARIA, ...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  list(@Query() query: ListAgendamentosQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.agendamentosService.list(query, this.ctx(req, user));
  }

  @Get('bloqueios')
  @Roles(...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA)
  listBloqueios(@Query() query: ListBloqueiosQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.agendamentosService.listBloqueios(query, this.ctx(req, user));
  }

  @Post('bloqueios')
  @Roles(...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  createBloqueio(@Body() dto: CreateBloqueioDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.agendamentosService.createBloqueio(dto, this.ctx(req, user));
  }

  @Delete('bloqueios/:id')
  @Roles(...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  deleteBloqueio(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.agendamentosService.deleteBloqueio(id, clinicaId, this.ctx(req, user));
  }

  @Get(':id')
  @Roles(Papel.SECRETARIA, ...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  findOne(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.agendamentosService.findOne(id, clinicaId, this.ctx(req, user));
  }

  @Patch(':id')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAgendamentoDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.agendamentosService.update(id, dto, clinicaId, this.ctx(req, user));
  }

  @Patch(':id/cancelar')
  @Roles(Papel.SECRETARIA, Papel.ADMIN, Papel.PACIENTE)
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelAgendamentoDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.agendamentosService.cancel(id, dto, clinicaId, this.ctx(req, user));
  }

  @Patch(':id/concluir')
  @Roles(Papel.SECRETARIA, ...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  conclude(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.agendamentosService.conclude(id, clinicaId, this.ctx(req, user));
  }

  private ctx(req: Request, user: AuthTokenPayload): RequestAuditContext {
    return { ...extractRequestMeta(req), user };
  }
}
