import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { AuditEvent } from '../../domain/audit-event.enum';

export type AuditLogDocument = HydratedDocument<AuditLogMongo>;

@Schema({ collection: 'audit_logs', versionKey: false })
export class AuditLogMongo {
  @Prop({ type: String, required: true, enum: Object.values(AuditEvent), index: true, immutable: true })
  event!: AuditEvent;

  @Prop({ index: true, immutable: true })
  userId?: string;

  @Prop({ index: true, immutable: true })
  clinicaId?: string;

  @Prop({ lowercase: true, trim: true, index: true, immutable: true })
  email?: string;

  @Prop({ required: true, immutable: true })
  ip!: string;

  @Prop({ required: true, immutable: true })
  userAgent!: string;

  @Prop({ required: true, default: Date.now, index: true, immutable: true })
  timestamp!: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, immutable: true })
  metadata?: Record<string, unknown>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLogMongo);
AuditLogSchema.index({ clinicaId: 1, _id: 1 });

function rejectAuditLogMutation(next: (error?: Error) => void): void {
  next(new Error('Audit log is immutable and cannot be updated or deleted.'));
}

AuditLogSchema.pre('updateOne', rejectAuditLogMutation);
AuditLogSchema.pre('findOneAndUpdate', rejectAuditLogMutation);
AuditLogSchema.pre('updateMany', rejectAuditLogMutation);
AuditLogSchema.pre('deleteOne', rejectAuditLogMutation);
AuditLogSchema.pre('deleteMany', rejectAuditLogMutation);
