import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InscricaoTeste, InscricaoTesteStatus } from '../../domain/inscricao-teste.entity';
import { InscricaoTesteRepository, NovaInscricaoTeste } from '../../application/ports/inscricao-teste.repository';
import { InscricaoTesteDocument, InscricaoTesteMongo } from './inscricao-teste.schema';

const MONGO_DUPLICATE_KEY = 11000;

@Injectable()
export class InscricaoTesteMongoRepository implements InscricaoTesteRepository {
  private readonly logger = new Logger(InscricaoTesteMongoRepository.name);

  constructor(@InjectModel(InscricaoTesteMongo.name) private readonly model: Model<InscricaoTesteDocument>) {}

  async existePorEmail(email: string): Promise<boolean> {
    return (await this.model.exists({ email })) !== null;
  }

  async criar(input: NovaInscricaoTeste): Promise<InscricaoTeste | null> {
    try {
      const created = await this.model.create({ ...input, status: InscricaoTesteStatus.INSCRITA, criadoEm: new Date() });
      return this.toEntity(created);
    } catch (error) {
      const erro = error as { code?: number; keyPattern?: Record<string, unknown> };
      if (erro.code === MONGO_DUPLICATE_KEY) {
        // Só é "e-mail repetido" se a colisão for no índice de `email`. Qualquer outro índice
        // único colidindo é configuração errada (ex.: índice criado sobre campo inexistente) e
        // não pode ser engolido em silêncio. Loga só os NOMES dos campos, nunca os valores.
        const campos = Object.keys(erro.keyPattern ?? {});
        if (campos.length === 1 && campos[0] === 'email') return null;
        this.logger.error(
          `Índice único inesperado recusou a inscrição de teste (campos: ${campos.join(', ') || 'desconhecidos'}). ` +
            'Confira os índices de inscricoes_teste: o esperado é email_1.',
        );
      }
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
