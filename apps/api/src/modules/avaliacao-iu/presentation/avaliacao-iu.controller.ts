import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { AvaliacaoAuditContext, AvaliacaoIUService } from '../application/avaliacao-iu.service';
import { CreateAvaliacaoIUDto } from '../application/dto/create-avaliacao-iu.dto';
import { UpdateAvaliacaoIUDto } from '../application/dto/update-avaliacao-iu.dto';

// Avaliação é dado CLÍNICO: ler = equipe da clínica (a secretaria precisa enxergar o pipeline); escrever = enfermeiro e
// admin (SUPER_ADMIN sempre passa). PACIENTE não tem acesso.
const LEITURA_PIPELINE = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA];
const MUTACAO_PIPELINE = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN];

@Controller('avaliacao-iu')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(...LEITURA_PIPELINE)
export class AvaliacaoIUController {
  constructor(private readonly service: AvaliacaoIUService) {}

  @Post()
  @Roles(...MUTACAO_PIPELINE)
  create(@Body() dto: CreateAvaliacaoIUDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.create(dto, this.contexto(request, user));
  }

  @Patch(':id')
  @Roles(...MUTACAO_PIPELINE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAvaliacaoIUDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.update(id, dto, clinicaId, this.contexto(request, user));
  }

  @Patch(':id/excluir')
  @Roles(...MUTACAO_PIPELINE)
  excluir(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.excluir(id, clinicaId, this.contexto(request, user));
  }

  // "Minhas avaliações": só o enfermeiro (as dele).
  @Get('minhas')
  @Roles(...PAPEIS_PROFISSIONAIS)
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
    @Req() request: Request,
  ) {
    return this.service.findOne(id, clinicaId, this.contexto(request, user));
  }

  private contexto(request: Request, user: AuthTokenPayload): AvaliacaoAuditContext {
    return { ...extractRequestMeta(request), user };
  }
}
