import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { StatusChecklistDocumento } from '../../domain/checklist-documento.entity';

export type ChecklistDocumentoDocument = HydratedDocument<ChecklistDocumentoMongo>;

// Checklist administrativo de documentos pendentes/recebidos por paciente
// (uso da secretaria/admin), independente dos arquivos em si (módulo documentos).
@Schema({ collection: 'checklist_documentos_itens', versionKey: false })
export class ChecklistDocumentoMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true, trim: true })
  nome!: string;

  @Prop({ required: true, enum: Object.values(StatusChecklistDocumento), default: StatusChecklistDocumento.PENDENTE })
  status!: StatusChecklistDocumento;

  @Prop()
  observacao?: string;

  @Prop({ required: true })
  criadoPor!: string;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;

  @Prop({ default: Date.now })
  atualizadoEm!: Date;
}

export const ChecklistDocumentoSchema = SchemaFactory.createForClass(ChecklistDocumentoMongo);
ChecklistDocumentoSchema.index({ clinicaId: 1, pacienteId: 1, criadoEm: -1 });
