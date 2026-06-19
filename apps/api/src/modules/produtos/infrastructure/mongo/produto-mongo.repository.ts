import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Produto, TipoProduto } from '../../domain/produto.entity';
import { ProdutoRepository } from '../../application/ports/produto.repository';
import { ProdutoDocument, ProdutoMongo } from './produto.schema';

@Injectable()
export class ProdutoMongoRepository implements ProdutoRepository {
  constructor(@InjectModel(ProdutoMongo.name) private readonly model: Model<ProdutoDocument>) {}

  async findByCodigo(codigo: number): Promise<Produto | null> {
    const doc = await this.model.findOne({ codigo }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findAll(tipo?: TipoProduto, ativo?: boolean): Promise<Produto[]> {
    const filter: Record<string, unknown> = {};
    if (tipo) filter['tipo'] = tipo;
    if (ativo !== undefined) filter['ativo'] = ativo;
    const docs = await this.model.find(filter).sort({ codigo: 1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async create(data: Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<Produto> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async upsertByCodigo(data: Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<Produto> {
    const doc = await this.model.findOneAndUpdate(
      { codigo: data.codigo },
      { $set: { ...data, atualizadoEm: new Date() } },
      { upsert: true, new: true, lean: true },
    );
    return this.toEntity(doc!);
  }

  private toEntity(doc: Record<string, unknown>): Produto {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as Produto;
  }
}
