import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { SALA_TELEMEDICINA_REPOSITORY } from '../telemedicina.constants';
import { ModalidadeAtendimento, SALA_TTL_HORAS, StatusSala } from '../domain/sala-telemedicina.entity';
import { CreateSalaDto } from './dto/create-sala.dto';
import { SalaTelemedicinaRepository } from './ports/sala-telemedicina.repository';

export interface RequestAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

@Injectable()
export class TelemedicinaService {
  constructor(
    @Inject(SALA_TELEMEDICINA_REPOSITORY) private readonly salas: SalaTelemedicinaRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
  ) {}

  async createSala(dto: CreateSalaDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SALA_TTL_HORAS);

    const sala = await this.salas.create({
      clinicaId,
      agendamentoId: dto.agendamentoId,
      medicoId: context.user.sub,
      modalidade: dto.modalidade ?? ModalidadeAtendimento.MEDICO,
      pacienteId: dto.pacienteId,
      tokenMedico: randomUUID(),
      tokenPaciente: randomUUID(),
      expiresAt,
    });

    await this.audit(AuditEvent.TELEMEDICINE_ROOM_CREATED, context, { clinicaId, salaId: sala.id, modalidade: sala.modalidade });
    return sala;
  }

  async findById(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const sala = await this.salas.findById(resolvedClinicaId, id);

    if (!sala) throw new NotFoundException('Sala de telemedicina nao encontrada.');
    return sala;
  }

  async findByAgendamento(agendamentoId: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const sala = await this.salas.findByAgendamento(resolvedClinicaId, agendamentoId);

    if (!sala) throw new NotFoundException('Sala nao encontrada para este agendamento.');
    return sala;
  }

  async joinSala(id: string, context: RequestAuditContext) {
    const sala = await this.salas.findByToken(id);
    if (!sala) throw new NotFoundException('Token de sala invalido.');

    if (sala.status === StatusSala.ENCERRADA || sala.status === StatusSala.EXPIRADA) {
      throw new ForbiddenException('Sala encerrada ou expirada.');
    }

    if (new Date() > sala.expiresAt) {
      await this.salas.updateStatus(sala.clinicaId, sala.id, StatusSala.EXPIRADA);
      throw new ForbiddenException('Sala expirada.');
    }

    const isMedico = context.user.sub === sala.medicoId && id === sala.tokenMedico;
    const isPaciente = context.user.sub === sala.pacienteId && id === sala.tokenPaciente;

    if (!isMedico && !isPaciente) {
      throw new ForbiddenException('Token nao corresponde ao usuario autenticado.');
    }

    if (sala.status === StatusSala.AGUARDANDO) {
      await this.salas.updateStatus(sala.clinicaId, sala.id, StatusSala.EM_ANDAMENTO, new Date());
    }

    await this.audit(AuditEvent.TELEMEDICINE_ROOM_JOINED, context, {
      clinicaId: sala.clinicaId,
      salaId: sala.id,
      papel: isMedico ? 'medico' : 'paciente',
    });

    return { salaId: sala.id, papel: isMedico ? 'medico' : 'paciente' };
  }

  async encerrarSala(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);

    const sala = await this.salas.updateStatus(resolvedClinicaId, id, StatusSala.ENCERRADA, new Date());
    if (!sala) throw new NotFoundException('Sala nao encontrada.');

    await this.audit(AuditEvent.TELEMEDICINE_ROOM_ENDED, context, { clinicaId: resolvedClinicaId, salaId: id });
    return sala;
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
