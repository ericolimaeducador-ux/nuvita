import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ModalidadeAtendimento, StatusSala } from '../../domain/sala-telemedicina.entity';

export type SalaTelemedicinaDocument = HydratedDocument<SalaTelemedicinaMongo>;

@Schema({ collection: 'salas_telemedicina', timestamps: { createdAt: 'criadoEm' } })
export class SalaTelemedicinaMongo {
  @Prop({ required: true, index: true }) clinicaId!: string;
  @Prop({ required: true, index: true }) agendamentoId!: string;
  @Prop({ required: true, index: true }) medicoId!: string;
  @Prop({ required: true, enum: ModalidadeAtendimento, default: ModalidadeAtendimento.MEDICO, index: true }) modalidade!: ModalidadeAtendimento;
  @Prop({ required: true, index: true }) pacienteId!: string;
  @Prop({ required: true, enum: StatusSala, default: StatusSala.AGUARDANDO, index: true }) status!: StatusSala;
  @Prop({ required: true, unique: true, select: false }) tokenMedico!: string;
  @Prop({ required: true, unique: true, select: false }) tokenPaciente!: string;
  @Prop({ required: true, index: true }) expiresAt!: Date;
  @Prop() iniciadaEm?: Date;
  @Prop() encerradaEm?: Date;
  criadoEm!: Date;
}

export const SalaTelemedicinaSchema = SchemaFactory.createForClass(SalaTelemedicinaMongo);

SalaTelemedicinaSchema.index({ clinicaId: 1, agendamentoId: 1 });
SalaTelemedicinaSchema.index({ clinicaId: 1, status: 1 });
SalaTelemedicinaSchema.index({ clinicaId: 1, criadoEm: -1 });
// Sem TTL em expiresAt: o campo só invalida o link de acesso (ver
// salaAtivaPorToken/joinSala), a sala é o registro permanente do atendimento
// — apagá-la automaticamente órfã os eventos em eventos_telemedicina.
