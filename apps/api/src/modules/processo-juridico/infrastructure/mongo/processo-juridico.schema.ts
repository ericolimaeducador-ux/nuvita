import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { StatusProcesso } from '../../domain/processo-juridico.entity';

export type ProcessoJuridicoDocument = HydratedDocument<ProcessoJuridicoMongo>;

@Schema({ collection: 'processos_juridicos', versionKey: false })
export class ProcessoJuridicoMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true, index: true })
  avaliacaoIuId!: string;

  @Prop({ required: true, index: true })
  laudoMedicoId!: string;

  @Prop({ required: true, index: true })
  advogadoId!: string;

  @Prop({ required: true, enum: Object.values(StatusProcesso), default: StatusProcesso.EM_PREPARACAO, index: true })
  status!: StatusProcesso;

  @Prop({ index: true })
  numeroProcesso?: string;

  @Prop()
  tribunal?: string;

  @Prop()
  dataProtocolo?: Date;

  @Prop()
  dataDecisao?: Date;

  @Prop()
  observacoes?: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  documentos!: Record<string, unknown>[];

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;

  @Prop({ default: Date.now })
  atualizadoEm!: Date;
}

export const ProcessoJuridicoSchema = SchemaFactory.createForClass(ProcessoJuridicoMongo);
ProcessoJuridicoSchema.index({ clinicaId: 1, pacienteId: 1 });
ProcessoJuridicoSchema.index({ clinicaId: 1, status: 1 });
