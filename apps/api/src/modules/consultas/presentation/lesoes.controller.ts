import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CorrigirLesaoDto, CreateLesaoDto, PacienteQueryDto, RegistrarConsentimentoImagemDto } from '../application/dto/lesao.dto';
import { LesaoRequestContext, LesoesService } from '../application/lesoes.service';

// Lesões do paciente (etapa 5c): conteúdo clínico SÓ do ENFERMEIRO da clínica (mesma regra da consulta). SUPER_ADMIN passa
// no RolesGuard, mas o serviço recusa. Não há rota de status nem de exclusão: o status só muda pela assinatura da consulta.
@Controller('lesoes')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(Papel.ENFERMEIRO)
export class LesoesController {
  constructor(private readonly service: LesoesService) {}

  @Post()
  criar(@Body() dto: CreateLesaoDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.criar(dto, contexto(request, user));
  }

  @Get()
  listar(@Query() query: PacienteQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.listar(query, contexto(request, user));
  }

  // Antes de ':id' para não ser capturada como id.
  @Get('historico')
  historico(@Query() query: PacienteQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.historico(query, contexto(request, user));
  }

  @Get(':id')
  obter(@Param('id') id: string, @Query('clinicaId') clinicaId: string | undefined, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.obter(id, clinicaId, contexto(request, user));
  }

  /** Correção versionada de etiologia/localização (com motivo). */
  @Patch(':id')
  corrigir(@Param('id') id: string, @Body() dto: CorrigirLesaoDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.corrigir(id, dto, contexto(request, user));
  }
}

// Consentimento de uso de imagem (fotos de ferida). Revogar não apaga nada: bloqueia só fotos novas.
@Controller('consentimentos-imagem')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(Papel.ENFERMEIRO)
export class ConsentimentosImagemController {
  constructor(private readonly service: LesoesService) {}

  @Get()
  listar(@Query() query: PacienteQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.consentimentos(query, contexto(request, user));
  }

  @Post()
  registrar(@Body() dto: RegistrarConsentimentoImagemDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.registrarConsentimento(dto, contexto(request, user));
  }

  @Post(':id/revogar')
  revogar(@Param('id') id: string, @Query('clinicaId') clinicaId: string | undefined, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.revogarConsentimento(id, clinicaId, contexto(request, user));
  }
}

function contexto(request: Request, user: AuthTokenPayload): LesaoRequestContext {
  return { ...extractRequestMeta(request), user };
}
