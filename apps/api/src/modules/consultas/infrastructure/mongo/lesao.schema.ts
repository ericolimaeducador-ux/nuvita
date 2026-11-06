import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import {
  ETIOLOGIAS_LESAO,
  LADOS_LESAO,
  STATUS_LESAO,
  SUBTIPOS_LESAO_UMIDADE,
} from '../../../../../../../packages/shared/src/consulta';

export type LesaoDocument = HydratedDocument<LesaoMongo>;
export type ConsentimentoImagemDocument = HydratedDocument<ConsentimentoImagemMongo>;

// Lesões do paciente (etapa 5c). Nunca apagadas: status muda só pela assinatura de consulta; correções versionadas.
@Schema({ collection: 'lesoes', versionKey: false })
export class LesaoMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true })
  pacienteId!: string;

  @Prop({ required: true, min: 1 })
  numero!: number;

  @Prop({ required: true })
  localizacaoAnatomica!: string;

  @Prop({ required: true, enum: LADOS_LESAO })
  lado!: string;

  @Prop({ required: true, enum: ETIOLOGIAS_LESAO })
  etiologia!: string;

  @Prop({ enum: SUBTIPOS_LESAO_UMIDADE })
  subtipoUmidade?: string;

  @Prop()
  etiologiaOutra?: string;

  @Prop({ required: true })
  dataIdentificacao!: string;

  @Prop({ required: true, enum: STATUS_LESAO, default: 'ABERTA' })
  status!: string;

  @Prop()
  motivoEncerramento?: string;

  @Prop()
  statusConsultaId?: string;

  @Prop()
  statusAlteradoEm?: Date;

  @Prop()
  statusAlteradoPor?: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  correcoes!: Record<string, unknown>[];

  @Prop({ required: true, default: 1 })
  versao!: number;

  @Prop({ required: true })
  criadaPor!: string;

  @Prop({ default: Date.now, immutable: true })
  criadaEm!: Date;

  @Prop({ default: Date.now })
  atualizadaEm!: Date;
}

export const LesaoSchema = SchemaFactory.createForClass(LesaoMongo);
// Número sequencial por paciente, sem corrida: duas inserções com o mesmo número -> E11000 (o serviço tenta o próximo).
LesaoSchema.index({ pacienteId: 1, numero: 1 }, { unique: true });
LesaoSchema.index({ clinicaId: 1, pacienteId: 1, status: 1 });

// Consentimento de uso de imagem (fotos da ferida). Revogado, nunca removido.
@Schema({ collection: 'consentimentos_imagem', versionKey: false })
export class ConsentimentoImagemMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true })
  pacienteId!: string;

  @Prop({ required: true })
  obtidoEm!: Date;

  @Prop({ required: true })
  registradoPor!: string;

  @Prop({ type: Date, default: null })
  revogadoEm!: Date | null;

  @Prop({ type: String, default: null })
  revogadoPor!: string | null;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;
}

export const ConsentimentoImagemSchema = SchemaFactory.createForClass(ConsentimentoImagemMongo);
ConsentimentoImagemSchema.index({ clinicaId: 1, pacienteId: 1, criadoEm: -1 });
// No máximo UM consentimento vigente (não revogado) por paciente, sem corrida: o segundo registro simultâneo -> E11000.
ConsentimentoImagemSchema.index(
  { clinicaId: 1, pacienteId: 1 },
  { unique: true, partialFilterExpression: { revogadoEm: { $type: 'null' } }, name: 'consentimento_vigente_unico' },
);
