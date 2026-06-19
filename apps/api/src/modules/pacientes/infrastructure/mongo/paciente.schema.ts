import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Sexo } from '../../domain/paciente.entity';

export type PacienteDocument = HydratedDocument<PacienteMongo>;

@Schema({ _id: false, versionKey: false })
export class ConsentimentoLGPDMongo {
  @Prop({ required: true })
  aceito!: boolean;

  @Prop({ required: true })
  dataAceite!: Date;

  @Prop({ required: true })
  versao!: string;
}

const ConsentimentoLGPDSchema = SchemaFactory.createForClass(ConsentimentoLGPDMongo);

@Schema({ collection: 'pacientes', versionKey: false })
export class PacienteMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, trim: true, index: true })
  nome!: string;

  @Prop({ required: true })
  cpf!: string;

  @Prop({ required: true, index: true })
  cpfHash!: string;

  @Prop({ required: true })
  dataNascimento!: Date;

  @Prop({ required: true, enum: Object.values(Sexo), index: true })
  sexo!: Sexo;

  @Prop()
  telefone?: string;

  @Prop()
  email?: string;

  @Prop()
  endereco?: string;

  @Prop()
  convenio?: string;

  @Prop({ required: true, type: ConsentimentoLGPDSchema })
  consentimentoLGPD!: ConsentimentoLGPDMongo;

  @Prop({ default: false, index: true })
  programaVaPro?: boolean;

  @Prop({ default: true, index: true })
  ativo!: boolean;

  @Prop({ default: Date.now, immutable: true, index: true })
  criadoEm!: Date;

  @Prop({ default: Date.now, index: true })
  atualizadoEm!: Date;
}

export const PacienteSchema = SchemaFactory.createForClass(PacienteMongo);

PacienteSchema.index({ clinicaId: 1, _id: 1 });
PacienteSchema.index({ clinicaId: 1, cpfHash: 1 }, { unique: true });
PacienteSchema.index({ clinicaId: 1, ativo: 1, criadoEm: -1, _id: -1 });
