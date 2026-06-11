import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CreateNotificacaoDto } from '../application/dto/create-notificacao.dto';
import { DashboardNotificacoesQueryDto } from '../application/dto/dashboard-query.dto';
import { UpdateOptOutDto } from '../application/dto/update-optout.dto';
import { NotificacaoRequestContext, NotificacoesService } from '../application/notificacoes.service';

@Controller('notificacoes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  @Post()
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  create(
    @Body() dto: CreateNotificacaoDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.notificacoesService.create(dto, this.contextFromRequest(request, user));
  }

  @Get('dashboard')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  dashboard(
    @Query() query: DashboardNotificacoesQueryDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.notificacoesService.dashboard(query, this.contextFromRequest(request, user));
  }

  @Patch('preferencias/:pacienteId/opt-out')
  @Roles(Papel.PACIENTE, Papel.SECRETARIA, Papel.ADMIN)
  updateOptOut(
    @Param('pacienteId') pacienteId: string,
    @Body() dto: UpdateOptOutDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.notificacoesService.updateOptOut(
      pacienteId,
      dto,
      clinicaId,
      this.contextFromRequest(request, user),
    );
  }

  private contextFromRequest(request: Request, user: AuthTokenPayload): NotificacaoRequestContext {
    const forwardedFor = request.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim() || request.ip || 'unknown';

    return {
      ip,
      userAgent: request.headers['user-agent'] ?? 'unknown',
      user,
    };
  }
}
