import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { LaudoMedicoService } from '../application/laudo-medico.service';
import { LaudoMedicoIaService } from '../application/laudo-medico-ia.service';
import { CreateLaudoMedicoDto } from '../application/dto/create-laudo-medico.dto';
import { UpdateLaudoMedicoDto } from '../application/dto/update-laudo-medico.dto';
import { PrePreenchimentoIaDto } from '../application/dto/pre-preenchimento-ia.dto';

// Leitura (GET) fica aberta também a ADMIN/SECRETARIA — precisam enxergar o
// pipeline (fluxo clínico) para saber quando agendar o paciente com o médico.
// Mutações (POST) continuam restritas aos profissionais de atendimento.
const LEITURA_PIPELINE = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA];
// Assinatura é ato médico — só médico/admin, diferente das demais mutações
// (rascunho/edição/encaminhamento), que qualquer profissional pode fazer.
const PODE_ASSINAR = [Papel.MEDICO, Papel.ADMIN];

@Controller('laudo-medico')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
export class LaudoMedicoController {
  constructor(
    private readonly service: LaudoMedicoService,
    private readonly iaService: LaudoMedicoIaService,
  ) {}

  @Post()
  @Roles(...PAPEIS_PROFISSIONAIS)
  create(@Body() dto: CreateLaudoMedicoDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.create(dto, user);
  }

  @Post('pre-preenchimento')
  @Roles(...PAPEIS_PROFISSIONAIS)
  prePreenchimento(@Body() dto: PrePreenchimentoIaDto, @CurrentUser() user: AuthTokenPayload) {
    return this.iaService.gerarRascunho(dto.pacienteId, dto.avaliacaoIuId, dto.clinicaId, user);
  }

  @Get('pendentes-revisao')
  @Roles(...PODE_ASSINAR)
  listPendentesRevisao(@Query('clinicaId') clinicaId: string | undefined, @CurrentUser() user: AuthTokenPayload) {
    return this.service.listPendentesRevisao(clinicaId, user);
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

  @Patch(':id')
  @Roles(...PAPEIS_PROFISSIONAIS)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLaudoMedicoDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.update(id, dto, clinicaId, user);
  }

  @Patch(':id/excluir')
  @Roles(...PAPEIS_PROFISSIONAIS)
  excluir(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.excluir(id, clinicaId, user);
  }

  @Post(':id/encaminhar')
  @Roles(...PAPEIS_PROFISSIONAIS)
  encaminhar(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.encaminharParaRevisao(id, clinicaId, user);
  }

  @Post(':id/assinar')
  @Roles(...PODE_ASSINAR)
  assinar(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @Query('crm') crmNumero: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.assinar(id, crmNumero, clinicaId, user);
  }
}
