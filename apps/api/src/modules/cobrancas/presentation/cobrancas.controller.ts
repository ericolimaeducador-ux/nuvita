import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { CobrancaAuditContext, CobrancasService } from '../application/cobrancas.service';
import { CreateCobrancaDto } from '../application/dto/create-cobranca.dto';
import {
  CancelarCobrancaDto,
  ConsultaAvaliacaoDto,
  EnviarAvisoDto,
  PagarCobrancaDto,
  ResumoQueryDto,
  SalvarConfigFinanceiroDto,
} from '../application/dto/outros.dto';
import { UpdateCobrancaDto } from '../application/dto/update-cobranca.dto';

// Financeiro de paciente (REGISTRO de cobranças + AVISOS; sem processar pagamento): operado pela equipe da clínica
// (enfermeiro, secretaria, admin; SUPER_ADMIN sempre passa). PACIENTE não tem acesso. O valor da consulta de avaliação
// (configuração) só o ADMIN altera.
const EQUIPE_CLINICA = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA];

@Controller('cobrancas')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(...EQUIPE_CLINICA)
export class CobrancasController {
  constructor(private readonly service: CobrancasService) {}

  @Post()
  criar(@Body() dto: CreateCobrancaDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.criar(dto, this.contexto(request, user));
  }

  // Atalho: o valor vem da configuração da clínica.
  @Post('consulta-avaliacao')
  criarConsultaAvaliacao(@Body() dto: ConsultaAvaliacaoDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.criarConsultaAvaliacao(dto, this.contexto(request, user));
  }

  @Get()
  listarPorPaciente(
    @Query('pacienteId') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.service.listarPorPaciente(pacienteId, clinicaId, user);
  }

  @Get('resumo')
  resumo(@Query() query: ResumoQueryDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.resumo(query, user);
  }

  @Get('configuracao')
  obterConfig(@Query('clinicaId') clinicaId: string | undefined, @CurrentUser() user: AuthTokenPayload) {
    return this.service.obterConfig(clinicaId, user);
  }

  @Put('configuracao')
  @Roles(Papel.ADMIN)
  salvarConfig(@Body() dto: SalvarConfigFinanceiroDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.salvarConfig(dto, this.contexto(request, user));
  }

  @Get(':id')
  obter(@Param('id') id: string, @Query('clinicaId') clinicaId: string | undefined, @CurrentUser() user: AuthTokenPayload) {
    return this.service.obter(id, clinicaId, user);
  }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: UpdateCobrancaDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.atualizar(id, dto, this.contexto(request, user));
  }

  @Post(':id/aviso')
  enviarAviso(
    @Param('id') id: string,
    @Body() dto: EnviarAvisoDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.enviarAviso(id, dto, clinicaId, this.contexto(request, user));
  }

  @Patch(':id/pagar')
  marcarPaga(
    @Param('id') id: string,
    @Body() dto: PagarCobrancaDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.marcarPaga(id, dto, clinicaId, this.contexto(request, user));
  }

  @Patch(':id/cancelar')
  cancelar(
    @Param('id') id: string,
    @Body() dto: CancelarCobrancaDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.cancelar(id, dto, clinicaId, this.contexto(request, user));
  }

  private contexto(request: Request, user: AuthTokenPayload): CobrancaAuditContext {
    return { ...extractRequestMeta(request), user };
  }
}
