import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { ObservacoesPacienteService } from '../application/observacoes-paciente.service';
import { CreateObservacaoPacienteDto } from '../application/dto/create-observacao-paciente.dto';

// Mesma abertura do antigo PATCH /pacientes/:id/observacoes: qualquer
// profissional de atendimento (+ secretaria/admin) pode registrar e ler
// observações sobre o paciente.
@Controller('observacoes-paciente')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
@Roles(Papel.SECRETARIA, ...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
export class ObservacoesPacienteController {
  constructor(private readonly service: ObservacoesPacienteService) {}

  @Post()
  create(@Body() dto: CreateObservacaoPacienteDto, @CurrentUser() user: AuthTokenPayload) {
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
}
