import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateSalaEventoInput,
  SalaEventoRepository,
} from '../../application/ports/sala-evento.repository';
import { SalaEvento } from '../../domain/sala-evento.entity';
import { SalaEventoDocument, SalaEventoMongo } from './sala-evento.schema';

@Injectable()
export class SalaEventoMongoRepository implements SalaEventoRepository {
  constructor(
    @InjectModel(SalaEventoMongo.name) private readonly model: Model<SalaEventoDocument>,
  ) {}

  async create(input: CreateSalaEventoInput): Promise<SalaEvento> {
    const doc = await this.model.create(input);
    return this.toEntity(doc);
  }

  async listBySala(clinicaId: string, salaId: string): Promise<SalaEvento[]> {
    const docs = await this.model.find({ clinicaId, salaId }).sort({ criadoEm: 1, _id: 1 }).exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  private toEntity(doc: SalaEventoDocument): SalaEvento {
    const obj = doc.toObject({ getters: false });
    return {
      id: obj._id.toString(),
      clinicaId: obj.clinicaId,
      salaId: obj.salaId,
      papel: obj.papel,
      tipo: obj.tipo,
      detalhes: obj.detalhes,
      ip: obj.ip,
      userAgent: obj.userAgent,
      criadoEm: obj.criadoEm,
    };
  }
}
