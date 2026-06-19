import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { OrigemEntrega, StatusEntrega } from '../../domain/entrega.entity';

export type EntregaDocument = HydratedDocument<EntregaMongo>;

@Schema({ collection: 'entregas', versionKey: false })
export class EntregaMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ index: true })
  processoJuridicoId?: string;

  @Prop({ index: true })
  avaliacaoIuId?: string;

  @Prop({ required: true, index: true })
  responsavelId!: string;

  @Prop({ required: true, index: true })
  dataEntrega!: Date;

  @Prop({ required: true, enum: Object.values(OrigemEntrega), index: true })
  origem!: OrigemEntrega;

  @Prop({ required: true, enum: Object.values(StatusEntrega), default: StatusEntrega.PENDENTE, index: true })
  status!: StatusEntrega;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  itens!: Record<string, unknown>[];

  @Prop({ required: true })
  valorTotalCentavos!: number;

  @Prop()
  notaFiscal?: string;

  @Prop()
  observacoes?: string;

  @Prop()
  lancamentoFinanceiroId?: string;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;

  @Prop({ default: Date.now })
  atualizadoEm!: Date;
}

export const EntregaSchema = SchemaFactory.createForClass(EntregaMongo);
EntregaSchema.index({ clinicaId: 1, pacienteId: 1, dataEntrega: -1 });
EntregaSchema.index({ clinicaId: 1, status: 1 });
