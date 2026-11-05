import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TipoDocumentoEmitido } from '../../domain/documento-emitido.entity';

export type DocumentoEmitidoDocument = HydratedDocument<DocumentoEmitidoMongo>;

@Schema({ collection: 'documentos_emitidos', versionKey: false })
export class DocumentoEmitidoMongo {
  @Prop({ required: true, index: true, immutable: true })
  clinicaId!: string;

  @Prop({ required: true, index: true, immutable: true })
  pacienteId!: string;

  @Prop({ required: true, index: true, immutable: true })
  agendamentoId!: string;

  @Prop({ required: true, enum: Object.values(TipoDocumentoEmitido), immutable: true })
  tipo!: TipoDocumentoEmitido;

  @Prop({ required: true, immutable: true })
  emitidoPor!: string;

  @Prop({ required: true, immutable: true })
  emitidoEm!: Date;

  @Prop({ required: true, unique: true, immutable: true })
  protocolo!: string;
}

export const DocumentoEmitidoSchema = SchemaFactory.createForClass(DocumentoEmitidoMongo);
