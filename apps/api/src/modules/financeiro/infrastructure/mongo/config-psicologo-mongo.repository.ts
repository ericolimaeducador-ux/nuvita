import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigPsicologoRepository } from '../../application/ports/config-psicologo.repository';
import { ConfigPsicologo } from '../../domain/psicologia.entity';
import { ConfigPsicologoDocument, ConfigPsicologoMongo } from './config-psicologo.schema';

@Injectable()
export class ConfigPsicologoMongoRepository implements ConfigPsicologoRepository {
  constructor(
    @InjectModel(ConfigPsicologoMongo.name) private readonly model: Model<ConfigPsicologoDocument>,
  ) {}

  async find(clinicaId: string, profissionalId: string): Promise<ConfigPsicologo | null> {
    const doc = await this.model.findOne({ clinicaId, profissionalId }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async save(clinicaId: string, profissionalId: string, valorSessao: number): Promise<ConfigPsicologo> {
    const doc = await this.model
      .findOneAndUpdate(
        { clinicaId, profissionalId },
        { $set: { valorSessao } },
        { new: true, upsert: true },
      )
      .exec();

    return this.toEntity(doc);
  }

  private toEntity(doc: ConfigPsicologoDocument): ConfigPsicologo {
    const obj = doc.toObject({ getters: false });
    return {
      id: obj._id.toString(),
      clinicaId: obj.clinicaId,
      profissionalId: obj.profissionalId,
      valorSessao: obj.valorSessao,
      atualizadoEm: obj.atualizadoEm,
    };
  }
}
