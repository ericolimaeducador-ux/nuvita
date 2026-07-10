import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CreateSinalInput, SinalSalaRepository } from '../../application/ports/sinal-sala.repository';
import { PapelSala } from '../../domain/sala-evento.entity';
import { SinalSala } from '../../domain/sinal-sala.entity';
import { SinalSalaDocument, SinalSalaMongo } from './sinal-sala.schema';

@Injectable()
export class SinalSalaMongoRepository implements SinalSalaRepository {
  constructor(
    @InjectModel(SinalSalaMongo.name) private readonly model: Model<SinalSalaDocument>,
  ) {}

  async create(input: CreateSinalInput): Promise<SinalSala> {
    const doc = await this.model.create(input);
    return this.toEntity(doc);
  }

  async listPara(salaId: string, para: PapelSala, after?: string): Promise<SinalSala[]> {
    const filter: FilterQuery<SinalSalaDocument> = { salaId, de: { $ne: para } };
    if (after && Types.ObjectId.isValid(after)) {
      filter._id = { $gt: new Types.ObjectId(after) };
    }

    const docs = await this.model.find(filter).sort({ _id: 1 }).limit(200).exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  private toEntity(doc: SinalSalaDocument): SinalSala {
    const obj = doc.toObject({ getters: false });
    return {
      id: obj._id.toString(),
      salaId: obj.salaId,
      de: obj.de,
      tipo: obj.tipo,
      payload: obj.payload,
      criadoEm: obj.criadoEm,
    };
  }
}
