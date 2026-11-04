import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { CreateEntregaDto } from '../application/dto/create-entrega.dto';
import { EntregaAuditContext, EntregasService } from '../application/entregas.service';

// Entregas de insumo são operadas pela equipe da clínica (enfermeiro, secretaria e admin; SUPER_ADMIN sempre passa).
// PACIENTE não tem acesso. Confirmar a entrega (que pode concluir o fluxo clínico) é mais restrito: ENFERMEIRO e ADMIN.
const EQUIPE_CLINICA = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA];

@Controller('entregas')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(...EQUIPE_CLINICA)
export class EntregasController {
  constructor(private readonly service: EntregasService) {}

  @Post()
  create(@Body() dto: CreateEntregaDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.create(dto, this.contexto(request, user));
  }

  @Get()
  listByPaciente(
    @Query('pacienteId') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.listByPaciente(pacienteId, clinicaId, user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.findOne(id, clinicaId, user);
  }

  @Post(':id/confirmar')
  @Roles(...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  confirmar(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.confirmarEntrega(id, clinicaId, this.contexto(request, user));
  }

  private contexto(request: Request, user: AuthTokenPayload): EntregaAuditContext {
    return { ...extractRequestMeta(request), user };
  }
}
