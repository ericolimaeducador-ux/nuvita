import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { FollowUp, StatusElegibilidade } from '../../domain/followup.entity';
import { FollowUpRepository } from '../../application/ports/followup.repository';
import { FollowUpDocument, FollowUpMongo } from './followup.schema';

const NAO_EXCLUIDO = { excluidoEm: { $exists: false } };

@Injectable()
export class FollowUpMongoRepository implements FollowUpRepository {
  constructor(@InjectModel(FollowUpMongo.name) private readonly model: Model<FollowUpDocument>) {}

  async create(data: Omit<FollowUp, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<FollowUp> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findById(clinicaId: string, id: string): Promise<FollowUp | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.model.findOne({ _id: id, clinicaId, ...NAO_EXCLUIDO }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<FollowUp[]> {
    const docs = await this.model.find({ clinicaId, pacienteId, ...NAO_EXCLUIDO }).sort({ dataFollowup: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async listByAvaliacaoIU(clinicaId: string, avaliacaoIuId: string): Promise<FollowUp[]> {
    const docs = await this.model.find({ clinicaId, avaliacaoIuId, ...NAO_EXCLUIDO }).sort({ dataFollowup: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async countByStatus(clinicaId: string, status: StatusElegibilidade): Promise<number> {
    return this.model.countDocuments({ clinicaId, statusElegibilidade: status, ...NAO_EXCLUIDO });
  }

  async softDelete(clinicaId: string, id: string, excluidoPor: string): Promise<FollowUp | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, clinicaId, ...NAO_EXCLUIDO },
        { $set: { excluidoEm: new Date(), excluidoPor } },
        { new: true },
      )
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: Record<string, unknown>): FollowUp {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as FollowUp;
  }
}
