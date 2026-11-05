import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Produto } from '../../domain/produto.entity';
import { CreateProdutoInput, ProdutoRepository, UpdateProdutoInput } from '../../application/ports/produto.repository';
import { ProdutoDocument, ProdutoMongo } from './produto.schema';

@Injectable()
export class ProdutoMongoRepository implements ProdutoRepository {
  constructor(@InjectModel(ProdutoMongo.name) private readonly model: Model<ProdutoDocument>) {}

  async findByCodigo(codigo: number): Promise<Produto | null> {
    const doc = await this.model.findOne({ codigo }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findAll(tipo?: string, ativo?: boolean): Promise<Produto[]> {
    const filter: Record<string, unknown> = {};
    if (tipo) filter['tipo'] = tipo;
    if (ativo !== undefined) filter['ativo'] = ativo;
    const docs = await this.model.find(filter).sort({ codigo: 1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async create(data: CreateProdutoInput): Promise<Produto> {
    const doc = await this.model.create({ ...data, ativo: true });
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async update(codigo: number, data: UpdateProdutoInput): Promise<Produto | null> {
    const doc = await this.model
      .findOneAndUpdate({ codigo }, { $set: { ...data, atualizadoEm: new Date() } }, { new: true })
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  async deactivate(codigo: number): Promise<Produto | null> {
    const doc = await this.model
      .findOneAndUpdate({ codigo }, { $set: { ativo: false, atualizadoEm: new Date() } }, { new: true })
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: Record<string, unknown>): Produto {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as Produto;
  }
}
