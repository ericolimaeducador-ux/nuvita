import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ObservacaoPaciente } from '../../domain/observacao-paciente.entity';
import { ObservacaoPacienteRepository } from '../../application/ports/observacao-paciente.repository';
import { ObservacaoPacienteDocument, ObservacaoPacienteMongo } from './observacao-paciente.schema';

@Injectable()
export class ObservacaoPacienteMongoRepository implements ObservacaoPacienteRepository {
  constructor(
    @InjectModel(ObservacaoPacienteMongo.name) private readonly model: Model<ObservacaoPacienteDocument>,
  ) {}

  async create(data: Omit<ObservacaoPaciente, 'id' | 'criadoEm'>): Promise<ObservacaoPaciente> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<ObservacaoPaciente[]> {
    const docs = await this.model.find({ clinicaId, pacienteId }).sort({ criadoEm: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  private toEntity(doc: Record<string, unknown>): ObservacaoPaciente {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as ObservacaoPaciente;
  }
}
