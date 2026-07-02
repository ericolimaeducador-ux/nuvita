import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AnotacaoJuridicaDocument = HydratedDocument<AnotacaoJuridicaMongo>;

// Timeline de anotações livres do jurídico sobre um paciente, independente do
// prontuário clínico (que é assinado/imutável e não é o lugar certo p/ isso).
// Append-only: sem update/delete, mesmo padrão do addendum de prontuário.
@Schema({ collection: 'anotacoes_juridicas', versionKey: false })
export class AnotacaoJuridicaMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true })
  autorId!: string;

  @Prop({ required: true })
  texto!: string;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;
}

export const AnotacaoJuridicaSchema = SchemaFactory.createForClass(AnotacaoJuridicaMongo);
AnotacaoJuridicaSchema.index({ clinicaId: 1, pacienteId: 1, criadoEm: -1 });

const rejectMutation = () => {
  throw new Error('Anotacao juridica e append-only.');
};
AnotacaoJuridicaSchema.pre('updateOne', rejectMutation);
AnotacaoJuridicaSchema.pre('updateMany', rejectMutation);
AnotacaoJuridicaSchema.pre('findOneAndUpdate', rejectMutation);
AnotacaoJuridicaSchema.pre('deleteOne', rejectMutation);
AnotacaoJuridicaSchema.pre('deleteMany', rejectMutation);
AnotacaoJuridicaSchema.pre('findOneAndDelete', rejectMutation);
