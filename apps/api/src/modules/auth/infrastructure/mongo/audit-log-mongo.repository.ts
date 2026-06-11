import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLogRepository, CreateAuditLogInput } from '../../application/ports/audit-log.repository';
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
}
