import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DecisaoUsoIA } from '../../domain/registro-uso-ia.enum';

export type DecisaoUsoIaDocument = HydratedDocument<DecisaoUsoIaMongo>;

/**
 * Decisão humana sobre uma sugestão da IA. Append-only, todos os campos
 * immutable. O índice único em registroUsoIaId garante, no banco, no máximo
 * uma decisão por registro — mesma ideia do "prontuário já assinado".
 */
@Schema({ collection: 'decisoes_uso_ia', versionKey: false })
export class DecisaoUsoIaMongo {
  @Prop({ required: true, immutable: true })
  registroUsoIaId!: string;

  @Prop({ required: true, immutable: true })
  usuarioId!: string;

  // Escopo de tenant na própria decisão. Decisões antigas (só demonstração) não têm o campo: conhecido e aceito.
  @Prop({ required: true, immutable: true, index: true })
  clinicaId!: string;

  @Prop({ type: String, required: true, enum: Object.values(DecisaoUsoIA), immutable: true })
  decisao!: DecisaoUsoIA;

  @Prop({ required: true, default: Date.now, immutable: true })
  decididoEm!: Date;
}

export const DecisaoUsoIaSchema = SchemaFactory.createForClass(DecisaoUsoIaMongo);
DecisaoUsoIaSchema.index({ registroUsoIaId: 1 }, { unique: true });

function rejectDecisaoUsoIaMutation(next: (error?: Error) => void): void {
  next(new Error('AI usage decision is immutable and cannot be updated or deleted.'));
}

DecisaoUsoIaSchema.pre('updateOne', rejectDecisaoUsoIaMutation);
DecisaoUsoIaSchema.pre('updateMany', rejectDecisaoUsoIaMutation);
DecisaoUsoIaSchema.pre('findOneAndUpdate', rejectDecisaoUsoIaMutation);
DecisaoUsoIaSchema.pre('deleteOne', rejectDecisaoUsoIaMutation);
DecisaoUsoIaSchema.pre('deleteMany', rejectDecisaoUsoIaMutation);
DecisaoUsoIaSchema.pre('findOneAndDelete', rejectDecisaoUsoIaMutation);
