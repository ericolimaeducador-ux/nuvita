import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FinanceiroConfig } from '../../domain/financeiro-config.entity';
import { FinanceiroConfigRepository } from '../../application/ports/financeiro-config.repository';
import { FinanceiroConfigDocument, FinanceiroConfigMongo } from './financeiro-config.schema';

@Injectable()
export class FinanceiroConfigMongoRepository implements FinanceiroConfigRepository {
  constructor(@InjectModel(FinanceiroConfigMongo.name) private readonly model: Model<FinanceiroConfigDocument>) {}

  async findByClinica(clinicaId: string): Promise<FinanceiroConfig | null> {
    const doc = await this.model.findOne({ clinicaId }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async upsert(clinicaId: string, valorConsultaCentavos: number, atualizadoPor: string): Promise<FinanceiroConfig> {
    const doc = await this.model
      .findOneAndUpdate(
        { clinicaId },
        { $set: { valorConsultaCentavos, atualizadoPor, atualizadoEm: new Date() }, $setOnInsert: { clinicaId } },
        { new: true, upsert: true },
      )
      .lean();
    return this.toEntity(doc as unknown as Record<string, unknown>);
  }

  private toEntity(doc: Record<string, unknown>): FinanceiroConfig {
    const { _id: _ignorado, ...rest } = doc;
    return rest as unknown as FinanceiroConfig;
  }
}
