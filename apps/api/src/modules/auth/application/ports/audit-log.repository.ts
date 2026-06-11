import { AuditEvent } from '../../domain/audit-event.enum';

export interface CreateAuditLogInput {
  event: AuditEvent;
  userId?: string;
  email?: string;
  ip: string;
  userAgent: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRepository {
  create(input: CreateAuditLogInput): Promise<void>;
}
