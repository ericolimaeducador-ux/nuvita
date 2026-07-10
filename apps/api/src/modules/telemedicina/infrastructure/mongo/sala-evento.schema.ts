import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PapelSala, TipoEventoSala } from '../../domain/sala-evento.entity';

export type SalaEventoDocument = HydratedDocument<SalaEventoMongo>;

@Schema({ collection: 'eventos_telemedicina', timestamps: { createdAt: 'criadoEm', updatedAt: false } })
export class SalaEventoMongo {
  @Prop({ required: true, index: true }) clinicaId!: string;
  @Prop({ required: true, index: true }) salaId!: string;
  @Prop({ required: true, enum: PapelSala }) papel!: PapelSala;
  @Prop({ required: true, enum: TipoEventoSala }) tipo!: TipoEventoSala;
  @Prop() detalhes?: string;
  @Prop() ip?: string;
  @Prop() userAgent?: string;
  criadoEm!: Date;
}

export const SalaEventoSchema = SchemaFactory.createForClass(SalaEventoMongo);

SalaEventoSchema.index({ salaId: 1, criadoEm: 1 });
