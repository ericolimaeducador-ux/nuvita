import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { TestesPsicologicosService } from '../application/testes-psicologicos.service';
import { CreateTestePsicologicoDto } from '../application/dto/create-teste-psicologico.dto';

// Só o psicólogo aplica/registra testes — mesmo padrão de acesso dos
// documentos clínicos (atestado, laudo, encaminhamento, prescrição).
@Controller('testes-psicologicos')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(Papel.PSICOLOGO)
export class TestesPsicologicosController {
  constructor(private readonly service: TestesPsicologicosService) {}

  @Post()
  create(@Body() dto: CreateTestePsicologicoDto, @CurrentUser() user: AuthTokenPayload) {
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
