import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Entrega, StatusEntrega } from '../../domain/entrega.entity';
import { EntregaRepository } from '../../application/ports/entrega.repository';
import { EntregaDocument, EntregaMongo } from './entrega.schema';

@Injectable()
export class EntregaMongoRepository implements EntregaRepository {
  constructor(@InjectModel(EntregaMongo.name) private readonly model: Model<EntregaDocument>) {}

  async create(data: Omit<Entrega, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<Entrega> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findById(clinicaId: string, id: string): Promise<Entrega | null> {
    const doc = await this.model.findOne({ _id: id, clinicaId }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<Entrega[]> {
    const docs = await this.model.find({ clinicaId, pacienteId }).sort({ dataEntrega: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async listByProcesso(clinicaId: string, processoJuridicoId: string): Promise<Entrega[]> {
    const docs = await this.model.find({ clinicaId, processoJuridicoId }).sort({ dataEntrega: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async updateStatus(clinicaId: string, id: string, status: StatusEntrega): Promise<Entrega | null> {
    const doc = await this.model
      .findOneAndUpdate({ _id: id, clinicaId }, { $set: { status, atualizadoEm: new Date() } }, { new: true, lean: true })
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  async update(clinicaId: string, id: string, data: Partial<Entrega>): Promise<Entrega | null> {
    const doc = await this.model
      .findOneAndUpdate({ _id: id, clinicaId }, { $set: { ...data, atualizadoEm: new Date() } }, { new: true, lean: true })
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: Record<string, unknown>): Entrega {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as Entrega;
  }
}
