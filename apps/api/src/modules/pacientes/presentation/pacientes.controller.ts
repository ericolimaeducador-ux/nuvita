import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { CreatePacienteDto } from '../application/dto/create-paciente.dto';
import { ListPacientesQueryDto } from '../application/dto/list-pacientes-query.dto';
import { UpdatePacienteDto } from '../application/dto/update-paciente.dto';
import { UpdateObservacoesPacienteDto } from '../application/dto/update-observacoes-paciente.dto';
import { PacientesService, RequestAuditContext } from '../application/pacientes.service';

@Controller('pacientes')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  @Post()
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  create(
    @Body() dto: CreatePacienteDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.pacientesService.create(dto, this.contextFromRequest(request, user));
  }

  @Get()
  @Roles(Papel.SECRETARIA, ...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  list(
    @Query() query: ListPacientesQueryDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.pacientesService.list(query, this.contextFromRequest(request, user));
  }

  @Get(':id')
  @Roles(Papel.SECRETARIA, ...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  findOne(
    @Param('id') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.pacientesService.findOne(pacienteId, clinicaId, this.contextFromRequest(request, user));
  }

  // Export LGPD é dump completo de dados sensíveis — não abre p/ todos os profissionais.
  @Get(':id/export')
  @Roles(Papel.SECRETARIA, Papel.MEDICO, Papel.ADMIN)
  exportLgpd(
    @Param('id') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.pacientesService.exportLgpd(pacienteId, clinicaId, this.contextFromRequest(request, user));
  }

  @Patch(':id')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  update(
    @Param('id') pacienteId: string,
    @Body() dto: UpdatePacienteDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.pacientesService.update(pacienteId, dto, clinicaId, this.contextFromRequest(request, user));
  }

  // Campo de observações livres — mais aberto que o update geral, pois
  // qualquer profissional de atendimento pode registrar informação
  // pertinente sobre o paciente (não só secretaria/admin).
  @Patch(':id/observacoes')
  @Roles(Papel.SECRETARIA, ...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  updateObservacoes(
    @Param('id') pacienteId: string,
    @Body() dto: UpdateObservacoesPacienteDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.pacientesService.updateObservacoes(pacienteId, dto, clinicaId, this.contextFromRequest(request, user));
  }

  // Avanço manual de etapa do fluxo clínico ("Avançar etapa" na tela do
  // paciente) — a checagem de QUAL papel pode avançar de QUAL etapa é feita
  // dentro do service (depende da etapa atual do paciente, não é estática),
  // então aqui só exigimos que o usuário seja algum profissional/secretaria/admin.
  @Patch(':id/fluxo/avancar')
  @Roles(Papel.SECRETARIA, ...PAPEIS_PROFISSIONAIS, Papel.ADMIN)
  avancarEtapaManual(
    @Param('id') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.pacientesService.avancarEtapaManual(pacienteId, clinicaId, this.contextFromRequest(request, user));
  }

  @Patch(':id/desativar')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  deactivate(
    @Param('id') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.pacientesService.deactivate(pacienteId, clinicaId, this.contextFromRequest(request, user));
  }

  private contextFromRequest(request: Request, user: AuthTokenPayload): RequestAuditContext {
    return {
      ...extractRequestMeta(request),
      user,
    };
  }
}
