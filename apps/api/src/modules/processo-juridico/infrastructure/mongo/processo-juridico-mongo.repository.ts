import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentoProcesso, ProcessoJuridico, StatusProcesso } from '../../domain/processo-juridico.entity';
import { ProcessoJuridicoRepository } from '../../application/ports/processo-juridico.repository';
import { ProcessoJuridicoDocument, ProcessoJuridicoMongo } from './processo-juridico.schema';

@Injectable()
export class ProcessoJuridicoMongoRepository implements ProcessoJuridicoRepository {
  constructor(@InjectModel(ProcessoJuridicoMongo.name) private readonly model: Model<ProcessoJuridicoDocument>) {}

  async create(data: Omit<ProcessoJuridico, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<ProcessoJuridico> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findById(clinicaId: string, id: string): Promise<ProcessoJuridico | null> {
    const doc = await this.model.findOne({ _id: id, clinicaId }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findByPaciente(clinicaId: string, pacienteId: string): Promise<ProcessoJuridico[]> {
    const docs = await this.model.find({ clinicaId, pacienteId }).sort({ criadoEm: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async listByAdvogado(clinicaId: string, advogadoId: string): Promise<ProcessoJuridico[]> {
    const docs = await this.model.find({ clinicaId, advogadoId }).sort({ criadoEm: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async updateStatus(clinicaId: string, id: string, status: StatusProcesso, observacoes?: string): Promise<ProcessoJuridico | null> {
    const set: Record<string, unknown> = { status, atualizadoEm: new Date() };
    if (observacoes !== undefined) set['observacoes'] = observacoes;
    if (status === StatusProcesso.PROTOCOLADO) set['dataProtocolo'] = new Date();
    if (status === StatusProcesso.GANHO || status === StatusProcesso.PERDIDO) set['dataDecisao'] = new Date();

    const doc = await this.model
      .findOneAndUpdate({ _id: id, clinicaId }, { $set: set }, { new: true, lean: true })
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  async addDocumento(clinicaId: string, id: string, documento: DocumentoProcesso): Promise<ProcessoJuridico | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, clinicaId },
        { $push: { documentos: documento }, $set: { atualizadoEm: new Date() } },
        { new: true, lean: true },
      )
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  async update(clinicaId: string, id: string, data: Partial<ProcessoJuridico>): Promise<ProcessoJuridico | null> {
    const doc = await this.model
      .findOneAndUpdate({ _id: id, clinicaId }, { $set: { ...data, atualizadoEm: new Date() } }, { new: true, lean: true })
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: Record<string, unknown>): ProcessoJuridico {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as ProcessoJuridico;
  }
}
