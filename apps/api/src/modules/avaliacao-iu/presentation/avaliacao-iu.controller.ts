import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { AvaliacaoIUService } from '../application/avaliacao-iu.service';
import { CreateAvaliacaoIUDto } from '../application/dto/create-avaliacao-iu.dto';
import { UpdateAvaliacaoIUDto } from '../application/dto/update-avaliacao-iu.dto';

// Leitura (GET) fica aberta também a ADMIN/SECRETARIA — precisam enxergar o
// pipeline (fluxo clínico) para saber quando agendar o paciente com o médico.
// Mutações incluem ADMIN além dos profissionais de atendimento: o frontend
// sempre ofereceu criar/editar/excluir ao ADMIN (mesma regra de PODE_ASSINAR
// e do checklist), mas o backend negava com 403 por usar só PAPEIS_PROFISSIONAIS.
const LEITURA_PIPELINE = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA];
const MUTACAO_PIPELINE = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN];

@Controller('avaliacao-iu')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
export class AvaliacaoIUController {
  constructor(private readonly service: AvaliacaoIUService) {}

  @Post()
  @Roles(...MUTACAO_PIPELINE)
  create(@Body() dto: CreateAvaliacaoIUDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(...MUTACAO_PIPELINE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAvaliacaoIUDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.update(id, dto, clinicaId, user);
  }

  @Patch(':id/excluir')
  @Roles(...MUTACAO_PIPELINE)
  excluir(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.excluir(id, clinicaId, user);
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
