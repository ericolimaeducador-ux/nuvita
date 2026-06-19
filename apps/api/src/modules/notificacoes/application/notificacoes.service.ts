import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CanalNotificacao, TipoNotificacao } from '../domain/notificacao.entity';
import {
  NOTIFICACAO_PREFERENCIA_REPOSITORY,
  NOTIFICACAO_REPOSITORY,
} from '../notificacoes.constants';
import { CreateNotificacaoDto } from './dto/create-notificacao.dto';
import { DashboardNotificacoesQueryDto } from './dto/dashboard-query.dto';
import { UpdateOptOutDto } from './dto/update-optout.dto';
import { NotificacaoWindowService } from './notificacao-window.service';
import { NotificacaoQueue } from './ports/notificacao-queue';
import {
  NotificacaoPreferenciaRepository,
  NotificacaoRepository,
} from './ports/notificacao.repository';
import { NotificacaoTemplateService } from './templates/notificacao-template.service';

export interface NotificacaoRequestContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

@Injectable()
export class NotificacoesService {
  constructor(
    @Inject(NOTIFICACAO_REPOSITORY) private readonly notificacoes: NotificacaoRepository,
    @Inject(NOTIFICACAO_PREFERENCIA_REPOSITORY)
    private readonly preferencias: NotificacaoPreferenciaRepository,
    @Inject('NOTIFICACAO_QUEUE_SERVICE') private readonly queue: NotificacaoQueue,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly templates: NotificacaoTemplateService,
    private readonly windowService: NotificacaoWindowService,
  ) {}

  async create(dto: CreateNotificacaoDto, context: NotificacaoRequestContext) {
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);
    const preference = await this.preferencias.findByPaciente(clinicaId, dto.destinatarioId);
    if (preference?.canaisOptOut.includes(dto.canal)) {
      throw new BadRequestException('Paciente optou por nao receber notificacoes neste canal.');
    }

    const destino = this.resolveDestino(dto);
    const variaveis = {
      nome: dto.nome,
      hora: dto.hora ?? '',
      medico: dto.medico ?? '',
      link: dto.link ?? '',
      documento: dto.documento ?? '',
    };
    const rendered = this.templates.render(dto.tipo, variaveis);
    const notificacao = await this.notificacoes.create({
      clinicaId,
      destinatarioId: dto.destinatarioId,
      tipo: dto.tipo,
      canal: dto.canal,
      conteudo: {
        ...rendered,
        destino,
        variaveis,
      },
    });

    const baseDate = dto.enviarApos ? new Date(dto.enviarApos) : new Date();
    const delayMs = this.windowService.delayUntilAllowed(baseDate, dto.timezonePaciente);
    await this.queue.enqueue({ notificacaoId: notificacao.id, delayMs });
    await this.notificacoes.markQueued(notificacao.id);

    await this.audit(AuditEvent.NOTIFICATION_CREATED, context, {
      clinicaId,
      notificacaoId: notificacao.id,
      destinatarioId: notificacao.destinatarioId,
      canal: notificacao.canal,
      tipo: notificacao.tipo,
    });
    await this.audit(AuditEvent.NOTIFICATION_QUEUED, context, {
      clinicaId,
      notificacaoId: notificacao.id,
      delayMs,
      timezonePaciente: dto.timezonePaciente,
    });

    return notificacao;
  }

  async dashboard(query: DashboardNotificacoesQueryDto, context: NotificacaoRequestContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);
    const result = await this.notificacoes.dashboard({
      clinicaId,
      status: query.status,
      canal: query.canal,
      tipo: query.tipo,
      inicio: query.inicio ? new Date(query.inicio) : undefined,
      fim: query.fim ? new Date(query.fim) : undefined,
    });

    await this.audit(AuditEvent.NOTIFICATION_DASHBOARD_VIEWED, context, {
      clinicaId,
      filtros: query,
    });

    return result;
  }

  async notificarElegibilidade(clinicaId: string, pacienteId: string, nomePaciente: string): Promise<void> {
    try {
      const rendered = this.templates.render(TipoNotificacao.ELEGIBILIDADE_CONFIRMADA, { nome: nomePaciente, hora: '', medico: '', link: '', documento: '' });
      await this.notificacoes.create({
        clinicaId,
        destinatarioId: pacienteId,
        tipo: TipoNotificacao.ELEGIBILIDADE_CONFIRMADA,
        canal: CanalNotificacao.EMAIL,
        conteudo: { ...rendered, destino: 'interno' },
      });
      // Not enqueued: internal notification visible no dashboard, sem envio externo
    } catch {
      // notification is non-critical
    }
  }

  async updateOptOut(
    pacienteId: string,
    dto: UpdateOptOutDto,
    clinicaId: string | undefined,
    context: NotificacaoRequestContext,
  ) {
    if (context.user.papel === Papel.PACIENTE && context.user.sub !== pacienteId) {
      throw new ForbiddenException('Paciente so pode alterar suas proprias preferencias.');
    }

    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const preference = await this.preferencias.upsertOptOut(
      resolvedClinicaId,
      pacienteId,
      dto.canaisOptOut,
    );

    await this.audit(AuditEvent.NOTIFICATION_OPT_OUT_UPDATED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId,
      canaisOptOut: dto.canaisOptOut,
    });

    return preference;
  }

  private resolveDestino(dto: CreateNotificacaoDto): string {
    if (dto.canal === CanalNotificacao.EMAIL && dto.email) return dto.email;
    if (dto.canal !== CanalNotificacao.EMAIL && dto.telefone) return dto.telefone;

    throw new BadRequestException('Destino obrigatorio para o canal informado.');
  }

  private resolveClinicaId(user: AuthTokenPayload, requestedClinicaId?: string): string {
    if (user.papel !== Papel.ADMIN && user.clinicaId) {
      return user.clinicaId;
    }

    if (requestedClinicaId) {
      return requestedClinicaId;
    }

    throw new BadRequestException('clinicaId e obrigatorio para esta operacao.');
  }

  private async audit(
    event: AuditEvent,
    context: NotificacaoRequestContext,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.auditLogs.create({
      event,
      userId: context.user.sub,
      email: context.user.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata,
    });
  }
}
