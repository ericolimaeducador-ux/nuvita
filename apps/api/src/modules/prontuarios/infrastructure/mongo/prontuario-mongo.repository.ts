import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Cid10Repository,
  CreateProntuarioInput,
  ProntuarioRepository,
  SignProntuarioInput,
  UpdateProntuarioInput,
} from '../../application/ports/prontuario.repository';
import {
  Cid10,
  Prontuario,
  ProntuarioAddendum,
} from '../../domain/prontuario.entity';
import {
  Cid10Document,
  Cid10Mongo,
  ProntuarioAddendumDocument,
  ProntuarioAddendumMongo,
  ProntuarioDocument,
  ProntuarioMongo,
} from './prontuario.schema';

@Injectable()
export class ProntuarioMongoRepository implements ProntuarioRepository {
  constructor(
    @InjectModel(ProntuarioMongo.name) private readonly prontuarioModel: Model<ProntuarioDocument>,
    @InjectModel(ProntuarioAddendumMongo.name)
    private readonly addendumModel: Model<ProntuarioAddendumDocument>,
  ) {}

  async create(input: CreateProntuarioInput): Promise<Prontuario> {
    const created = await this.prontuarioModel.create({
      ...input,
      arquivos: input.arquivos ?? [],
    });

    return this.toProntuario(created);
  }

  async findById(clinicaId: string, prontuarioId: string): Promise<Prontuario | null> {
    const document = await this.prontuarioModel
      .findOne({ clinicaId, _id: new Types.ObjectId(prontuarioId) })
      .exec();

    return document ? this.toProntuario(document) : null;
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<Prontuario[]> {
    const documents = await this.prontuarioModel
      .find({ clinicaId, pacienteId })
      .sort({ dataAtendimento: -1, criadoEm: -1 })
      .exec();

    return documents.map((document) => this.toProntuario(document));
  }

  async updateDraft(
    clinicaId: string,
    prontuarioId: string,
    input: UpdateProntuarioInput,
  ): Promise<Prontuario | null> {
    const document = await this.prontuarioModel
      .findOneAndUpdate(
        {
          clinicaId,
          _id: new Types.ObjectId(prontuarioId),
          assinado: { $exists: false },
        },
        { $set: { ...input, atualizadoEm: new Date() } },
        { new: true },
      )
      .exec();

    return document ? this.toProntuario(document) : null;
  }

  async sign(
    clinicaId: string,
    prontuarioId: string,
    input: SignProntuarioInput,
  ): Promise<Prontuario | null> {
    const document = await this.prontuarioModel
      .findOneAndUpdate(
        {
          clinicaId,
          _id: new Types.ObjectId(prontuarioId),
          assinado: { $exists: false },
        },
        {
          $set: {
            assinado: input,
            atualizadoEm: new Date(),
          },
        },
        { new: true },
      )
      .exec();

    return document ? this.toProntuario(document) : null;
  }

  async addAddendum(prontuarioId: string, medicoId: string, texto: string): Promise<ProntuarioAddendum> {
    const created = await this.addendumModel.create({
      prontuarioId,
      medicoId,
      texto,
    });

    return this.toAddendum(created);
  }

  async listAddendums(prontuarioId: string): Promise<ProntuarioAddendum[]> {
    const documents = await this.addendumModel
      .find({ prontuarioId })
      .sort({ criadoEm: 1, _id: 1 })
      .exec();

    return documents.map((document) => this.toAddendum(document));
  }

  private toProntuario(document: ProntuarioDocument): Prontuario {
    const object = document.toObject({ getters: false });

    return {
      id: object._id.toString(),
      clinicaId: object.clinicaId,
      pacienteId: object.pacienteId,
      medicoId: object.medicoId,
      agendamentoId: object.agendamentoId,
      dataAtendimento: object.dataAtendimento,
      tipo: object.tipo,
      subjetivo: object.subjetivo as unknown as Prontuario['subjetivo'],
      objetivo: object.objetivo as unknown as Prontuario['objetivo'],
      avaliacao: object.avaliacao as unknown as Prontuario['avaliacao'],
      plano: object.plano as unknown as Prontuario['plano'],
      fichaAvaliacaoIU: object.fichaAvaliacaoIU as unknown as Prontuario['fichaAvaliacaoIU'],
      relatorioJudicial: object.relatorioJudicial as unknown as Prontuario['relatorioJudicial'],
      arquivos: object.arquivos as unknown as Prontuario['arquivos'],
      assinado: object.assinado,
      criadoEm: object.criadoEm,
      atualizadoEm: object.atualizadoEm,
    };
  }

  private toAddendum(document: ProntuarioAddendumDocument): ProntuarioAddendum {
    const object = document.toObject({ getters: false });

    return {
      id: object._id.toString(),
      prontuarioId: object.prontuarioId,
      medicoId: object.medicoId,
      texto: object.texto,
      criadoEm: object.criadoEm,
    };
  }
}

@Injectable()
export class Cid10MongoRepository implements Cid10Repository {
  constructor(@InjectModel(Cid10Mongo.name) private readonly cid10Model: Model<Cid10Document>) {}

  async autocomplete(query: string, limit = 20): Promise<Cid10[]> {
    const normalizedLimit = Math.min(Math.max(limit, 1), 50);
    const regex = new RegExp(this.escapeRegex(query), 'i');
    const documents = await this.cid10Model
      .find({
        $or: [{ codigo: regex }, { descricao: regex }],
      })
      .sort({ codigo: 1 })
      .limit(normalizedLimit)
      .exec();

    return documents.map((document) => {
      const object = document.toObject({ getters: false });
      return {
        id: object._id.toString(),
        codigo: object.codigo,
        descricao: object.descricao,
      };
    });
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
