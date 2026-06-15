import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { AGENDAMENTO_REPOSITORY } from '../agendamentos.constants';
import { StatusAgendamento } from '../domain/agendamento.entity';
import { CancelAgendamentoDto } from './dto/cancel-agendamento.dto';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';
import { CreateBloqueioDto } from './dto/create-bloqueio.dto';
import { ListAgendamentosQueryDto } from './dto/list-agendamentos-query.dto';
import { ListBloqueiosQueryDto } from './dto/list-bloqueios-query.dto';
import { UpdateAgendamentoDto } from './dto/update-agendamento.dto';
import { AgendamentoRepository } from './ports/agendamento.repository';

export interface RequestAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

@Injectable()
export class AgendamentosService {
  constructor(
    @Inject(AGENDAMENTO_REPOSITORY) private readonly agendamentos: AgendamentoRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
  ) {}

  async create(dto: CreateAgendamentoDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);

    const agendamento = await this.agendamentos.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      medicoId: dto.medicoId,
      dataHoraInicio: new Date(dto.dataHoraInicio),
      dataHoraFim: new Date(dto.dataHoraFim),
      tipo: dto.tipo,
      observacoes: dto.observacoes,
      criadoPor: context.user.sub,
    });

    await this.audit(AuditEvent.APPOINTMENT_CREATED, context, { clinicaId, agendamentoId: agendamento.id });
    return agendamento;
  }

  async list(query: ListAgendamentosQueryDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);

    const agendamentos = await this.agendamentos.list({
      clinicaId,
      medicoId: query.medicoId,
      pacienteId: query.pacienteId,
      dataInicio: query.dataInicio ? new Date(query.dataInicio) : undefined,
      dataFim: query.dataFim ? new Date(query.dataFim) : undefined,
      status: query.status,
    });

    await this.audit(AuditEvent.APPOINTMENT_LISTED, context, { clinicaId, quantidade: agendamentos.length });
    return agendamentos;
  }

  async findOne(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const agendamento = await this.agendamentos.findById(resolvedClinicaId, id);

    if (!agendamento) throw new NotFoundException('Agendamento nao encontrado.');

    await this.audit(AuditEvent.APPOINTMENT_VIEWED, context, { clinicaId: resolvedClinicaId, agendamentoId: id });
    return agendamento;
  }

  async update(id: string, dto: UpdateAgendamentoDto, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);

    const agendamento = await this.agendamentos.update(resolvedClinicaId, id, {
      medicoId: dto.medicoId,
      dataHoraInicio: dto.dataHoraInicio ? new Date(dto.dataHoraInicio) : undefined,
      dataHoraFim: dto.dataHoraFim ? new Date(dto.dataHoraFim) : undefined,
      tipo: dto.tipo,
      observacoes: dto.observacoes,
    });

    if (!agendamento) throw new NotFoundException('Agendamento nao encontrado.');

    await this.audit(AuditEvent.APPOINTMENT_UPDATED, context, { clinicaId: resolvedClinicaId, agendamentoId: id });
    return agendamento;
  }

  async cancel(id: string, dto: CancelAgendamentoDto, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);

    const agendamento = await this.agendamentos.updateStatus(
      resolvedClinicaId,
      id,
      StatusAgendamento.CANCELADO,
      dto.motivoCancelamento,
    );

    if (!agendamento) throw new NotFoundException('Agendamento nao encontrado.');

    await this.audit(AuditEvent.APPOINTMENT_CANCELLED, context, {
      clinicaId: resolvedClinicaId,
      agendamentoId: id,
      motivo: dto.motivoCancelamento,
    });

    return agendamento;
  }

  async conclude(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);

    const agendamento = await this.agendamentos.updateStatus(
      resolvedClinicaId,
      id,
      StatusAgendamento.CONCLUIDO,
    );

    if (!agendamento) throw new NotFoundException('Agendamento nao encontrado.');

    await this.audit(AuditEvent.APPOINTMENT_CONCLUDED, context, { clinicaId: resolvedClinicaId, agendamentoId: id });
    return agendamento;
  }

  async createBloqueio(dto: CreateBloqueioDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);

    const bloqueio = await this.agendamentos.createBloqueio({
      clinicaId,
      medicoId: dto.medicoId,
      dataHoraInicio: new Date(dto.dataHoraInicio),
      dataHoraFim: new Date(dto.dataHoraFim),
      motivo: dto.motivo,
      criadoPor: context.user.sub,
    });

    await this.audit(AuditEvent.SCHEDULE_BLOCKED, context, { clinicaId, bloqueioId: bloqueio.id });
    return bloqueio;
  }

  async listBloqueios(query: ListBloqueiosQueryDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);

    return this.agendamentos.listBloqueios(
      clinicaId,
      query.medicoId,
      query.dataInicio ? new Date(query.dataInicio) : undefined,
      query.dataFim ? new Date(query.dataFim) : undefined,
    );
  }

  async deleteBloqueio(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const deleted = await this.agendamentos.deleteBloqueio(resolvedClinicaId, id);

    if (!deleted) throw new NotFoundException('Bloqueio nao encontrado.');

    await this.audit(AuditEvent.SCHEDULE_UNBLOCKED, context, { clinicaId: resolvedClinicaId, bloqueioId: id });
    return { ok: true };
  }

  private resolveClinicaId(user: AuthTokenPayload, requestedClinicaId?: string): string {
    if (user.papel !== Papel.ADMIN && user.clinicaId) return user.clinicaId;
    if (requestedClinicaId) return requestedClinicaId;
    throw new BadRequestException('clinicaId e obrigatorio para esta operacao.');
  }

  private async audit(event: AuditEvent, context: RequestAuditContext, metadata: Record<string, unknown>) {
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
