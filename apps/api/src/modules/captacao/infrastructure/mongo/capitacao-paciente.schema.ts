import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  CODIGOS_ENFERMEIRO_CAPTADOR,
  STATUS_CAPTACAO,
  type StatusCaptacao,
} from '../../captacao.constants';

export type CapitacaoPacienteDocument = HydratedDocument<CapitacaoPacienteMongo>;

/**
 * Fila isolada de captação em campo. CPF, telefone, e-mail e endereço ficam
 * criptografados (mesma chave de pacientes). A collection não mistura com
 * `pacientes` nem com `prontuarios`.
 */
@Schema({ collection: 'capitacao_paciente', versionKey: false })
export class CapitacaoPacienteMongo {
  @Prop({ trim: true })
  nome?: string;

  @Prop()
  cpf?: string;

  @Prop()
  cpfHash?: string;

  @Prop()
  dataNascimento?: Date;

  @Prop()
  endereco?: string;

  @Prop({ required: true })
  telefone!: string;

  @Prop()
  email?: string;

  @Prop({ required: true, enum: [...CODIGOS_ENFERMEIRO_CAPTADOR], index: true })
  codigoEnfermeiro!: string;

  @Prop({ required: true, enum: [...STATUS_CAPTACAO], default: 'pendente', index: true })
  status!: StatusCaptacao;

  @Prop({ required: true, default: Date.now, immutable: true, index: true })
  criadoEm!: Date;

  /** Trava curta para dois cliques em "Exportar" não cadastrarem o paciente duas vezes. */
  @Prop()
  exportandoEm?: Date;

  @Prop()
  exportadoEm?: Date;

  @Prop()
  pacienteId?: string;

  @Prop({ index: true })
  clinicaId?: string;
}

export const CapitacaoPacienteSchema = SchemaFactory.createForClass(CapitacaoPacienteMongo);

CapitacaoPacienteSchema.index({ status: 1, criadoEm: -1 });
// Um CPF só pode ter uma captação pendente. Depois de exportado, sai do índice
// e o mesmo CPF pode ser captado de novo se preciso.
CapitacaoPacienteSchema.index(
  { cpfHash: 1 },
  { unique: true, partialFilterExpression: { status: 'pendente', cpfHash: { $type: 'string' } } },
);
