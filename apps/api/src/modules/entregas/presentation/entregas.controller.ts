import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { EntregasService } from '../application/entregas.service';
import { CreateEntregaDto } from '../application/dto/create-entrega.dto';

@Controller('entregas')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class EntregasController {
  constructor(private readonly service: EntregasService) {}

  @Post()
  create(@Body() dto: CreateEntregaDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  listByPaciente(
    @Query('pacienteId') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.listByPaciente(pacienteId, clinicaId, user);
  }

  @Get('processo/:processoId')
  listByProcesso(
    @Param('processoId') processoId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.listByProcesso(processoId, clinicaId, user);
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
  confirmar(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.confirmarEntrega(id, clinicaId, user);
  }
}
