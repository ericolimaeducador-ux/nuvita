import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FinanceiroConfigDocument = HydratedDocument<FinanceiroConfigMongo>;

// Doc de configuração do financeiro POR CLÍNICA (um por clinicaId).
@Schema({ collection: 'financeiro_config', versionKey: false })
export class FinanceiroConfigMongo {
  @Prop({ required: true, unique: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, min: 0 })
  valorConsultaAvaliacaoCentavos!: number;

  @Prop()
  atualizadoPor?: string;

  @Prop({ default: Date.now })
  atualizadoEm!: Date;
}

export const FinanceiroConfigSchema = SchemaFactory.createForClass(FinanceiroConfigMongo);
