import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { ProcessoJuridicoService } from '../application/processo-juridico.service';
import { AddDocumentoProcessoDto, CreateProcessoJuridicoDto, UpdateStatusProcessoDto } from '../application/dto/create-processo-juridico.dto';
import { ListProcessosPorStatusQueryDto } from '../application/dto/list-processos-por-status-query.dto';

// Leitura (GET) fica aberta também a ADMIN/SECRETARIA — precisam enxergar o
// pipeline (fluxo clínico) para saber quando agendar o paciente com o médico.
// Mutações (POST/PATCH) continuam restritas aos profissionais de atendimento.
const LEITURA_PIPELINE = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA];

@Controller('processo-juridico')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
export class ProcessoJuridicoController {
  constructor(private readonly service: ProcessoJuridicoService) {}

  @Post()
  @Roles(...PAPEIS_PROFISSIONAIS)
  create(@Body() dto: CreateProcessoJuridicoDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.create(dto, user);
  }

  @Get('meus')
  @Roles(...PAPEIS_PROFISSIONAIS)
  listMeus(@CurrentUser() user: AuthTokenPayload) {
    return this.service.listMeus(user);
  }

  @Get('por-status')
  @Roles(...LEITURA_PIPELINE)
  listByStatus(@Query() query: ListProcessosPorStatusQueryDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.listByStatus(query.status, query.clinicaId, user);
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

  @Post(':id/documento')
  @Roles(...PAPEIS_PROFISSIONAIS)
  addDocumento(
    @Param('id') id: string,
    @Body() dto: AddDocumentoProcessoDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.addDocumento(id, dto, clinicaId, user);
  }

  @Patch(':id/status')
  @Roles(...PAPEIS_PROFISSIONAIS)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusProcessoDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.updateStatus(id, dto, clinicaId, user);
  }
}
