import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { FormaPagamentoCobranca, StatusCobranca, TipoCobranca } from '../../domain/cobranca.entity';

export type CobrancaDocument = HydratedDocument<CobrancaMongo>;

// Coleção própria (NÃO a `lancamentos` do financeiro legado).
@Schema({ collection: 'cobrancas_paciente', versionKey: false })
export class CobrancaMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true, enum: Object.values(TipoCobranca) })
  tipo!: TipoCobranca;

  @Prop({ required: true, trim: true })
  descricao!: string;

  @Prop({ required: true, min: 0 })
  valorCentavos!: number;

  @Prop({
    type: [{ _id: false, descricao: { type: String, required: true }, valorCentavos: { type: Number, required: true, min: 0 } }],
    default: [],
  })
  itens!: Array<{ descricao: string; valorCentavos: number }>;

  @Prop({ enum: Object.values(FormaPagamentoCobranca) })
  formaPagamento?: FormaPagamentoCobranca;

  @Prop({ min: 1 })
  parcelas?: number;

  @Prop({ required: true, index: true })
  vencimento!: Date;

  // `vencida` é derivada na leitura e NUNCA gravada.
  @Prop({
    required: true,
    enum: [StatusCobranca.PENDENTE, StatusCobranca.ENVIADA, StatusCobranca.PAGA, StatusCobranca.CANCELADA],
    default: StatusCobranca.PENDENTE,
    index: true,
  })
  status!: StatusCobranca;

  @Prop()
  atendimentoId?: string;

  @Prop()
  planoId?: string;

  @Prop()
  consultaId?: string;

  @Prop({ required: true })
  criadoPor!: string;

  @Prop()
  enviadaEm?: Date;

  @Prop({ index: true })
  pagaEm?: Date;

  @Prop()
  pagoPor?: string;

  @Prop()
  canceladaEm?: Date;

  @Prop()
  canceladoPor?: string;

  @Prop()
  motivoCancelamento?: string;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;

  @Prop({ default: Date.now })
  atualizadoEm!: Date;
}

export const CobrancaSchema = SchemaFactory.createForClass(CobrancaMongo);
CobrancaSchema.index({ clinicaId: 1, pacienteId: 1, vencimento: -1 });
CobrancaSchema.index({ clinicaId: 1, vencimento: 1 });
CobrancaSchema.index({ clinicaId: 1, pagaEm: 1 });
// Idempotência da cobrança da consulta: no máximo uma por consulta (só cobranças que TÊM consultaId entram no índice).
CobrancaSchema.index(
  { consultaId: 1 },
  { unique: true, partialFilterExpression: { consultaId: { $type: 'string' } } },
);
