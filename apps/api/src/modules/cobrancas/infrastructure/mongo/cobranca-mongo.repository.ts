import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Cobranca, StatusCobranca } from '../../domain/cobranca.entity';
import { CobrancaRepository, NovaCobranca } from '../../application/ports/cobranca.repository';
import { CobrancaDocument, CobrancaMongo } from './cobranca.schema';

@Injectable()
export class CobrancaMongoRepository implements CobrancaRepository {
  constructor(@InjectModel(CobrancaMongo.name) private readonly model: Model<CobrancaDocument>) {}

  async create(data: NovaCobranca): Promise<Cobranca> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findById(clinicaId: string, id: string): Promise<Cobranca | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.model.findOne({ _id: id, clinicaId }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<Cobranca[]> {
    const docs = await this.model.find({ clinicaId, pacienteId }).sort({ vencimento: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async listParaResumo(clinicaId: string, de: Date, ate: Date): Promise<Cobranca[]> {
    const docs = await this.model
      .find({ clinicaId, $or: [{ vencimento: { $gte: de, $lt: ate } }, { pagaEm: { $gte: de, $lt: ate } }] })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async update(
    clinicaId: string,
    id: string,
    statusPermitidos: StatusCobranca[],
    data: Partial<Omit<Cobranca, 'id' | 'clinicaId' | 'criadoEm'>>,
  ): Promise<Cobranca | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, clinicaId, status: { $in: statusPermitidos } },
        { $set: { ...data, atualizadoEm: new Date() } },
        { new: true },
      )
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: Record<string, unknown>): Cobranca {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest, itens: (rest['itens'] as Cobranca['itens']) ?? [] } as Cobranca;
  }
}
