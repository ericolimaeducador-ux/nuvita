import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { ProcessoJuridicoService } from '../application/processo-juridico.service';
import { CreateProcessoJuridicoDto, UpdateStatusProcessoDto } from '../application/dto/create-processo-juridico.dto';

@Controller('processo-juridico')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
@Roles(...PAPEIS_PROFISSIONAIS)
export class ProcessoJuridicoController {
  constructor(private readonly service: ProcessoJuridicoService) {}

  @Post()
  create(@Body() dto: CreateProcessoJuridicoDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.create(dto, user);
  }

  @Get('meus')
  listMeus(@CurrentUser() user: AuthTokenPayload) {
    return this.service.listMeus(user);
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

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusProcessoDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.updateStatus(id, dto, clinicaId, user);
  }
}
