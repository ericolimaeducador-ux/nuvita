import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { PlanoClinica } from '../../domain/clinica.entity';

export type ClinicaDocument = HydratedDocument<ClinicaMongo>;

@Schema({ collection: 'clinicas', versionKey: false })
export class ClinicaMongo {
  @Prop({ required: true })
  nome!: string;

  @Prop({ required: true, unique: true, index: true })
  cnpj!: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  endereco?: Record<string, unknown>;

  @Prop({ required: true, enum: Object.values(PlanoClinica), index: true })
  plano!: PlanoClinica;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  configuracoes!: Record<string, unknown>;

  @Prop({ default: true, index: true })
  ativo!: boolean;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;
}

export const ClinicaSchema = SchemaFactory.createForClass(ClinicaMongo);
