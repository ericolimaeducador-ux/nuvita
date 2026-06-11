import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateClinicaInput, ClinicaRepository } from '../../application/ports/clinica.repository';
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

  private toEntity(document: ClinicaDocument): Clinica {
    const object = document.toObject({ getters: false });
    return {
      id: object._id.toString(),
      nome: object.nome,
      cnpj: object.cnpj,
      endereco: object.endereco as Clinica['endereco'],
      plano: object.plano,
      configuracoes: object.configuracoes as Clinica['configuracoes'],
      ativo: object.ativo,
      criadoEm: object.criadoEm,
    };
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }
}
