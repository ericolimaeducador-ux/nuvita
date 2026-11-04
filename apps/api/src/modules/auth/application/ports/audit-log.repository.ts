import { AuditEvent } from '../../domain/audit-event.enum';

export interface CreateAuditLogInput {
  event: AuditEvent;
  userId?: string;
  /** Tenant do evento. Ausente: o repositório recorre a metadata.clinicaId (eventos antigos). */
  clinicaId?: string;
  email?: string;
  ip: string;
  userAgent: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  event: AuditEvent;
  userId?: string;
  email?: string;
  ip: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRepository {
  create(input: CreateAuditLogInput): Promise<void>;
  /** Mais recentes primeiro. Usado pelo painel do super-admin (quem está travado na recuperação de senha). */
  listarPorEventos(events: AuditEvent[], limite: number): Promise<AuditLogEntry[]>;
}
