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
import { FollowUpAuditContext, FollowUpService } from '../application/followup.service';
import { CreateFollowUpDto } from '../application/dto/create-followup.dto';

// Leitura: equipe da clínica inclusive SECRETARIA — precisa enxergar o pipeline para saber quando agendar o paciente.
// Mutação: a decisão de elegibilidade é CLÍNICA — só ENFERMEIRO e ADMIN (SUPER_ADMIN sempre passa); SECRETARIA não decide.
// PACIENTE não tem acesso.
const LEITURA_PIPELINE = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA];
const MUTACAO_PIPELINE = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN];

@Controller('followup')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(...LEITURA_PIPELINE)
export class FollowUpController {
  constructor(private readonly service: FollowUpService) {}

  @Post()
  @Roles(...MUTACAO_PIPELINE)
  create(@Body() dto: CreateFollowUpDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.create(dto, this.contexto(request, user));
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

  @Get('resumo')
  resumo(@Query('clinicaId') clinicaId: string | undefined, @CurrentUser() user: AuthTokenPayload) {
    return this.service.resumo(clinicaId, user);
  }

  @Get()
  listByPaciente(
    @Query('pacienteId') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.listByPaciente(pacienteId, clinicaId, user);
  }

  @Get('avaliacao/:avaliacaoIuId')
  listByAvaliacao(
    @Param('avaliacaoIuId') avaliacaoIuId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.listByAvaliacao(avaliacaoIuId, clinicaId, user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.findOne(id, clinicaId, user);
  }

  private contexto(request: Request, user: AuthTokenPayload): FollowUpAuditContext {
    return { ...extractRequestMeta(request), user };
  }
}
