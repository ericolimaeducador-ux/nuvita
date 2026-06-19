import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { LaudoMedicoService } from '../application/laudo-medico.service';
import { CreateLaudoMedicoDto } from '../application/dto/create-laudo-medico.dto';

@Controller('laudo-medico')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
@Roles(...PAPEIS_PROFISSIONAIS)
export class LaudoMedicoController {
  constructor(private readonly service: LaudoMedicoService) {}

  @Post()
  create(@Body() dto: CreateLaudoMedicoDto, @CurrentUser() user: AuthTokenPayload) {
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

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.findOne(id, clinicaId, user);
  }

  @Post(':id/assinar')
  assinar(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @Query('crm') crmNumero: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.assinar(id, crmNumero, clinicaId, user);
  }
}
