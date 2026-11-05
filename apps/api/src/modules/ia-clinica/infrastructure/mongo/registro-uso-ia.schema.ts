import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TipoUsoIA } from '../../domain/registro-uso-ia.enum';

export type RegistroUsoIaDocument = HydratedDocument<RegistroUsoIaMongo>;

/**
 * Trilha de auditoria de uso de IA — uma linha por sugestão gerada. Todos os
 * campos são immutable e a coleção é append-only: mesmo padrão do audit_logs
 * e das observacoes_paciente. Os campos de input e de output já chegam
 * cifrados ao repositório.
 */
@Schema({ collection: 'registros_uso_ia', versionKey: false })
export class RegistroUsoIaMongo {
  @Prop({ required: true, immutable: true })
  clinicaId!: string;

  @Prop({ required: true, immutable: true })
  usuarioId!: string;

  @Prop({ type: String, required: true, enum: Object.values(TipoUsoIA), immutable: true })
  tipo!: TipoUsoIA;

  @Prop({ required: true, immutable: true })
  modelo!: string;

  @Prop({ required: true, immutable: true })
  inputCifrado!: string;

  @Prop({ required: true, immutable: true })
  inputIv!: string;

  @Prop({ required: true, immutable: true })
  inputAuthTag!: string;

  @Prop({ required: true, immutable: true })
  outputCifrado!: string;

  @Prop({ required: true, immutable: true })
  outputIv!: string;

  @Prop({ required: true, immutable: true })
  outputAuthTag!: string;

  @Prop({ required: true, default: Date.now, immutable: true })
  criadoEm!: Date;
}

export const RegistroUsoIaSchema = SchemaFactory.createForClass(RegistroUsoIaMongo);
RegistroUsoIaSchema.index({ clinicaId: 1, usuarioId: 1, criadoEm: -1 });

function rejectRegistroUsoIaMutation(next: (error?: Error) => void): void {
  next(new Error('AI usage record is immutable and cannot be updated or deleted.'));
}

RegistroUsoIaSchema.pre('updateOne', rejectRegistroUsoIaMutation);
RegistroUsoIaSchema.pre('updateMany', rejectRegistroUsoIaMutation);
RegistroUsoIaSchema.pre('findOneAndUpdate', rejectRegistroUsoIaMutation);
RegistroUsoIaSchema.pre('deleteOne', rejectRegistroUsoIaMutation);
RegistroUsoIaSchema.pre('deleteMany', rejectRegistroUsoIaMutation);
RegistroUsoIaSchema.pre('findOneAndDelete', rejectRegistroUsoIaMutation);
