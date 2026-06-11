import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateDocumentoInput,
  DocumentoRepository,
  ListDocumentoInput,
} from '../../application/ports/documento.repository';
import { Documento } from '../../domain/documento.entity';
import { DocumentoDocument, DocumentoMongo } from './documento.schema';

@Injectable()
export class DocumentoMongoRepository implements DocumentoRepository {
  constructor(@InjectModel(DocumentoMongo.name) private readonly model: Model<DocumentoDocument>) {}

  async create(input: CreateDocumentoInput): Promise<Documento> {
    const created = await this.model.create(input);
    return this.toEntity(created);
  }

  async findById(clinicaId: string, documentoId: string, incluirExcluidos = false): Promise<Documento | null> {
    const document = await this.model
      .findOne({
        _id: documentoId,
        clinicaId,
        ...(incluirExcluidos ? {} : { excluidoEm: { $exists: false } }),
      })
      .exec();

    return document ? this.toEntity(document) : null;
  }

  async list(input: ListDocumentoInput): Promise<Documento[]> {
    const documents = await this.model
      .find({
        clinicaId: input.clinicaId,
        ...(input.pacienteId ? { pacienteId: input.pacienteId } : {}),
        ...(input.prontuarioId ? { prontuarioId: input.prontuarioId } : {}),
        excluidoEm: { $exists: false },
      })
      .sort({ criadoEm: -1 })
      .exec();

    return documents.map((document) => this.toEntity(document));
  }

  async sumActivePatientBytes(clinicaId: string, pacienteId: string): Promise<number> {
    const result = await this.model
      .aggregate([
        { $match: { clinicaId, pacienteId, excluidoEm: { $exists: false } } },
        { $group: { _id: null, total: { $sum: '$tamanho' } } },
      ])
      .exec();

    return result[0]?.total ?? 0;
  }

  async setThumbnail(clinicaId: string, documentoId: string, thumbnailUrl: string): Promise<void> {
    await this.model.updateOne({ _id: documentoId, clinicaId }, { $set: { thumbnailUrl } }).exec();
  }

  async softDelete(clinicaId: string, documentoId: string, excluidoPor: string): Promise<Documento | null> {
    const document = await this.model
      .findOneAndUpdate(
        { _id: documentoId, clinicaId, excluidoEm: { $exists: false } },
        { $set: { excluidoEm: new Date(), excluidoPor } },
        { new: true },
      )
      .exec();

    return document ? this.toEntity(document) : null;
  }

  private toEntity(document: DocumentoDocument): Documento {
    const object = document.toObject({ getters: false });
    return {
      id: object._id.toString(),
      clinicaId: object.clinicaId,
      pacienteId: object.pacienteId,
      prontuarioId: object.prontuarioId,
      nome: object.nome,
      tipo: object.tipo,
      mimeType: object.mimeType,
      tamanho: object.tamanho,
      url: object.url,
      hash: object.hash,
      uploadPor: object.uploadPor,
      thumbnailUrl: object.thumbnailUrl,
      criadoEm: object.criadoEm,
      excluidoEm: object.excluidoEm,
      excluidoPor: object.excluidoPor,
    };
  }
}
