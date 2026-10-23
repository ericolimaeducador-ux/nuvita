import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateDocumentoEmitidoInput,
  DocumentoEmitidoRepository,
} from '../../application/ports/documento-emitido.repository';
import { DocumentoEmitido } from '../../domain/documento-emitido.entity';
import { DocumentoEmitidoDocument, DocumentoEmitidoMongo } from './documento-emitido.schema';

@Injectable()
export class DocumentoEmitidoMongoRepository implements DocumentoEmitidoRepository {
  constructor(
    @InjectModel(DocumentoEmitidoMongo.name) private readonly model: Model<DocumentoEmitidoDocument>,
  ) {}

  async create(input: CreateDocumentoEmitidoInput): Promise<DocumentoEmitido> {
    const doc = await this.model.create(input);
    return { ...input, id: doc._id.toString() };
  }
}
