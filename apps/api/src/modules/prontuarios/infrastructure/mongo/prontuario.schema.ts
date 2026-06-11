import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { TipoAtendimento } from '../../domain/prontuario.entity';

export type ProntuarioDocument = HydratedDocument<ProntuarioMongo>;
export type ProntuarioAddendumDocument = HydratedDocument<ProntuarioAddendumMongo>;
export type Cid10Document = HydratedDocument<Cid10Mongo>;

@Schema({ _id: false, versionKey: false })
class AssinaturaMongo {
  @Prop({ required: true })
  medicoId!: string;

  @Prop({ required: true })
  dataAssinatura!: Date;

  @Prop({ required: true })
  hash!: string;
}

@Schema({ collection: 'prontuarios', versionKey: false })
export class ProntuarioMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true, index: true })
  medicoId!: string;

  @Prop({ index: true })
  agendamentoId?: string;

  @Prop({ required: true, index: true })
  dataAtendimento!: Date;

  @Prop({ required: true, enum: Object.values(TipoAtendimento), index: true })
  tipo!: TipoAtendimento;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  subjetivo!: Record<string, unknown>;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  objetivo!: Record<string, unknown>;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  avaliacao!: Record<string, unknown>;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  plano!: Record<string, unknown>;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  arquivos!: Record<string, unknown>[];

  @Prop({ type: SchemaFactory.createForClass(AssinaturaMongo) })
  assinado?: AssinaturaMongo;

  @Prop({ default: Date.now, immutable: true, index: true })
  criadoEm!: Date;

  @Prop({ default: Date.now, index: true })
  atualizadoEm!: Date;
}

export const ProntuarioSchema = SchemaFactory.createForClass(ProntuarioMongo);
ProntuarioSchema.index({ clinicaId: 1, _id: 1 });
ProntuarioSchema.index({ clinicaId: 1, pacienteId: 1, dataAtendimento: -1 });

function rejectDelete(next: (error?: Error) => void): void {
  next(new Error('Medical records have mandatory 20-year retention and cannot be deleted.'));
}

ProntuarioSchema.pre('deleteOne', rejectDelete);
ProntuarioSchema.pre('deleteMany', rejectDelete);
ProntuarioSchema.pre('findOneAndDelete', rejectDelete);

@Schema({ collection: 'prontuario_addendums', versionKey: false })
export class ProntuarioAddendumMongo {
  @Prop({ required: true, index: true })
  prontuarioId!: string;

  @Prop({ required: true, index: true })
  medicoId!: string;

  @Prop({ required: true })
  texto!: string;

  @Prop({ default: Date.now, immutable: true, index: true })
  criadoEm!: Date;
}

export const ProntuarioAddendumSchema = SchemaFactory.createForClass(ProntuarioAddendumMongo);

function rejectAddendumMutation(next: (error?: Error) => void): void {
  next(new Error('Medical record addendums are append-only.'));
}

ProntuarioAddendumSchema.pre('updateOne', rejectAddendumMutation);
ProntuarioAddendumSchema.pre('updateMany', rejectAddendumMutation);
ProntuarioAddendumSchema.pre('findOneAndUpdate', rejectAddendumMutation);
ProntuarioAddendumSchema.pre('deleteOne', rejectAddendumMutation);
ProntuarioAddendumSchema.pre('deleteMany', rejectAddendumMutation);
ProntuarioAddendumSchema.pre('findOneAndDelete', rejectAddendumMutation);

@Schema({ collection: 'cid10', versionKey: false })
export class Cid10Mongo {
  @Prop({ required: true, unique: true, index: true })
  codigo!: string;

  @Prop({ required: true, index: true })
  descricao!: string;
}

export const Cid10Schema = SchemaFactory.createForClass(Cid10Mongo);
Cid10Schema.index({ codigo: 'text', descricao: 'text' });
