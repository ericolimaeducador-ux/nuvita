import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateClinicaInput,
  ClinicaRepository,
  UpdateClinicaInput,
} from '../../application/ports/clinica.repository';
import {
  normalizarDocumentoFiscal,
  TipoDocumentoFiscal,
} from '../../../../../../../packages/shared/src/documentos';
import { Clinica } from '../../domain/clinica.entity';
import { ClinicaDocument, ClinicaMongo } from './clinica.schema';

@Injectable()
export class ClinicaMongoRepository implements ClinicaRepository {
  constructor(@InjectModel(ClinicaMongo.name) private readonly model: Model<ClinicaDocument>) {}

  async create(input: CreateClinicaInput): Promise<Clinica> {
    const { documento, ...resto } = input;
    const created = await this.model.create({
      ...resto,
      cnpj: normalizarDocumentoFiscal(documento),
      tipoDocumento: input.tipoDocumento,
      faseTeste: input.faseTeste ?? false,
      ativo: true,
    });

    return this.toEntity(created);
  }

  async findById(id: string): Promise<Clinica | null> {
    const document = await this.model.findById(id).exec();
    return document ? this.toEntity(document) : null;
  }

  async findByDocumento(documento: string): Promise<Clinica | null> {
    const document = await this.model.findOne({ cnpj: normalizarDocumentoFiscal(documento) }).exec();
    return document ? this.toEntity(document) : null;
  }

  async findAll(): Promise<Clinica[]> {
    const documents = await this.model.find({}).sort({ criadoEm: -1 }).exec();
    return documents.map((document) => this.toEntity(document));
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }

  async update(id: string, input: UpdateClinicaInput): Promise<Clinica | null> {
    const update: Record<string, unknown> = {};
    const unset: Record<string, 1> = {};
    if (input.nome !== undefined) update.nome = input.nome;
    if (input.plano !== undefined) update.plano = input.plano;
    if (input.ativo !== undefined) update.ativo = input.ativo;
    if (input.faseTeste !== undefined) update.faseTeste = input.faseTeste;
    if (input.telefone !== undefined) update['configuracoes.telefone'] = input.telefone;
    if (input.emailContato !== undefined) update['configuracoes.emailContato'] = input.emailContato;

    if (typeof input.logoKey === 'string') update['configuracoes.logoKey'] = input.logoKey;
    if (input.logoKey === null) unset['configuracoes.logoKey'] = 1;

    const operacao: Record<string, unknown> = {};
    if (Object.keys(update).length) operacao.$set = update;
    if (Object.keys(unset).length) operacao.$unset = unset;
    const document = await this.model.findByIdAndUpdate(id, operacao, { new: true }).exec();
    return document ? this.toEntity(document) : null;
  }

  private toEntity(document: ClinicaDocument): Clinica {
    const object = document.toObject({ getters: false });
    return {
      id: object._id.toString(),
      nome: object.nome,
      documento: object.cnpj,
      tipoDocumento: object.tipoDocumento ?? TipoDocumentoFiscal.CNPJ,
      endereco: object.endereco as unknown as Clinica['endereco'],
      plano: object.plano,
      configuracoes: object.configuracoes as unknown as Clinica['configuracoes'],
      ativo: object.ativo,
      faseTeste: object.faseTeste ?? false,
      criadoEm: object.criadoEm,
    };
  }
}
