import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ProjetoPaciente, Sexo } from '../../domain/paciente.entity';
import { EtapaFluxoClinico } from '../../../../../../../packages/shared/src/fluxo-clinico';

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

  @Prop()
  cpf?: string;

  @Prop({ index: true })
  cpfHash?: string;

  @Prop()
  dataNascimento?: Date;

  @Prop({ enum: Object.values(Sexo), index: true })
  sexo?: Sexo;

  @Prop()
  telefone?: string;

  @Prop()
  email?: string;

  @Prop()
  endereco?: string;

  @Prop()
  convenio?: string;

  @Prop({ type: ConsentimentoLGPDSchema })
  consentimentoLGPD?: ConsentimentoLGPDMongo;

  @Prop({ default: false, index: true })
  programaIU?: boolean;

  // Rótulo neutro (Alpha/Beta) — não criptografado, não é dado sensível.
  @Prop({ enum: Object.values(ProjetoPaciente), index: true })
  projeto?: ProjetoPaciente;

  // Texto livre, criptografado (mesmo padrão de telefone/email/endereco) —
  // qualquer profissional de atendimento pode escrever, ver PATCH /observacoes.
  @Prop()
  observacoes?: string;

  @Prop({
    required: true,
    enum: Object.values(EtapaFluxoClinico),
    default: EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO,
    index: true,
  })
  etapaFluxo!: EtapaFluxoClinico;

  @Prop({ required: true, default: Date.now })
  etapaFluxoDesde!: Date;

  @Prop({ default: true, index: true })
  ativo!: boolean;

  @Prop({ default: Date.now, immutable: true, index: true })
  criadoEm!: Date;

  @Prop({ default: Date.now, index: true })
  atualizadoEm!: Date;
}

export const PacienteSchema = SchemaFactory.createForClass(PacienteMongo);

PacienteSchema.index({ clinicaId: 1, _id: 1 });
// `sparse` não basta aqui: em índice COMPOSTO o Mongo só pula o doc quando
// TODOS os campos estão ausentes, e clinicaId sempre existe — então todo
// paciente sem CPF entrava no índice com cpfHash:null e o 2º colidia.
// Índice parcial exige cpfHash realmente presente (string), como pretendido.
PacienteSchema.index(
  { clinicaId: 1, cpfHash: 1 },
  { unique: true, partialFilterExpression: { cpfHash: { $type: 'string' } } },
);
PacienteSchema.index({ clinicaId: 1, ativo: 1, criadoEm: -1, _id: -1 });
PacienteSchema.index({ clinicaId: 1, etapaFluxo: 1, criadoEm: -1 });
