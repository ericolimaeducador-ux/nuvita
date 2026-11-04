import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TestePsicologico } from '../../domain/teste-psicologico.entity';
import { TestePsicologicoRepository } from '../../application/ports/teste-psicologico.repository';
import { TestePsicologicoDocument, TestePsicologicoMongo } from './teste-psicologico.schema';

@Injectable()
export class TestePsicologicoMongoRepository implements TestePsicologicoRepository {
  constructor(
    @InjectModel(TestePsicologicoMongo.name) private readonly model: Model<TestePsicologicoDocument>,
  ) {}

  async create(data: Omit<TestePsicologico, 'id' | 'criadoEm'>): Promise<TestePsicologico> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<TestePsicologico[]> {
    const docs = await this.model.find({ clinicaId, pacienteId }).sort({ dataAplicacao: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  private toEntity(doc: Record<string, unknown>): TestePsicologico {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as TestePsicologico;
  }
}
