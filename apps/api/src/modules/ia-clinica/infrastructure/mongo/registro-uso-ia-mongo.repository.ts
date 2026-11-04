import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RegistroUsoIa } from '../../domain/registro-uso-ia.entity';
import { RegistroUsoIaRepository } from '../../application/ports/registro-uso-ia.repository';
import { RegistroUsoIaDocument, RegistroUsoIaMongo } from './registro-uso-ia.schema';

@Injectable()
export class RegistroUsoIaMongoRepository implements RegistroUsoIaRepository {
  constructor(
    @InjectModel(RegistroUsoIaMongo.name) private readonly model: Model<RegistroUsoIaDocument>,
  ) {}

  async create(data: Omit<RegistroUsoIa, 'id' | 'criadoEm'>): Promise<RegistroUsoIa> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findByIdAndClinica(id: string, clinicaId: string): Promise<RegistroUsoIa | null> {
    // Um id malformado nunca corresponde a um registro — trata como "não
    // encontrado" (→ 404), não como erro 500.
    if (!Types.ObjectId.isValid(id)) return null;

    const doc = await this.model
      .findOne({ _id: new Types.ObjectId(id), clinicaId })
      .lean();

    return doc ? this.toEntity(doc as unknown as Record<string, unknown>) : null;
  }

  private toEntity(doc: Record<string, unknown>): RegistroUsoIa {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as RegistroUsoIa;
  }
}
