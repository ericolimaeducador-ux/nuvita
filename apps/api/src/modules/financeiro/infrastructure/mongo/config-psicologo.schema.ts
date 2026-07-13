import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConfigPsicologoDocument = HydratedDocument<ConfigPsicologoMongo>;

@Schema({ collection: 'config_psicologo', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } })
export class ConfigPsicologoMongo {
  @Prop({ required: true, index: true }) clinicaId!: string;
  @Prop({ required: true, index: true }) profissionalId!: string;
  @Prop({ required: true }) valorSessao!: number;
  atualizadoEm!: Date;
}

export const ConfigPsicologoSchema = SchemaFactory.createForClass(ConfigPsicologoMongo);

ConfigPsicologoSchema.index({ clinicaId: 1, profissionalId: 1 }, { unique: true });
