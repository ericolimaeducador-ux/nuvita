import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { AGENDAMENTO_REPOSITORY } from '../agendamentos.constants';
import { ModalidadeAtendimento, StatusAgendamento, TipoAgendamento } from '../domain/agendamento.entity';
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
    private readonly pacientesService: PacientesService,
  ) {}

  async create(dto: CreateAgendamentoDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);

    const agendamento = await this.agendamentos.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      medicoId: dto.medicoId,
      modalidade: dto.modalidade ?? ModalidadeAtendimento.MEDICO,
      dataHoraInicio: new Date(dto.dataHoraInicio),
      dataHoraFim: new Date(dto.dataHoraFim),
      tipo: dto.tipo,
      observacoes: dto.observacoes,
      criadoPor: context.user.sub,
    });

    await this.audit(AuditEvent.APPOINTMENT_CREATED, context, { clinicaId, agendamentoId: agendamento.id });

    if (agendamento.tipo === TipoAgendamento.ENTREVISTA) {
      await this.pacientesService.avancarEtapaFluxo(
        clinicaId, agendamento.pacienteId, EtapaFluxoClinico.ENTREVISTA_AGENDADA, context,
      );
    }

    return agendamento;
  }

  async list(query: ListAgendamentosQueryDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);

    const agendamentos = await this.agendamentos.list({
      clinicaId,
      medicoId: this.resolveMedicoIdFiltro(context.user, query.medicoId),
      pacienteId: query.pacienteId,
      modalidade: query.modalidade,
      dataInicio: query.dataInicio ? new Date(query.dataInicio) : undefined,
      dataFim: query.dataFim ? new Date(query.dataFim) : undefined,
      status: query.status,
    });

    await this.audit(AuditEvent.APPOINTMENT_LISTED, context, { clinicaId, quantidade: agendamentos.length });
    return this.comDadosDoPaciente(clinicaId, agendamentos);
  }

  async findOne(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const agendamento = await this.agendamentos.findById(resolvedClinicaId, id);

    if (!agendamento) throw new NotFoundException('Agendamento nao encontrado.');

    await this.audit(AuditEvent.APPOINTMENT_VIEWED, context, { clinicaId: resolvedClinicaId, agendamentoId: id });
    const [enriquecido] = await this.comDadosDoPaciente(resolvedClinicaId, [agendamento]);
    return enriquecido;
  }

  async update(id: string, dto: UpdateAgendamentoDto, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);

    const agendamento = await this.agendamentos.update(resolvedClinicaId, id, {
      medicoId: dto.medicoId,
      modalidade: dto.modalidade,
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

    if (agendamento.tipo === TipoAgendamento.ENTREVISTA) {
      await this.pacientesService.avancarEtapaFluxo(
        resolvedClinicaId, agendamento.pacienteId, EtapaFluxoClinico.AGUARDANDO_DOCUMENTOS, context,
      );
    }

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
      this.resolveMedicoIdFiltro(context.user, query.medicoId),
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
    return resolveTenantClinicaId(user, requestedClinicaId);
  }

  /**
   * O psicólogo enxerga só a própria agenda (pacientes do Projeto PSI já são
   * isolados por profissional individualmente) — ignora qualquer `medicoId`
   * pedido na query e força o próprio id. Demais papéis mantêm a agenda
   * compartilhada da clínica (fluxo clínico passa por vários profissionais).
   */
  private resolveMedicoIdFiltro(user: AuthTokenPayload, medicoIdSolicitado?: string): string | undefined {
    if (user.papel === Papel.PSICOLOGO) return user.sub;
    return medicoIdSolicitado;
  }

  /** Anexa nome e CPF do paciente a cada agendamento p/ identificação segura na
   * agenda — resolve em lote (evita N consultas) e tolera paciente inativado. */
  private async comDadosDoPaciente<T extends { pacienteId: string }>(
    clinicaId: string,
    agendamentos: T[],
  ): Promise<Array<T & { pacienteNome?: string; pacienteCpf?: string }>> {
    if (agendamentos.length === 0) return [];
    const resumo = await this.pacientesService.resumoPorIds(
      clinicaId,
      agendamentos.map((a) => a.pacienteId),
    );
    return agendamentos.map((a) => ({
      ...a,
      pacienteNome: resumo.get(a.pacienteId)?.nome,
      pacienteCpf: resumo.get(a.pacienteId)?.cpf,
    }));
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
