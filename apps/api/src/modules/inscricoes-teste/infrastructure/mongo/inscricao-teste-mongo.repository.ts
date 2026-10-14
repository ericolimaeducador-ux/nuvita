import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InscricaoTeste, InscricaoTesteStatus } from '../../domain/inscricao-teste.entity';
import { InscricaoTesteRepository, NovaInscricaoTeste } from '../../application/ports/inscricao-teste.repository';
import { InscricaoTesteDocument, InscricaoTesteMongo } from './inscricao-teste.schema';

const MONGO_DUPLICATE_KEY = 11000;

@Injectable()
export class InscricaoTesteMongoRepository implements InscricaoTesteRepository {
  constructor(@InjectModel(InscricaoTesteMongo.name) private readonly model: Model<InscricaoTesteDocument>) {}

  async existePorEmail(email: string): Promise<boolean> {
    return (await this.model.exists({ email })) !== null;
  }

  async criar(input: NovaInscricaoTeste): Promise<InscricaoTeste | null> {
    try {
      const created = await this.model.create({ ...input, status: InscricaoTesteStatus.INSCRITA, criadoEm: new Date() });
      return this.toEntity(created);
    } catch (error) {
      if ((error as { code?: number }).code === MONGO_DUPLICATE_KEY) return null;
      throw error;
    }
  }

  async listar(): Promise<InscricaoTeste[]> {
    const docs = await this.model.find().sort({ criadoEm: 1 }).exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  async atualizarStatus(id: string, status: InscricaoTesteStatus): Promise<InscricaoTeste | null> {
    const doc = await this.model.findByIdAndUpdate(id, { status }, { new: true }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: InscricaoTesteDocument): InscricaoTeste {
    return {
      id: doc.id,
      nome: doc.nome,
      email: doc.email,
      whatsapp: doc.whatsapp,
      crpNumero: doc.crpNumero,
      cidadeEstado: doc.cidadeEstado,
      modoAtendimento: doc.modoAtendimento,
      ferramentaAtual: doc.ferramentaAtual,
      maiorDor: doc.maiorDor,
      termoVersao: doc.termoVersao,
      aceiteTermoEm: doc.aceiteTermoEm,
      aceiteIp: doc.aceiteIp,
      status: doc.status,
      criadoEm: doc.criadoEm,
    };
  }
}
