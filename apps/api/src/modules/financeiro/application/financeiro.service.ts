import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { LANCAMENTO_REPOSITORY } from '../financeiro.constants';
import { StatusLancamento } from '../domain/lancamento.entity';
import { CreateLancamentoDto } from './dto/create-lancamento.dto';
import { FinancialDashboardQueryDto } from './dto/financial-dashboard-query.dto';
import { ListLancamentosQueryDto } from './dto/list-lancamentos-query.dto';
import { ReceiveLancamentoDto } from './dto/receive-lancamento.dto';
import { LancamentoRepository } from './ports/lancamento.repository';

export interface RequestAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

@Injectable()
export class FinanceiroService {
  constructor(
    @Inject(LANCAMENTO_REPOSITORY) private readonly lancamentos: LancamentoRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
  ) {}

  async create(dto: CreateLancamentoDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);

    const lancamento = await this.lancamentos.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      agendamentoId: dto.agendamentoId,
      tipo: dto.tipo,
      descricao: dto.descricao,
      valor: dto.valor,
      formaPagamento: dto.formaPagamento,
      vencimento: dto.vencimento ? new Date(dto.vencimento) : undefined,
      observacoes: dto.observacoes,
      criadoPor: context.user.sub,
    });

    await this.audit(AuditEvent.FINANCIAL_ENTRY_CREATED, context, { clinicaId, lancamentoId: lancamento.id });
    return lancamento;
  }

  async list(query: ListLancamentosQueryDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);

    const lancamentos = await this.lancamentos.list({
      clinicaId,
      pacienteId: query.pacienteId,
      agendamentoId: query.agendamentoId,
      tipo: query.tipo,
      status: query.status,
      dataInicio: query.dataInicio ? new Date(query.dataInicio) : undefined,
      dataFim: query.dataFim ? new Date(query.dataFim) : undefined,
    });

    await this.audit(AuditEvent.FINANCIAL_ENTRY_LISTED, context, { clinicaId, quantidade: lancamentos.length });
    return lancamentos;
  }

  async findOne(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const lancamento = await this.lancamentos.findById(resolvedClinicaId, id);

    if (!lancamento) throw new NotFoundException('Lancamento nao encontrado.');
    return lancamento;
  }

  async receive(id: string, dto: ReceiveLancamentoDto, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);

    const lancamento = await this.lancamentos.updateStatus(
      resolvedClinicaId,
      id,
      StatusLancamento.RECEBIDO,
      dto.recebidoEm ? new Date(dto.recebidoEm) : new Date(),
    );

    if (!lancamento) throw new NotFoundException('Lancamento nao encontrado.');

    await this.audit(AuditEvent.FINANCIAL_ENTRY_RECEIVED, context, { clinicaId: resolvedClinicaId, lancamentoId: id });
    return lancamento;
  }

  async cancel(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);

    const lancamento = await this.lancamentos.updateStatus(resolvedClinicaId, id, StatusLancamento.CANCELADO);

    if (!lancamento) throw new NotFoundException('Lancamento nao encontrado.');

    await this.audit(AuditEvent.FINANCIAL_ENTRY_CANCELLED, context, { clinicaId: resolvedClinicaId, lancamentoId: id });
    return lancamento;
  }

  async dashboard(query: FinancialDashboardQueryDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);
    const now = new Date();
    const dataInicio = query.dataInicio ? new Date(query.dataInicio) : new Date(now.getFullYear(), now.getMonth(), 1);
    const dataFim = query.dataFim ? new Date(query.dataFim) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const result = await this.lancamentos.dashboard({ clinicaId, dataInicio, dataFim });

    await this.audit(AuditEvent.FINANCIAL_DASHBOARD_VIEWED, context, { clinicaId, dataInicio, dataFim });
    return result;
  }

  private resolveClinicaId(user: AuthTokenPayload, requestedClinicaId?: string): string {
    return resolveTenantClinicaId(user, requestedClinicaId);
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
