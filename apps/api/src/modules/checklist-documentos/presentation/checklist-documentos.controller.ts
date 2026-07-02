import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { ChecklistDocumentosService } from '../application/checklist-documentos.service';
import { CreateChecklistDocumentoDto } from '../application/dto/create-checklist-documento.dto';
import { UpdateChecklistDocumentoDto } from '../application/dto/update-checklist-documento.dto';

@Controller('checklist-documentos')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
@Roles(Papel.SECRETARIA, Papel.ADMIN)
export class ChecklistDocumentosController {
  constructor(private readonly service: ChecklistDocumentosService) {}

  @Post()
  create(@Body() dto: CreateChecklistDocumentoDto, @CurrentUser() user: AuthTokenPayload) {
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

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChecklistDocumentoDto,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.delete(id, clinicaId, user);
  }
}
