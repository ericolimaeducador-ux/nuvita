import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { AnotacoesJuridicasService } from '../application/anotacoes-juridicas.service';
import { CreateAnotacaoJuridicaDto } from '../application/dto/create-anotacao-juridica.dto';

@Controller('anotacoes-juridicas')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
@Roles(Papel.ADVOGADO, Papel.ADMIN)
export class AnotacoesJuridicasController {
  constructor(private readonly service: AnotacoesJuridicasService) {}

  @Post()
  create(@Body() dto: CreateAnotacaoJuridicaDto, @CurrentUser() user: AuthTokenPayload) {
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
