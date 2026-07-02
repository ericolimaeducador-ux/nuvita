import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { AvaliacaoIUService } from '../application/avaliacao-iu.service';
import { CreateAvaliacaoIUDto } from '../application/dto/create-avaliacao-iu.dto';

// Leitura (GET) fica aberta também a ADMIN/SECRETARIA — precisam enxergar o
// pipeline (fluxo clínico) para saber quando agendar o paciente com o médico.
// Mutações (POST) continuam restritas aos profissionais de atendimento.
const LEITURA_PIPELINE = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA];

@Controller('avaliacao-iu')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
export class AvaliacaoIUController {
  constructor(private readonly service: AvaliacaoIUService) {}

  @Post()
  @Roles(...PAPEIS_PROFISSIONAIS)
  create(@Body() dto: CreateAvaliacaoIUDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.create(dto, user);
  }

  @Get('minhas')
  @Roles(...PAPEIS_PROFISSIONAIS)
  listMinha(@CurrentUser() user: AuthTokenPayload) {
    return this.service.listMinha(user);
  }

  @Get('count')
  @Roles(...LEITURA_PIPELINE)
  contarTotal(@CurrentUser() user: AuthTokenPayload) {
    return this.service.contarTotal(user);
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
}
