import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { AvaliacaoIUService } from '../application/avaliacao-iu.service';
import { CreateAvaliacaoIUDto } from '../application/dto/create-avaliacao-iu.dto';

@Controller('avaliacao-iu')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
@Roles(...PAPEIS_PROFISSIONAIS)
export class AvaliacaoIUController {
  constructor(private readonly service: AvaliacaoIUService) {}

  @Post()
  create(@Body() dto: CreateAvaliacaoIUDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.create(dto, user);
  }

  @Get('minhas')
  listMinha(@CurrentUser() user: AuthTokenPayload) {
    return this.service.listMinha(user);
  }

  @Get('count')
  contarTotal(@CurrentUser() user: AuthTokenPayload) {
    return this.service.contarTotal(user);
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
}
