import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { TipoDocumentoFiscal } from '../../../../../../../packages/shared/src/documentos';
import { PlanoClinica } from '../../domain/clinica.entity';

export type ClinicaDocument = HydratedDocument<ClinicaMongo>;

@Schema({ collection: 'clinicas', versionKey: false })
export class ClinicaMongo {
  @Prop({ required: true })
  nome!: string;

  /**
   * Documento fiscal da clínica (CNPJ ou CPF), normalizado. O nome do campo continua
   * `cnpj` por compatibilidade: dados e índice único já existentes em produção.
   * CPF (11 dígitos) e CNPJ (14 caracteres) nunca colidem nesse índice.
   */
  @Prop({ required: true, unique: true, index: true })
  cnpj!: string;

  /** Ausente nas clínicas criadas antes desta mudança: tratadas como CNPJ. */
  @Prop({ enum: Object.values(TipoDocumentoFiscal) })
  tipoDocumento?: TipoDocumentoFiscal;

  @Prop({ type: MongooseSchema.Types.Mixed })
  endereco?: Record<string, unknown>;

  @Prop({ required: true, enum: Object.values(PlanoClinica), index: true })
  plano!: PlanoClinica;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  configuracoes!: Record<string, unknown>;

  @Prop({ default: true, index: true })
  ativo!: boolean;

  /** Teste beta: termo exigido é o Termo de Teste. Ausente em docs antigos = false. */
  @Prop({ default: false })
  faseTeste!: boolean;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;
}

export const ClinicaSchema = SchemaFactory.createForClass(ClinicaMongo);
