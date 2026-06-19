import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type LaudoMedicoDocument = HydratedDocument<LaudoMedicoMongo>;

@Schema({ _id: false, versionKey: false })
class AssinaturaLaudoMongo {
  @Prop({ required: true })
  medicoId!: string;

  @Prop()
  crmNumero?: string;

  @Prop({ required: true })
  dataAssinatura!: Date;

  @Prop({ required: true })
  hash!: string;
}

@Schema({ collection: 'laudos_medicos', versionKey: false })
export class LaudoMedicoMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true, index: true })
  medicoId!: string;

  @Prop({ required: true, index: true })
  avaliacaoIuId!: string;

  @Prop({ required: true, index: true })
  dataLaudo!: Date;

  @Prop({ type: [String], default: [] })
  cid10!: string[];

  @Prop({ required: true })
  justificativaMedica!: string;

  @Prop({ required: true })
  fundamentoLegal!: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  produtosSolicitados!: Record<string, unknown>[];

  @Prop({ type: SchemaFactory.createForClass(AssinaturaLaudoMongo) })
  assinado?: AssinaturaLaudoMongo;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;

  @Prop({ default: Date.now })
  atualizadoEm!: Date;
}

export const LaudoMedicoSchema = SchemaFactory.createForClass(LaudoMedicoMongo);
LaudoMedicoSchema.index({ clinicaId: 1, pacienteId: 1, dataLaudo: -1 });

function rejectDelete(next: (error?: Error) => void): void {
  next(new Error('Laudos médicos têm retenção obrigatória e não podem ser deletados.'));
}

LaudoMedicoSchema.pre('deleteOne', rejectDelete);
LaudoMedicoSchema.pre('deleteMany', rejectDelete);
LaudoMedicoSchema.pre('findOneAndDelete', rejectDelete);
