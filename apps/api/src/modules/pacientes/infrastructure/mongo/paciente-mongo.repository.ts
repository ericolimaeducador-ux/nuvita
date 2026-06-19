import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import {
  CreatePacienteInput,
  ListPacientesInput,
  PacienteRepository,
  SearchPacientesByNameInput,
  UpdatePacienteInput,
} from '../../application/ports/paciente.repository';
import { CursorPaginationResult } from '../../domain/pagination';
import { Convenio, Endereco, Paciente } from '../../domain/paciente.entity';
import { PacienteCryptoService } from '../crypto/paciente-crypto.service';
import { PacienteDocument, PacienteMongo } from './paciente.schema';

interface DecodedCursor {
  criadoEm: string;
  id: string;
}

@Injectable()
export class PacienteMongoRepository implements PacienteRepository {
  constructor(
    @InjectModel(PacienteMongo.name) private readonly pacienteModel: Model<PacienteDocument>,
    private readonly crypto: PacienteCryptoService,
  ) {}

  async create(input: CreatePacienteInput): Promise<Paciente> {
    const created = await this.pacienteModel.create({
      clinicaId: input.clinicaId,
      nome: input.nome,
      cpf: this.crypto.encryptString(this.crypto.normalizeCpf(input.cpf)),
      cpfHash: this.crypto.cpfHash(input.cpf),
      dataNascimento: input.dataNascimento,
      sexo: input.sexo,
      telefone: this.encryptOptional(input.telefone),
      email: this.encryptOptional(input.email?.toLowerCase()),
      endereco: this.encryptJsonOptional(input.endereco),
      convenio: this.encryptJsonOptional(input.convenio),
      consentimentoLGPD: input.consentimentoLGPD,
      ativo: true,
    });

    return this.toEntity(created);
  }

  async list(input: ListPacientesInput): Promise<CursorPaginationResult<Paciente>> {
    const query = this.baseQuery(input.clinicaId, input.incluirInativos);
    if (input.programaVaPro !== undefined) query.programaVaPro = input.programaVaPro;
    this.applyCursor(query, input.cursor);

    const limit = this.normalizeLimit(input.limit);
    const documents = await this.pacienteModel
      .find(query)
      .sort({ criadoEm: -1, _id: -1 })
      .limit(limit + 1)
      .exec();

    return this.toPaginatedResult(documents, limit);
  }

  async searchByName(input: SearchPacientesByNameInput): Promise<CursorPaginationResult<Paciente>> {
    const query = this.baseQuery(input.clinicaId, input.incluirInativos);
    this.applyCursor(query, input.cursor);

    const limit = this.normalizeLimit(input.limit);
    const pipeline: PipelineStage[] = [
      {
        $search: {
          index: 'pacientes_nome_fonetico',
          text: {
            query: input.nome,
            path: 'nome',
            fuzzy: { maxEdits: 1, prefixLength: 2 },
          },
        },
      },
      { $match: { ...query, ...(input.programaVaPro !== undefined ? { programaVaPro: input.programaVaPro } : {}) } },
      { $sort: { criadoEm: -1, _id: -1 } },
      { $limit: limit + 1 },
    ];

    const results = await this.pacienteModel.aggregate(pipeline).exec();
    const documents = results.map((result) => this.pacienteModel.hydrate(result));

    return this.toPaginatedResult(documents, limit);
  }

  async findByCpf(clinicaId: string, cpf: string, incluirInativos = false): Promise<Paciente | null> {
    const document = await this.pacienteModel
      .findOne({
        ...this.baseQuery(clinicaId, incluirInativos),
        cpfHash: this.crypto.cpfHash(cpf),
      })
      .exec();

    return document ? this.toEntity(document) : null;
  }

  async findById(clinicaId: string, pacienteId: string, incluirInativos = false): Promise<Paciente | null> {
    const document = await this.pacienteModel
      .findOne({
        ...this.baseQuery(clinicaId, incluirInativos),
        _id: new Types.ObjectId(pacienteId),
      })
      .exec();

    return document ? this.toEntity(document) : null;
  }

  async update(
    clinicaId: string,
    pacienteId: string,
    input: UpdatePacienteInput,
  ): Promise<Paciente | null> {
    const update = this.toUpdate(input);
    const document = await this.pacienteModel
      .findOneAndUpdate(
        { clinicaId, _id: new Types.ObjectId(pacienteId), ativo: true },
        { $set: { ...update, atualizadoEm: new Date() } },
        { new: true },
      )
      .exec();

    return document ? this.toEntity(document) : null;
  }

