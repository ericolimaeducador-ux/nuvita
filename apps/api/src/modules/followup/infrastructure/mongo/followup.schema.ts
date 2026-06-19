import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { StatusElegibilidade } from '../../domain/followup.entity';

export type FollowUpDocument = HydratedDocument<FollowUpMongo>;

@Schema({ collection: 'followups', versionKey: false })
export class FollowUpMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true, index: true })
  avaliacaoIuId!: string;

  @Prop({ required: true, index: true })
  enfermeiroId!: string;

  @Prop({ required: true, index: true })
  dataFollowup!: Date;

  @Prop({ required: true, enum: Object.values(StatusElegibilidade), index: true })
  statusElegibilidade!: StatusElegibilidade;

  @Prop({ required: true })
  observacoes!: string;

  @Prop()
  proximoFollowup?: Date;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;

  @Prop({ default: Date.now })
  atualizadoEm!: Date;
}

export const FollowUpSchema = SchemaFactory.createForClass(FollowUpMongo);
FollowUpSchema.index({ clinicaId: 1, pacienteId: 1, dataFollowup: -1 });
FollowUpSchema.index({ clinicaId: 1, avaliacaoIuId: 1 });
