import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ObservacaoPacienteDocument = HydratedDocument<ObservacaoPacienteMongo>;

// Timeline de observações livres sobre um paciente, escrita por qualquer
// profissional de atendimento. Cada observação é um registro isolado que
// guarda quem escreveu (autorEmail) e quando (criadoEm) — assim o histórico
// nunca se perde. Append-only: sem update/delete (mesmo padrão de
// anotacoes_juridicas e do addendum de prontuário).
@Schema({ collection: 'observacoes_paciente', versionKey: false })
export class ObservacaoPacienteMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true })
  autorId!: string;

  @Prop({ required: true })
  autorEmail!: string;

  @Prop({ required: true })
  texto!: string;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;
}

export const ObservacaoPacienteSchema = SchemaFactory.createForClass(ObservacaoPacienteMongo);
ObservacaoPacienteSchema.index({ clinicaId: 1, pacienteId: 1, criadoEm: -1 });

const rejectMutation = () => {
  throw new Error('Observacao de paciente e append-only.');
};
ObservacaoPacienteSchema.pre('updateOne', rejectMutation);
ObservacaoPacienteSchema.pre('updateMany', rejectMutation);
ObservacaoPacienteSchema.pre('findOneAndUpdate', rejectMutation);
ObservacaoPacienteSchema.pre('deleteOne', rejectMutation);
ObservacaoPacienteSchema.pre('deleteMany', rejectMutation);
ObservacaoPacienteSchema.pre('findOneAndDelete', rejectMutation);
