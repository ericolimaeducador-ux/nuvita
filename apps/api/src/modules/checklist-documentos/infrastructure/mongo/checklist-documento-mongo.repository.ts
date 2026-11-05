import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { ChecklistDocumentoItem, StatusChecklistDocumento } from '../../domain/checklist-documento.entity';
import {
  ChecklistDocumentoRepository,
  UpdateChecklistDocumentoInput,
} from '../../application/ports/checklist-documento.repository';
import { ChecklistDocumentoDocument, ChecklistDocumentoMongo } from './checklist-documento.schema';

// Itens com exclusão lógica ficam fora de TODA consulta.
const NAO_EXCLUIDO = { excluidoEm: { $exists: false } };

@Injectable()
export class ChecklistDocumentoMongoRepository implements ChecklistDocumentoRepository {
  constructor(
    @InjectModel(ChecklistDocumentoMongo.name) private readonly model: Model<ChecklistDocumentoDocument>,
  ) {}

  async create(
    data: Omit<ChecklistDocumentoItem, 'id' | 'criadoEm' | 'atualizadoEm'>,
  ): Promise<ChecklistDocumentoItem> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<ChecklistDocumentoItem[]> {
    const docs = await this.model.find({ clinicaId, pacienteId, ...NAO_EXCLUIDO }).sort({ criadoEm: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async update(
    clinicaId: string,
    id: string,
    input: UpdateChecklistDocumentoInput,
  ): Promise<ChecklistDocumentoItem | null> {
    if (!isValidObjectId(id)) return null;
    const set: Record<string, unknown> = { atualizadoEm: new Date() };
    if (input.nome !== undefined) set['nome'] = input.nome;
    if (input.status !== undefined) set['status'] = input.status;
    if (input.observacao !== undefined) set['observacao'] = input.observacao;

    const doc = await this.model
      .findOneAndUpdate({ _id: id, clinicaId, ...NAO_EXCLUIDO }, { $set: set }, { new: true })
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  async softDelete(clinicaId: string, id: string, excluidoPor: string): Promise<ChecklistDocumentoItem | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, clinicaId, ...NAO_EXCLUIDO },
        { $set: { excluidoEm: new Date(), excluidoPor, atualizadoEm: new Date() } },
        { new: true },
      )
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  countPendentesPorClinica(clinicaId: string): Promise<number> {
    return this.model.countDocuments({ clinicaId, status: StatusChecklistDocumento.PENDENTE, ...NAO_EXCLUIDO });
  }

  private toEntity(doc: Record<string, unknown>): ChecklistDocumentoItem {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as ChecklistDocumentoItem;
  }
}
