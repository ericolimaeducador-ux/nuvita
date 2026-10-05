import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { AtenderTicketDto } from '../application/dto/atender-ticket.dto';
import { CriarTicketDto } from '../application/dto/criar-ticket.dto';
import { RecusarTicketDto } from '../application/dto/recusar-ticket.dto';
import { TicketRequestContext, TicketsService } from '../application/tickets.service';

const PAPEIS_QUE_ABREM = [Papel.SECRETARIA, ...PAPEIS_PROFISSIONAIS, Papel.ADMIN];

@Controller('tickets')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  @Roles(...PAPEIS_QUE_ABREM)
  abrir(@Body() dto: CriarTicketDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.tickets.abrir(dto, undefined, this.contexto(request, user));
  }

  // Fila do SUPER_ADMIN (clínica escolhida via x-clinica-id).
  @Get()
  @Roles(Papel.SUPER_ADMIN)
  listarAbertos(@CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.tickets.listarAbertos(undefined, this.contexto(request, user));
  }

  // Declarada ANTES das rotas com ':id' para não ser engolida por elas.
  @Get('paciente/:pacienteId')
  @Roles(...PAPEIS_QUE_ABREM, Papel.SUPER_ADMIN)
  listarPorPaciente(
    @Param('pacienteId') pacienteId: string,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.tickets.listarPorPaciente(pacienteId, undefined, this.contexto(request, user));
  }

  @Post(':id/atender')
  @Roles(Papel.SUPER_ADMIN)
  atender(
    @Param('id') ticketId: string,
    @Body() dto: AtenderTicketDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.tickets.atender(ticketId, dto, undefined, this.contexto(request, user));
  }

  @Post(':id/recusar')
  @Roles(Papel.SUPER_ADMIN)
  recusar(
    @Param('id') ticketId: string,
    @Body() dto: RecusarTicketDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.tickets.recusar(ticketId, dto, undefined, this.contexto(request, user));
  }

  private contexto(request: Request, user: AuthTokenPayload): TicketRequestContext {
    return { ...extractRequestMeta(request), user };
  }
}
