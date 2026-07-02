import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChecklistDocumentoItem, StatusChecklistDocumento } from '../../domain/checklist-documento.entity';
import {
  ChecklistDocumentoRepository,
  UpdateChecklistDocumentoInput,
} from '../../application/ports/checklist-documento.repository';
import { ChecklistDocumentoDocument, ChecklistDocumentoMongo } from './checklist-documento.schema';

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
    const docs = await this.model.find({ clinicaId, pacienteId }).sort({ criadoEm: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async update(
    clinicaId: string,
    id: string,
    input: UpdateChecklistDocumentoInput,
  ): Promise<ChecklistDocumentoItem | null> {
    const set: Record<string, unknown> = { atualizadoEm: new Date() };
    if (input.nome !== undefined) set['nome'] = input.nome;
    if (input.status !== undefined) set['status'] = input.status;
    if (input.observacao !== undefined) set['observacao'] = input.observacao;

    const doc = await this.model
      .findOneAndUpdate({ _id: id, clinicaId }, { $set: set }, { new: true })
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  async delete(clinicaId: string, id: string): Promise<boolean> {
    const r = await this.model.deleteOne({ _id: id, clinicaId });
    return r.deletedCount > 0;
  }

  countPendentesPorClinica(clinicaId: string): Promise<number> {
    return this.model.countDocuments({ clinicaId, status: StatusChecklistDocumento.PENDENTE });
  }

  private toEntity(doc: Record<string, unknown>): ChecklistDocumentoItem {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as ChecklistDocumentoItem;
  }
}
