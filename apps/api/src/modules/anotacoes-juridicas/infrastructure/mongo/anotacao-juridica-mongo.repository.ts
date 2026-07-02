import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnotacaoJuridica } from '../../domain/anotacao-juridica.entity';
import { AnotacaoJuridicaRepository } from '../../application/ports/anotacao-juridica.repository';
import { AnotacaoJuridicaDocument, AnotacaoJuridicaMongo } from './anotacao-juridica.schema';

@Injectable()
export class AnotacaoJuridicaMongoRepository implements AnotacaoJuridicaRepository {
  constructor(
    @InjectModel(AnotacaoJuridicaMongo.name) private readonly model: Model<AnotacaoJuridicaDocument>,
  ) {}

  async create(data: Omit<AnotacaoJuridica, 'id' | 'criadoEm'>): Promise<AnotacaoJuridica> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<AnotacaoJuridica[]> {
    const docs = await this.model.find({ clinicaId, pacienteId }).sort({ criadoEm: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  private toEntity(doc: Record<string, unknown>): AnotacaoJuridica {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as AnotacaoJuridica;
  }
}
