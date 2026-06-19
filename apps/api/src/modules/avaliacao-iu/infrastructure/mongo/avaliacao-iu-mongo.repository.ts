import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AvaliacaoIU } from '../../domain/avaliacao-iu.entity';
import { AvaliacaoIURepository } from '../../application/ports/avaliacao-iu.repository';
import { AvaliacaoIUDocument, AvaliacaoIUMongo } from './avaliacao-iu.schema';

@Injectable()
export class AvaliacaoIUMongoRepository implements AvaliacaoIURepository {
  constructor(@InjectModel(AvaliacaoIUMongo.name) private readonly model: Model<AvaliacaoIUDocument>) {}

  async create(data: Omit<AvaliacaoIU, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<AvaliacaoIU> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findById(clinicaId: string, id: string): Promise<AvaliacaoIU | null> {
    const doc = await this.model.findOne({ _id: id, clinicaId }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<AvaliacaoIU[]> {
    const docs = await this.model.find({ clinicaId, pacienteId }).sort({ dataAtendimento: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async listByEnfermeiro(clinicaId: string, enfermeiroId: string): Promise<AvaliacaoIU[]> {
    const docs = await this.model.find({ clinicaId, enfermeiroId }).sort({ dataAtendimento: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async update(clinicaId: string, id: string, data: Partial<AvaliacaoIU>): Promise<AvaliacaoIU | null> {
    const doc = await this.model
      .findOneAndUpdate({ _id: id, clinicaId }, { $set: { ...data, atualizadoEm: new Date() } }, { new: true, lean: true })
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  async countByClinica(clinicaId: string): Promise<number> {
    return this.model.countDocuments({ clinicaId });
  }

  private toEntity(doc: Record<string, unknown>): AvaliacaoIU {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as AvaliacaoIU;
  }
}
