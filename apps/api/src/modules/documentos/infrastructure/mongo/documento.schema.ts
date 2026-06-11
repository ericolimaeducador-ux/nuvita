import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  AllowedDocumentMimeType,
  TipoDocumento,
} from '../../domain/documento.entity';

export type DocumentoDocument = HydratedDocument<DocumentoMongo>;

@Schema({ collection: 'documentos', versionKey: false })
export class DocumentoMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ index: true })
  prontuarioId?: string;

  @Prop({ required: true })
  nome!: string;

  @Prop({ required: true, enum: Object.values(TipoDocumento), index: true })
  tipo!: TipoDocumento;

  @Prop({ required: true, enum: [...ALLOWED_DOCUMENT_MIME_TYPES] })
  mimeType!: AllowedDocumentMimeType;

  @Prop({ required: true, min: 1 })
  tamanho!: number;

  @Prop({ required: true })
  url!: string;

  @Prop({ required: true, index: true })
  hash!: string;

  @Prop({ required: true, index: true })
  uploadPor!: string;

  @Prop()
  thumbnailUrl?: string;

  @Prop({ default: Date.now, immutable: true, index: true })
  criadoEm!: Date;

  @Prop({ index: true })
  excluidoEm?: Date;

  @Prop()
  excluidoPor?: string;
}

export const DocumentoSchema = SchemaFactory.createForClass(DocumentoMongo);
DocumentoSchema.index({ clinicaId: 1, _id: 1 });
DocumentoSchema.index({ clinicaId: 1, pacienteId: 1, criadoEm: -1 });
DocumentoSchema.index({ clinicaId: 1, prontuarioId: 1, criadoEm: -1 });
