import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import {
  CanalNotificacao,
  StatusNotificacao,
  TipoNotificacao,
} from '../../domain/notificacao.entity';

export type NotificacaoDocument = HydratedDocument<NotificacaoMongo>;
export type NotificacaoPreferenciaDocument = HydratedDocument<NotificacaoPreferenciaMongo>;

@Schema({ collection: 'notificacoes', versionKey: false })
export class NotificacaoMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  destinatarioId!: string;

  @Prop({ required: true, enum: Object.values(TipoNotificacao), index: true })
  tipo!: TipoNotificacao;

  @Prop({ required: true, enum: Object.values(CanalNotificacao), index: true })
  canal!: CanalNotificacao;

  @Prop({ required: true, enum: Object.values(StatusNotificacao), default: StatusNotificacao.PENDENTE, index: true })
  status!: StatusNotificacao;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  conteudo!: Record<string, unknown>;

  @Prop({ default: 0 })
  tentativas!: number;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  erros!: Record<string, unknown>[];

  @Prop({ default: Date.now, immutable: true, index: true })
  criadoEm!: Date;

  @Prop()
  enviadoEm?: Date;
}

export const NotificacaoSchema = SchemaFactory.createForClass(NotificacaoMongo);
NotificacaoSchema.index({ clinicaId: 1, _id: 1 });
NotificacaoSchema.index({ clinicaId: 1, status: 1, criadoEm: -1 });
NotificacaoSchema.index({ clinicaId: 1, canal: 1, criadoEm: -1 });

@Schema({ collection: 'notificacao_preferencias', versionKey: false })
export class NotificacaoPreferenciaMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true, enum: Object.values(CanalNotificacao), type: [String], default: [] })
  canaisOptOut!: CanalNotificacao[];

  @Prop({ default: Date.now, index: true })
  atualizadoEm!: Date;
}

export const NotificacaoPreferenciaSchema = SchemaFactory.createForClass(NotificacaoPreferenciaMongo);
NotificacaoPreferenciaSchema.index({ clinicaId: 1, _id: 1 });
NotificacaoPreferenciaSchema.index({ clinicaId: 1, pacienteId: 1 }, { unique: true });
