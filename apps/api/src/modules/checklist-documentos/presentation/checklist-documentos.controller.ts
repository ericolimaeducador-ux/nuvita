import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { ChecklistAuditContext, ChecklistDocumentosService } from '../application/checklist-documentos.service';
import { CreateChecklistDocumentoDto } from '../application/dto/create-checklist-documento.dto';
import { UpdateChecklistDocumentoDto } from '../application/dto/update-checklist-documento.dto';
import { CriarChecklistPadraoDto } from '../application/dto/criar-checklist-padrao.dto';

// Checklist de documentos: operado pela equipe da clínica (enfermeiro, admin e secretaria; SUPER_ADMIN sempre passa).
// PACIENTE não tem acesso. Marcar o último item como RECEBIDO pode levar o paciente elegível à consulta médica.
const EQUIPE_CLINICA = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA];

@Controller('checklist-documentos')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(...EQUIPE_CLINICA)
export class ChecklistDocumentosController {
  constructor(private readonly service: ChecklistDocumentosService) {}

  @Post()
  create(@Body() dto: CreateChecklistDocumentoDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
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

  @Get('resumo-pendentes')
  resumoPendentes(@Query('clinicaId') clinicaId: string | undefined, @CurrentUser() user: AuthTokenPayload) {
    return this.service.resumoPendentes(clinicaId, user);
  }

  @Post('padrao')
  criarPadrao(@Body() dto: CriarChecklistPadraoDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.criarPadrao(dto, this.contexto(request, user));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChecklistDocumentoDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.update(id, dto, this.contexto(request, user));
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.delete(id, clinicaId, this.contexto(request, user));
  }

  private contexto(request: Request, user: AuthTokenPayload): ChecklistAuditContext {
    return { ...extractRequestMeta(request), user };
  }
}
