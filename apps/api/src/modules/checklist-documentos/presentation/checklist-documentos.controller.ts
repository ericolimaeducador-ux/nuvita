import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { ChecklistDocumentosService } from '../application/checklist-documentos.service';
import { CreateChecklistDocumentoDto } from '../application/dto/create-checklist-documento.dto';
import { UpdateChecklistDocumentoDto } from '../application/dto/update-checklist-documento.dto';
import { CriarChecklistPadraoDto } from '../application/dto/criar-checklist-padrao.dto';

// Leitura (GET) fica aberta também aos profissionais (médico/enfermeiro/advogado)
// — a tela de Pacientes e o Fluxo Clínico mostram este checklist pra eles.
// Mutações continuam restritas a quem de fato conduz a documentação (secretaria/admin).
const LEITURA_CHECKLIST = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA];

@Controller('checklist-documentos')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
export class ChecklistDocumentosController {
  constructor(private readonly service: ChecklistDocumentosService) {}

  @Post()
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  create(@Body() dto: CreateChecklistDocumentoDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(...LEITURA_CHECKLIST)
  listByPaciente(
    @Query('pacienteId') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.listByPaciente(pacienteId, clinicaId, user);
  }

  @Get('resumo-pendentes')
  @Roles(...LEITURA_CHECKLIST)
  resumoPendentes(
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.resumoPendentes(clinicaId, user);
  }

  @Post('padrao')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  criarPadrao(@Body() dto: CriarChecklistPadraoDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.criarPadrao(dto, user);
  }

  @Patch(':id')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChecklistDocumentoDto,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Papel.SECRETARIA, Papel.ADMIN)
  delete(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.delete(id, clinicaId, user);
  }
}
