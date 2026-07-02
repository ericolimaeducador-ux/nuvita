import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { LaudoMedicoService } from '../application/laudo-medico.service';
import { CreateLaudoMedicoDto } from '../application/dto/create-laudo-medico.dto';

// Leitura (GET) fica aberta também a ADMIN/SECRETARIA — precisam enxergar o
// pipeline (fluxo clínico) para saber quando agendar o paciente com o médico.
// Mutações (POST) continuam restritas aos profissionais de atendimento.
const LEITURA_PIPELINE = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA];

@Controller('laudo-medico')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
export class LaudoMedicoController {
  constructor(private readonly service: LaudoMedicoService) {}

  @Post()
  @Roles(...PAPEIS_PROFISSIONAIS)
  create(@Body() dto: CreateLaudoMedicoDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(...LEITURA_PIPELINE)
  listByPaciente(
    @Query('pacienteId') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.listByPaciente(pacienteId, clinicaId, user);
  }

  @Get(':id')
  @Roles(...LEITURA_PIPELINE)
  findOne(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.findOne(id, clinicaId, user);
  }

  @Post(':id/assinar')
  @Roles(...PAPEIS_PROFISSIONAIS)
  assinar(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @Query('crm') crmNumero: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.assinar(id, crmNumero, clinicaId, user);
  }
}
