import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TicketStatus, TicketTipo } from '../../domain/ticket.entity';

export type TicketDocument = HydratedDocument<TicketMongo>;

@Schema({ collection: 'tickets', versionKey: false })
export class TicketMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true, enum: Object.values(TicketTipo), immutable: true })
  tipo!: TicketTipo;

  // Criptografado (AES-256-GCM, mesmo serviço dos dados do paciente): o texto livre
  // pode citar CPF/nome corretos do paciente.
  @Prop({ required: true, immutable: true })
  justificativa!: string;

  @Prop({ required: true, immutable: true })
  autorId!: string;

  @Prop({ required: true, enum: Object.values(TicketStatus), default: TicketStatus.ABERTO, index: true })
  status!: TicketStatus;

  @Prop({ required: true, immutable: true })
  abertoEm!: Date;

  @Prop()
  resolvidoEm?: Date;

  @Prop()
  resolvidoPor?: string;

  // Criptografado, pelo mesmo motivo da justificativa.
  @Prop()
  motivoRecusa?: string;

  // Posse exclusiva durante o atendimento (proteção contra dois SUPER_ADMINs no mesmo ticket).
  @Prop()
  reservadoPor?: string;

  @Prop()
  reservadoEm?: Date;
}

export const TicketSchema = SchemaFactory.createForClass(TicketMongo);
TicketSchema.index({ clinicaId: 1, status: 1, abertoEm: -1 });
TicketSchema.index({ clinicaId: 1, pacienteId: 1, abertoEm: -1 });
