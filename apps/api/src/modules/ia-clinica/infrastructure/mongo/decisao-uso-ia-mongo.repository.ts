import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DecisaoUsoIa } from '../../domain/decisao-uso-ia.entity';
import { DecisaoUsoIaRepository } from '../../application/ports/decisao-uso-ia.repository';
import { DecisaoUsoIaDocument, DecisaoUsoIaMongo } from './decisao-uso-ia.schema';

@Injectable()
export class DecisaoUsoIaMongoRepository implements DecisaoUsoIaRepository {
  constructor(
    @InjectModel(DecisaoUsoIaMongo.name) private readonly model: Model<DecisaoUsoIaDocument>,
  ) {}

  async create(data: Omit<DecisaoUsoIa, 'id' | 'decididoEm' | 'clinicaId'> & { clinicaId: string }): Promise<DecisaoUsoIa> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async existsForRegistro(registroUsoIaId: string): Promise<boolean> {
    const count = await this.model.countDocuments({ registroUsoIaId }).limit(1);
    return count > 0;
  }

  private toEntity(doc: Record<string, unknown>): DecisaoUsoIa {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as DecisaoUsoIa;
  }
}
