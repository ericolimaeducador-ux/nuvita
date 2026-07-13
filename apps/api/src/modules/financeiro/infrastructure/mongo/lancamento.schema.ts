import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { FormaPagamento, OrigemLancamento, StatusLancamento, TipoLancamento } from '../../domain/lancamento.entity';

export type LancamentoDocument = HydratedDocument<LancamentoMongo>;

@Schema({ collection: 'lancamentos_financeiros', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } })
export class LancamentoMongo {
  @Prop({ required: true, index: true }) clinicaId!: string;
  @Prop({ index: true }) pacienteId?: string;
  @Prop({ index: true }) agendamentoId?: string;
  @Prop({ required: true, enum: TipoLancamento, index: true }) tipo!: TipoLancamento;
  @Prop({ required: true }) descricao!: string;
  @Prop({ required: true }) valor!: number;
  @Prop({ enum: FormaPagamento }) formaPagamento?: FormaPagamento;
  @Prop({ required: true, enum: StatusLancamento, default: StatusLancamento.PENDENTE, index: true }) status!: StatusLancamento;
  @Prop({ index: true }) vencimento?: Date;
  @Prop() recebidoEm?: Date;
  @Prop() observacoes?: string;
  // Lançamentos criados antes do módulo de psicologia não têm origem gravada —
  // o default cobre a leitura deles sem migração.
  @Prop({ required: true, enum: OrigemLancamento, default: OrigemLancamento.GERAL, index: true })
  origem!: OrigemLancamento;
  @Prop({ index: true }) profissionalId?: string;
  @Prop() ciclo?: number;
  @Prop({ required: true }) criadoPor!: string;
  criadoEm!: Date;
  atualizadoEm?: Date;
}

export const LancamentoSchema = SchemaFactory.createForClass(LancamentoMongo);

LancamentoSchema.index({ clinicaId: 1, status: 1, criadoEm: -1 });
LancamentoSchema.index({ clinicaId: 1, tipo: 1, criadoEm: -1 });
LancamentoSchema.index({ clinicaId: 1, vencimento: 1, status: 1 });
LancamentoSchema.index({ clinicaId: 1, origem: 1, profissionalId: 1, pacienteId: 1 });
