import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { StatusLaudoMedico } from '../../domain/laudo-medico.entity';

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

  @Prop({ index: true })
  medicoId?: string;

  @Prop({ required: true, index: true })
  criadoPorId!: string;

  @Prop()
  criadoPorNome?: string;

  @Prop({ required: true })
  criadoPorPapel!: string;

  @Prop({ required: true, enum: StatusLaudoMedico, default: StatusLaudoMedico.RASCUNHO, index: true })
  status!: StatusLaudoMedico;

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
LaudoMedicoSchema.index({ clinicaId: 1, status: 1 });

function rejectDelete(next: (error?: Error) => void): void {
  next(new Error('Laudos médicos têm retenção obrigatória e não podem ser deletados.'));
}

LaudoMedicoSchema.pre('deleteOne', rejectDelete);
LaudoMedicoSchema.pre('deleteMany', rejectDelete);
LaudoMedicoSchema.pre('findOneAndDelete', rejectDelete);