  async deactivate(clinicaId: string, pacienteId: string): Promise<Paciente | null> {
    const document = await this.pacienteModel
      .findOneAndUpdate(
        { clinicaId, _id: new Types.ObjectId(pacienteId), ativo: true },
        { $set: { ativo: false, atualizadoEm: new Date() } },
        { new: true },
      )
      .exec();

    return document ? this.toEntity(document) : null;
  }

  private toUpdate(input: UpdatePacienteInput): Record<string, unknown> {
    const update: Record<string, unknown> = {};

    if (input.nome !== undefined) update.nome = input.nome;
    if (input.cpf !== undefined) {
      update.cpf = this.crypto.encryptString(this.crypto.normalizeCpf(input.cpf));
      update.cpfHash = this.crypto.cpfHash(input.cpf);
    }
    if (input.dataNascimento !== undefined) update.dataNascimento = input.dataNascimento;
    if (input.sexo !== undefined) update.sexo = input.sexo;
    if (input.telefone !== undefined) update.telefone = this.encryptOptional(input.telefone);
    if (input.email !== undefined) update.email = this.encryptOptional(input.email?.toLowerCase());
    if (input.endereco !== undefined) update.endereco = this.encryptJsonOptional(input.endereco);
    if (input.convenio !== undefined) update.convenio = this.encryptJsonOptional(input.convenio);
    if (input.programaVaPro !== undefined) update.programaVaPro = input.programaVaPro;

    return update;
  }

  private toPaginatedResult(
    documents: PacienteDocument[],
    limit: number,
  ): CursorPaginationResult<Paciente> {
    const hasMore = documents.length > limit;
    const pageDocuments = hasMore ? documents.slice(0, limit) : documents;
    const lastDocument = pageDocuments[pageDocuments.length - 1];

    return {
      items: pageDocuments.map((document) => this.toEntity(document)),
      hasMore,
      nextCursor: hasMore && lastDocument ? this.encodeCursor(lastDocument) : undefined,
    };
  }

  private toEntity(document: PacienteDocument): Paciente {
    const object = document.toObject({ getters: false });

    return {
      id: object._id.toString(),
      clinicaId: object.clinicaId,
      nome: object.nome,
      cpf: this.crypto.decryptString(object.cpf),
      dataNascimento: object.dataNascimento,
      sexo: object.sexo,
      telefone: this.decryptOptional(object.telefone),
      email: this.decryptOptional(object.email),
      endereco: this.decryptJsonOptional<Endereco>(object.endereco),
      convenio: this.decryptJsonOptional<Convenio>(object.convenio),
      consentimentoLGPD: object.consentimentoLGPD,
      programaVaPro: object.programaVaPro ?? false,
      ativo: object.ativo,
      criadoEm: object.criadoEm,
      atualizadoEm: object.atualizadoEm,
    };
  }

  private baseQuery(clinicaId: string, incluirInativos = false): Record<string, unknown> {
    return {
      clinicaId,
      ...(incluirInativos ? {} : { ativo: true }),
    };
  }

  private applyCursor(query: Record<string, unknown>, cursor?: string): void {
    if (!cursor) return;

    const decoded = this.decodeCursor(cursor);
    query.$or = [
      { criadoEm: { $lt: new Date(decoded.criadoEm) } },
      {
        criadoEm: new Date(decoded.criadoEm),
        _id: { $lt: new Types.ObjectId(decoded.id) },
      },
    ];
  }

  private encodeCursor(document: PacienteDocument): string {
    const payload: DecodedCursor = {
      criadoEm: document.criadoEm.toISOString(),
      id: document._id.toString(),
    };

    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  private decodeCursor(cursor: string): DecodedCursor {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as DecodedCursor;
  }

  private normalizeLimit(limit?: number): number {
    return Math.min(Math.max(limit ?? 25, 1), 100);
  }

  private encryptOptional(value?: string): string | undefined {
    return value ? this.crypto.encryptString(value) : undefined;
  }

  private decryptOptional(value?: string): string | undefined {
    return value ? this.crypto.decryptString(value) : undefined;
  }

  private encryptJsonOptional<T>(value?: T): string | undefined {
    return value ? this.crypto.encryptJson(value) : undefined;
  }

  private decryptJsonOptional<T>(value?: string): T | undefined {
    return value ? this.crypto.decryptJson<T>(value) : undefined;
  }
}
