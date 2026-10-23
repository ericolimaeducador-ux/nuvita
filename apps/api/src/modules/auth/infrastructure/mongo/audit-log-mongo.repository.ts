import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLogEntry, AuditLogRepository, CreateAuditLogInput } from '../../application/ports/audit-log.repository';
import { AuditEvent } from '../../domain/audit-event.enum';
import { AuditLogDocument, AuditLogMongo } from './audit-log.schema';

@Injectable()
export class AuditLogMongoRepository implements AuditLogRepository {
  constructor(@InjectModel(AuditLogMongo.name) private readonly auditLogModel: Model<AuditLogDocument>) {}

  async create(input: CreateAuditLogInput): Promise<void> {
    await this.auditLogModel.create({
      event: input.event,
      userId: input.userId,
      clinicaId: typeof input.metadata?.clinicaId === 'string' ? input.metadata.clinicaId : undefined,
      email: input.email?.toLowerCase(),
      ip: input.ip,
      userAgent: input.userAgent,
      timestamp: input.timestamp ?? new Date(),
      metadata: input.metadata,
    });
  }

  async listarPorEventos(events: AuditEvent[], limite: number): Promise<AuditLogEntry[]> {
    const docs = await this.auditLogModel
      .find({ event: { $in: events } })
      .sort({ timestamp: -1 })
      .limit(limite)
      .lean()
      .exec();
    return docs.map((d) => ({
      event: d.event,
      userId: d.userId,
      email: d.email,
      ip: d.ip,
      timestamp: d.timestamp,
      metadata: d.metadata as Record<string, unknown> | undefined,
    }));
  }
}
