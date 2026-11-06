import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { StatusConsulta } from '../../domain/consulta-enfermagem.entity';

export type ConsultaDocument = HydratedDocument<ConsultaMongo>;
export type AdendoConsultaDocument = HydratedDocument<AdendoConsultaMongo>;

// Coleção própria: o prontuário herdado (prontuarios, com registroPsicologico etc.) fica intacto e somente leitura.
// Nada aqui é apagado fisicamente.
@Schema({ collection: 'consultas_enfermagem', versionKey: false })
export class ConsultaMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true, index: true })
  enfermeiroId!: string;

  @Prop({ required: true, enum: Object.values(StatusConsulta), default: StatusConsulta.RASCUNHO, index: true })
  status!: StatusConsulta;

  // As 5 etapas: estrutura livre validada pelos DTOs (os módulos da Avaliação, pela definição de cada área).
  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  avaliacao!: Record<string, unknown>;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  diagnosticos!: Record<string, unknown>[];

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  planejamento!: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  implementacao!: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  evolucao!: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  assinatura?: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  cobranca?: Record<string, unknown>;

  @Prop({ enum: ['APLICADO', 'PENDENTE_APLICACAO'] })
  desfechoLesoesStatus?: string;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;

  @Prop({ default: Date.now })
  atualizadoEm!: Date;
}

export const ConsultaSchema = SchemaFactory.createForClass(ConsultaMongo);
ConsultaSchema.index({ clinicaId: 1, pacienteId: 1, criadoEm: -1 });
// Consultas assinadas com cobrança pendente de geração (para achar e reprocessar).
ConsultaSchema.index({ clinicaId: 1, 'cobranca.status': 1 });

@Schema({ collection: 'consultas_enfermagem_adendos', versionKey: false })
export class AdendoConsultaMongo {
  @Prop({ required: true, index: true })
  consultaId!: string;

  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, min: 1 })
  numero!: number;

  @Prop({ required: true })
  autorId!: string;

  @Prop({ required: true })
  motivo!: string;

  @Prop({ required: true })
  texto!: string;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;
}

export const AdendoConsultaSchema = SchemaFactory.createForClass(AdendoConsultaMongo);
// Número sequencial por consulta, sem corrida: duas inserções com o mesmo número -> E11000 (o serviço tenta o próximo).
AdendoConsultaSchema.index({ consultaId: 1, numero: 1 }, { unique: true });

export type AnexoConsultaDocument = HydratedDocument<AnexoConsultaMongo>;

// Anexos da consulta (ex.: foto/PDF do diário em papel). Coleção própria: NÃO aparecem em GET /documentos e não têm rota de
// exclusão (anexo de consulta assinada nunca é apagado). Reaproveita só o storage R2 do módulo documentos.
@Schema({ collection: 'consultas_enfermagem_anexos', versionKey: false })
export class AnexoConsultaMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  consultaId!: string;

  @Prop({ required: true })
  pacienteId!: string;

  @Prop({ required: true, enum: ['application/pdf', 'image/jpeg', 'image/png'] })
  mimeType!: string;

  @Prop({ required: true, min: 1 })
  tamanho!: number;

  @Prop({ required: true })
  hash!: string;

  @Prop({ required: true })
  url!: string;

  @Prop({ required: true })
  enviadoPor!: string;

  // Foto de ferida (5c): lesão a que a foto pertence.
  @Prop()
  lesaoId?: string;

  @Prop({ type: Date, default: null })
  confirmadoEm!: Date | null;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;
}

export const AnexoConsultaSchema = SchemaFactory.createForClass(AnexoConsultaMongo);
AnexoConsultaSchema.index({ clinicaId: 1, consultaId: 1, criadoEm: 1 });
