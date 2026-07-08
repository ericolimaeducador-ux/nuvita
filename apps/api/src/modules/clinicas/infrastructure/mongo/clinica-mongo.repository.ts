import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateClinicaInput,
  ClinicaRepository,
  UpdateClinicaInput,
} from '../../application/ports/clinica.repository';
import { Clinica } from '../../domain/clinica.entity';
import { ClinicaDocument, ClinicaMongo } from './clinica.schema';

@Injectable()
export class ClinicaMongoRepository implements ClinicaRepository {
  constructor(@InjectModel(ClinicaMongo.name) private readonly model: Model<ClinicaDocument>) {}

  async create(input: CreateClinicaInput): Promise<Clinica> {
    const created = await this.model.create({
      ...input,
      cnpj: this.onlyDigits(input.cnpj),
      ativo: true,
    });

    return this.toEntity(created);
  }

  async findById(id: string): Promise<Clinica | null> {
    const document = await this.model.findById(id).exec();
    return document ? this.toEntity(document) : null;
  }

  async findByCnpj(cnpj: string): Promise<Clinica | null> {
    const document = await this.model.findOne({ cnpj: this.onlyDigits(cnpj) }).exec();
    return document ? this.toEntity(document) : null;
  }

  async findAll(): Promise<Clinica[]> {
    const documents = await this.model.find({}).sort({ criadoEm: -1 }).exec();
    return documents.map((document) => this.toEntity(document));
  }

  async update(id: string, input: UpdateClinicaInput): Promise<Clinica | null> {
    const update: Record<string, unknown> = {};
    if (input.nome !== undefined) update.nome = input.nome;
    if (input.plano !== undefined) update.plano = input.plano;
    if (input.ativo !== undefined) update.ativo = input.ativo;

    const document = await this.model.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
    return document ? this.toEntity(document) : null;
  }

  private toEntity(document: ClinicaDocument): Clinica {
    const object = document.toObject({ getters: false });
    return {
      id: object._id.toString(),
      nome: object.nome,
      cnpj: object.cnpj,
      endereco: object.endereco as unknown as Clinica['endereco'],
      plano: object.plano,
      configuracoes: object.configuracoes as unknown as Clinica['configuracoes'],
      ativo: object.ativo,
      criadoEm: object.criadoEm,
    };
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }
}
