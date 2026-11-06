import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { ConsultaRequestContext, ConsultasService } from '../application/consultas.service';
import {
  AssinarConsultaDto,
  CreateAdendoConsultaDto,
  CreateConsultaDto,
  ListConsultasQueryDto,
  PresignAnexoConsultaDto,
  UpdateConsultaDto,
} from '../application/dto/consulta.dto';

// Consulta de enfermagem: conteúdo clínico SÓ do ENFERMEIRO (ler: qualquer enfermeiro da clínica; escrever: só o autor —
// regra no serviço). ADMIN, SECRETARIA e PACIENTE não acessam. SUPER_ADMIN passa no RolesGuard, mas o serviço recusa o
// conteúdo clínico (mesmo padrão do prontuário). Exceção: gerar a cobrança pendente (ADMIN também; sem conteúdo clínico).
@Controller('consultas')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(Papel.ENFERMEIRO)
export class ConsultasController {
  constructor(private readonly service: ConsultasService) {}

  @Post()
  criar(@Body() dto: CreateConsultaDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.criar(dto, this.contexto(request, user));
  }

  @Get()
  listar(@Query() query: ListConsultasQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.listarPorPaciente(query, this.contexto(request, user));
  }

  @Get(':id')
  obter(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.obter(id, clinicaId, this.contexto(request, user));
  }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: UpdateConsultaDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.atualizarRascunho(id, dto, this.contexto(request, user));
  }

  @Post(':id/assinar')
  assinar(
    @Param('id') id: string,
    @Body() dto: AssinarConsultaDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.assinar(id, dto, clinicaId, this.contexto(request, user));
  }

  @Post(':id/cobranca')
  @Roles(Papel.ENFERMEIRO, Papel.ADMIN)
  gerarCobranca(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.gerarCobrancaPendente(id, clinicaId, this.contexto(request, user));
  }

  // Reaplica o desfecho do módulo Ferida nas lesões (consulta assinada com PENDENTE_APLICACAO). Idempotente.
  @Post(':id/lesoes/aplicar-desfecho')
  aplicarDesfechoLesoes(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.aplicarDesfechoLesoes(id, clinicaId, this.contexto(request, user));
  }

  @Post(':id/adendos')
  criarAdendo(
    @Param('id') id: string,
    @Body() dto: CreateAdendoConsultaDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.criarAdendo(id, dto, clinicaId, this.contexto(request, user));
  }

  // Anexos (foto/PDF do diário). Regras de autor/rascunho e de leitura no serviço.
  @Post(':id/anexos/presign-upload')
  criarUploadAnexo(
    @Param('id') id: string,
    @Body() dto: PresignAnexoConsultaDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.criarUploadAnexo(id, dto, clinicaId, this.contexto(request, user));
  }

  @Post(':id/anexos/:anexoId/confirmar-upload')
  confirmarUploadAnexo(
    @Param('id') id: string,
    @Param('anexoId') anexoId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.confirmarUploadAnexo(id, anexoId, clinicaId, this.contexto(request, user));
  }

  @Get(':id/anexos')
  listarAnexos(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.listarAnexos(id, clinicaId, this.contexto(request, user));
  }

  @Get(':id/anexos/:anexoId/access-url')
  urlAcessoAnexo(
    @Param('id') id: string,
    @Param('anexoId') anexoId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.urlAcessoAnexo(id, anexoId, clinicaId, this.contexto(request, user));
  }

  private contexto(request: Request, user: AuthTokenPayload): ConsultaRequestContext {
    return { ...extractRequestMeta(request), user };
  }
}
