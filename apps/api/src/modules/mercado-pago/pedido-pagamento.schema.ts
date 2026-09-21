import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PedidoPagamentoDocument = HydratedDocument<PedidoPagamentoMongo>;

/**
 * Um pedido por preferência criada. O webhook atualiza o status a partir do pagamento
 * consultado na API do Mercado Pago. Não guarda dados do pagador (LGPD: minimização) e
 * NÃO aciona liberação de acesso: o provisionamento continua manual.
 */
@Schema({ collection: 'pedidos_pagamento', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } })
export class PedidoPagamentoMongo {
  /** UUID gerado por nós e enviado como external_reference. */
  @Prop({ required: true, unique: true }) externalReference!: string;
  @Prop({ required: true }) plano!: string;
  /** Valor esperado do plano, em reais. */
  @Prop({ required: true }) valor!: number;
  @Prop() preferenciaId?: string;
  /** "pendente" até a 1ª notificação; depois o status do Mercado Pago (approved, rejected...). */
  @Prop({ required: true, default: 'pendente' }) status!: string;
  @Prop() statusDetalhe?: string;
  @Prop({ index: true }) pagamentoId?: string;
  @Prop() metodoPagamento?: string;
  /** Valor efetivamente cobrado segundo o Mercado Pago. */
  @Prop() valorPago?: number;
  /** true se o valor pago diverge do esperado (pede conferência manual). */
  @Prop() divergenciaValor?: boolean;
  @Prop() aprovadoEm?: Date;
  @Prop() ultimaNotificacaoEm?: Date;
  criadoEm!: Date;
  atualizadoEm!: Date;
}

export const PedidoPagamentoSchema = SchemaFactory.createForClass(PedidoPagamentoMongo);
