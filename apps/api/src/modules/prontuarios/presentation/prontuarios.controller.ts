import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { AgendamentosService } from '../../agendamentos/application/agendamentos.service';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { Cid10QueryDto } from '../application/dto/cid10-query.dto';
import { CreateAddendumDto } from '../application/dto/create-addendum.dto';
import { CreateProntuarioDto } from '../application/dto/create-prontuario.dto';
import { ListProntuariosQueryDto } from '../application/dto/list-prontuarios-query.dto';
import { UpdateProntuarioDto } from '../application/dto/update-prontuario.dto';
import { ProntuarioRequestContext, ProntuariosService } from '../application/prontuarios.service';

// R1.4 (decisão do Erico): o prontuário ANTIGO (herdado do psi) é SOMENTE LEITURA. As rotas de escrita continuam
// existindo (telas herdadas ainda as referenciam até a etapa de conteúdo), mas respondem 403 ANTES de qualquer validação
// ou gravação, com auditoria da tentativa. A leitura não muda. Nenhum dado é tocado.
export const MSG_PRONTUARIO_SOMENTE_LEITURA = 'O prontuário antigo é somente leitura.';

@Controller('prontuarios')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(...PAPEIS_PROFISSIONAIS)
export class ProntuariosController {
  constructor(
    private readonly prontuariosService: ProntuariosService,
    private readonly agendamentosService: AgendamentosService,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateProntuarioDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    const ctx = this.contextFromRequest(request, user);
    await this.bloquearEscrita('CRIAR', ctx);
    await this.agendamentosService.validarReferencias(
      { pacienteId: dto.pacienteId, agendamentoId: dto.agendamentoId },
      dto.clinicaId,
      ctx,
    );
    return this.prontuariosService.create(dto, ctx);
  }

  // Fatos do laudo calculados no servidor. Declarada ANTES de ':id' para não ser capturada como id.
  @Get('resumo-acompanhamento')
  resumoAcompanhamento(
    @Query('pacienteId') pacienteId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.resumoAcompanhamento(pacienteId, clinicaId, this.contextFromRequest(request, user));
  }

  @Get()
  listByPaciente(
    @Query() query: ListProntuariosQueryDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.listByPaciente(query, this.contextFromRequest(request, user));
  }

  @Get('cid10/autocomplete')
  autocompleteCid10(
    @Query() query: Cid10QueryDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.autocompleteCid10(
      query.q,
      query.limit,
      this.contextFromRequest(request, user),
    );
  }

  @Get(':id')
  findOne(
    @Param('id') prontuarioId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.findOne(prontuarioId, clinicaId, this.contextFromRequest(request, user));
  }

  @Patch(':id')
  async updateDraft(
    @Param('id') prontuarioId: string,
    @Body() dto: UpdateProntuarioDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    await this.bloquearEscrita('EDITAR', this.contextFromRequest(request, user), prontuarioId);
    return this.prontuariosService.updateDraft(
      prontuarioId,
      dto,
      clinicaId,
      this.contextFromRequest(request, user),
    );
  }

  @Post(':id/assinar')
  async sign(
    @Param('id') prontuarioId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    await this.bloquearEscrita('ASSINAR', this.contextFromRequest(request, user), prontuarioId);
    return this.prontuariosService.sign(prontuarioId, clinicaId, this.contextFromRequest(request, user));
  }

  @Post(':id/addendums')
  async createAddendum(
    @Param('id') prontuarioId: string,
    @Body() dto: CreateAddendumDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    await this.bloquearEscrita('ADENDO', this.contextFromRequest(request, user), prontuarioId);
    return this.prontuariosService.createAddendum(
      prontuarioId,
      dto,
      clinicaId,
      this.contextFromRequest(request, user),
    );
  }

  @Get(':id/addendums')
  listAddendums(
    @Param('id') prontuarioId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.listAddendums(
      prontuarioId,
      clinicaId,
      this.contextFromRequest(request, user),
    );
  }

  private contextFromRequest(request: Request, user: AuthTokenPayload): ProntuarioRequestContext {
    return {
      ...extractRequestMeta(request),
      user,
    };
  }

  /** Audita a tentativa (só ação e ids — nunca o conteúdo enviado) e responde 403. Falha da auditoria não libera a escrita. */
  private async bloquearEscrita(acao: 'CRIAR' | 'EDITAR' | 'ASSINAR' | 'ADENDO', ctx: ProntuarioRequestContext, prontuarioId?: string): Promise<never> {
    try {
      await this.auditLogs.create({
        event: AuditEvent.PRONTUARIO_LEGADO_ESCRITA_BLOQUEADA,
        userId: ctx.user.sub,
        email: ctx.user.email,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { acao, ...(prontuarioId ? { prontuarioId } : {}), clinicaId: ctx.user.clinicaId ?? null },
      });
    } catch {
      // Sem auditoria a escrita continua bloqueada (o 403 abaixo sai de qualquer jeito).
    }
    throw new ForbiddenException(MSG_PRONTUARIO_SOMENTE_LEITURA);
  }
}
