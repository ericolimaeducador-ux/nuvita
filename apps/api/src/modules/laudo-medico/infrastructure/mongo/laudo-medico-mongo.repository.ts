import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssinaturaLaudo, LaudoMedico, StatusLaudoMedico } from '../../domain/laudo-medico.entity';
import { LaudoMedicoRepository } from '../../application/ports/laudo-medico.repository';
import { LaudoMedicoDocument, LaudoMedicoMongo } from './laudo-medico.schema';

@Injectable()
export class LaudoMedicoMongoRepository implements LaudoMedicoRepository {
  constructor(@InjectModel(LaudoMedicoMongo.name) private readonly model: Model<LaudoMedicoDocument>) {}

  async create(data: Omit<LaudoMedico, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<LaudoMedico> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findById(clinicaId: string, id: string): Promise<LaudoMedico | null> {
    const doc = await this.model.findOne({ _id: id, clinicaId, excluidoEm: { $exists: false } }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findByAvaliacaoIU(clinicaId: string, avaliacaoIuId: string): Promise<LaudoMedico | null> {
    const doc = await this.model.findOne({ clinicaId, avaliacaoIuId, excluidoEm: { $exists: false } }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<LaudoMedico[]> {
    const docs = await this.model.find({ clinicaId, pacienteId, excluidoEm: { $exists: false } }).sort({ dataLaudo: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async listByStatus(clinicaId: string, status: StatusLaudoMedico): Promise<LaudoMedico[]> {
    const docs = await this.model.find({ clinicaId, status, excluidoEm: { $exists: false } }).sort({ atualizadoEm: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async update(clinicaId: string, id: string, data: Partial<LaudoMedico>): Promise<LaudoMedico | null> {
    const doc = await this.model
      .findOneAndUpdate({ _id: id, clinicaId, excluidoEm: { $exists: false } }, { $set: { ...data, atualizadoEm: new Date() } }, { new: true, lean: true })
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  async assinar(clinicaId: string, id: string, assinatura: AssinaturaLaudo): Promise<LaudoMedico | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, clinicaId, status: { $ne: StatusLaudoMedico.ASSINADO }, excluidoEm: { $exists: false } },
        {
          $set: {
            assinado: assinatura,
            medicoId: assinatura.medicoId,
            status: StatusLaudoMedico.ASSINADO,
            atualizadoEm: new Date(),
          },
        },
        { new: true, lean: true },
      )
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  async softDelete(clinicaId: string, id: string, excluidoPor: string): Promise<LaudoMedico | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, clinicaId, excluidoEm: { $exists: false } },
        { $set: { excluidoEm: new Date(), excluidoPor } },
        { new: true, lean: true },
      )
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: Record<string, unknown>): LaudoMedico {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as LaudoMedico;
  }
}
