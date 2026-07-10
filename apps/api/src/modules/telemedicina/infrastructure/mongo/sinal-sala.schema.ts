import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { PapelSala } from '../../domain/sala-evento.entity';
import { TipoSinal } from '../../domain/sinal-sala.entity';

export type SinalSalaDocument = HydratedDocument<SinalSalaMongo>;

@Schema({ collection: 'sinais_telemedicina', timestamps: { createdAt: 'criadoEm', updatedAt: false } })
export class SinalSalaMongo {
  @Prop({ required: true, index: true }) salaId!: string;
  @Prop({ required: true, enum: PapelSala }) de!: PapelSala;
  @Prop({ required: true, enum: TipoSinal }) tipo!: TipoSinal;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) payload!: unknown;
  criadoEm!: Date;
}

export const SinalSalaSchema = SchemaFactory.createForClass(SinalSalaMongo);

SinalSalaSchema.index({ salaId: 1, de: 1, _id: 1 });
// Sinalização é efêmera: expira sozinha bem depois do TTL da sala (4h).
SinalSalaSchema.index({ criadoEm: 1 }, { expireAfterSeconds: 6 * 60 * 60 });
