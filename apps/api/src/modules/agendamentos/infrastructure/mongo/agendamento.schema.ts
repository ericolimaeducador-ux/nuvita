import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { StatusAgendamento, TipoAgendamento } from '../../domain/agendamento.entity';

export type AgendamentoDocument = HydratedDocument<AgendamentoMongo>;

@Schema({ collection: 'agendamentos', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } })
export class AgendamentoMongo {
  @Prop({ required: true, index: true }) clinicaId!: string;
  @Prop({ required: true, index: true }) pacienteId!: string;
  @Prop({ required: true, index: true }) medicoId!: string;
  @Prop({ required: true, index: true }) dataHoraInicio!: Date;
  @Prop({ required: true }) dataHoraFim!: Date;
  @Prop({ required: true, enum: TipoAgendamento }) tipo!: TipoAgendamento;
  @Prop({ required: true, enum: StatusAgendamento, default: StatusAgendamento.AGENDADO, index: true }) status!: StatusAgendamento;
  @Prop() observacoes?: string;
  @Prop() motivoCancelamento?: string;
  @Prop({ required: true }) criadoPor!: string;
  criadoEm!: Date;
  atualizadoEm?: Date;
}

export const AgendamentoSchema = SchemaFactory.createForClass(AgendamentoMongo);

AgendamentoSchema.index({ clinicaId: 1, dataHoraInicio: 1 });
AgendamentoSchema.index({ clinicaId: 1, medicoId: 1, dataHoraInicio: 1 });
AgendamentoSchema.index({ clinicaId: 1, pacienteId: 1, dataHoraInicio: -1 });
AgendamentoSchema.index({ clinicaId: 1, status: 1, dataHoraInicio: 1 });

export type BloqueioAgendaDocument = HydratedDocument<BloqueioAgendaMongo>;

@Schema({ collection: 'bloqueios_agenda', timestamps: { createdAt: 'criadoEm' } })
export class BloqueioAgendaMongo {
  @Prop({ required: true, index: true }) clinicaId!: string;
  @Prop({ required: true, index: true }) medicoId!: string;
  @Prop({ required: true, index: true }) dataHoraInicio!: Date;
  @Prop({ required: true }) dataHoraFim!: Date;
  @Prop() motivo?: string;
  @Prop({ required: true }) criadoPor!: string;
  criadoEm!: Date;
}

export const BloqueioAgendaSchema = SchemaFactory.createForClass(BloqueioAgendaMongo);
BloqueioAgendaSchema.index({ clinicaId: 1, medicoId: 1, dataHoraInicio: 1 });
