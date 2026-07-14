import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { FollowUpService } from '../application/followup.service';
import { CreateFollowUpDto } from '../application/dto/create-followup.dto';

// Leitura (GET) fica aberta também a ADMIN/SECRETARIA — precisam enxergar o
// pipeline (fluxo clínico) para saber quando agendar o paciente com o médico.
// Mutações (POST) continuam restritas aos profissionais de atendimento.
const LEITURA_PIPELINE = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA];

@Controller('followup')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
export class FollowUpController {
  constructor(private readonly service: FollowUpService) {}

  @Post()
  @Roles(...PAPEIS_PROFISSIONAIS)
  create(@Body() dto: CreateFollowUpDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id/excluir')
  @Roles(...PAPEIS_PROFISSIONAIS)
  excluir(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.excluir(id, clinicaId, user);
  }

  @Get('resumo')
  @Roles(...LEITURA_PIPELINE)
  resumo(@CurrentUser() user: AuthTokenPayload) {
    const clinicaId = user.clinicaId ?? '';
    return this.service.resumo(clinicaId);
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

  @Get('avaliacao/:avaliacaoIuId')
  @Roles(...LEITURA_PIPELINE)
  listByAvaliacao(
    @Param('avaliacaoIuId') avaliacaoIuId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.listByAvaliacao(avaliacaoIuId, clinicaId, user);
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
}
