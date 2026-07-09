import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { EtapaFluxoClinico } from '../../../../../../../packages/shared/src/fluxo-clinico';
import {
  CreatePacienteInput,
  ListPacientesInput,
  PacienteRepository,
  PacienteSort,
  SearchPacientesByNameInput,
  UpdatePacienteInput,
} from '../../application/ports/paciente.repository';
import { CursorPaginationResult } from '../../domain/pagination';
import { Convenio, Endereco, Paciente } from '../../domain/paciente.entity';
import { PacienteCryptoService } from '../crypto/paciente-crypto.service';
import { PacienteDocument, PacienteMongo } from './paciente.schema';

interface DecodedCursor {
  /** Ordenação sob a qual o cursor foi emitido — cursor de um sort não vale para outro. */
  s: PacienteSort;
  /** Valor do campo de ordenação no último documento da página (null p/ nascimento ausente). */
  v: string | null;
  id: string;
}

// Ordem alfabética correta em pt-BR (á == a, maiúscula == minúscula) tanto no
// sort quanto nas comparações do cursor — Mongo compara binário sem isso.
const COLLATION_PT = { locale: 'pt', strength: 2 } as const;

@Injectable()
export class PacienteMongoRepository implements PacienteRepository {
  private readonly logger = new Logger(PacienteMongoRepository.name);

  constructor(
    @InjectModel(PacienteMongo.name) private readonly pacienteModel: Model<PacienteDocument>,
    private readonly crypto: PacienteCryptoService,
  ) {}

  async create(input: CreatePacienteInput): Promise<Paciente> {
    // cpf/cpfHash só entram no objeto quando informados: o driver do Mongo
    // serializa `undefined` como `null` explícito, e o índice único
    // {clinicaId, cpfHash} é sparse (ignora campo AUSENTE, não campo null) —
    // gravar null explícito quebraria o 2º paciente sem CPF na mesma clínica.
    const doc: Record<string, unknown> = {
      clinicaId: input.clinicaId,
      nome: input.nome,
      dataNascimento: input.dataNascimento,
      sexo: input.sexo,
      telefone: this.encryptOptional(input.telefone),
      email: this.encryptOptional(input.email?.toLowerCase()),
      endereco: this.encryptJsonOptional(input.endereco),
      convenio: this.encryptJsonOptional(input.convenio),
      consentimentoLGPD: input.consentimentoLGPD,
      projeto: input.projeto,
      etapaFluxo: EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO,
      etapaFluxoDesde: new Date(),
      ativo: true,
    };
    if (input.cpf) {
      doc.cpf = this.crypto.encryptString(this.crypto.normalizeCpf(input.cpf));
      doc.cpfHash = this.crypto.cpfHash(input.cpf);
    }

    const created = await this.pacienteModel.create(doc);

    return this.toEntity(created);
  }

  async list(input: ListPacientesInput): Promise<CursorPaginationResult<Paciente>> {
    const sort = input.sort ?? 'recentes';
    const query = this.listQuery(input);
    this.applyCursor(query, input.cursor, sort);

    const limit = this.normalizeLimit(input.limit);
    const find = this.pacienteModel
      .find(query)
      .sort(this.sortSpec(sort))
      .limit(limit + 1);
    if (sort === 'nome_asc' || sort === 'nome_desc') find.collation(COLLATION_PT);

    const documents = await find.exec();

    return this.toPaginatedResult(documents, limit, sort);
  }

  async searchByName(input: SearchPacientesByNameInput): Promise<CursorPaginationResult<Paciente>> {
    const sort = input.sort ?? 'recentes';
    const query = this.listQuery(input);
    this.applyCursor(query, input.cursor, sort);

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
      { $match: query },
      // Sem collation aqui ($search não aceita) — ordenação de nome fica
      // binária dentro do resultado da busca, o que é aceitável.
      { $sort: this.sortSpec(sort) },
      { $limit: limit + 1 },
    ];

    let documents: PacienteDocument[];
    try {
      const results = await this.pacienteModel.aggregate(pipeline).exec();
      documents = results.map((result) => this.pacienteModel.hydrate(result));
    } catch (err) {
      // Atlas Search indisponível (Mongo local/CE, ou índice pacientes_nome_fonetico
      // não criado no cluster) — cai para busca por substring case-insensitive.
      this.logger.warn(
        `Busca $search indisponível, usando regex como fallback: ${(err as Error).message}`,
      );
      const escaped = input.nome.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const find = this.pacienteModel
        .find({ ...query, nome: { $regex: escaped, $options: 'i' } })
        .sort(this.sortSpec(sort))
        .limit(limit + 1);
      if (sort === 'nome_asc' || sort === 'nome_desc') find.collation(COLLATION_PT);
      documents = await find.exec();
    }

    return this.toPaginatedResult(documents, limit, sort);
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
    if (input.consentimentoLGPD !== undefined) update.consentimentoLGPD = input.consentimentoLGPD;
    if (input.programaIU !== undefined) update.programaIU = input.programaIU;
    if (input.projeto !== undefined) update.projeto = input.projeto;
    if (input.observacoes !== undefined) update.observacoes = this.encryptOptional(input.observacoes);
    if (input.etapaFluxo !== undefined) update.etapaFluxo = input.etapaFluxo;
    if (input.etapaFluxoDesde !== undefined) update.etapaFluxoDesde = input.etapaFluxoDesde;

    return update;
  }

  private toPaginatedResult(
    documents: PacienteDocument[],
    limit: number,
    sort: PacienteSort,
  ): CursorPaginationResult<Paciente> {
    const hasMore = documents.length > limit;
    const pageDocuments = hasMore ? documents.slice(0, limit) : documents;
    const lastDocument = pageDocuments[pageDocuments.length - 1];

    return {
      items: pageDocuments.map((document) => this.toEntity(document)),
      hasMore,
      nextCursor: hasMore && lastDocument ? this.encodeCursor(lastDocument, sort) : undefined,
    };
  }

  private toEntity(document: PacienteDocument): Paciente {
    const object = document.toObject({ getters: false });

    return {
      id: object._id.toString(),
      clinicaId: object.clinicaId,
      nome: object.nome,
      cpf: this.decryptOptional(object.cpf),
      dataNascimento: object.dataNascimento,
      sexo: object.sexo,
      telefone: this.decryptOptional(object.telefone),
      email: this.decryptOptional(object.email),
      endereco: this.decryptJsonOptional<Endereco>(object.endereco),
      convenio: this.decryptJsonOptional<Convenio>(object.convenio),
      consentimentoLGPD: object.consentimentoLGPD,
      observacoes: this.decryptOptional(object.observacoes),
      programaIU: object.programaIU ?? false,
      projeto: object.projeto,
      etapaFluxo: object.etapaFluxo,
      etapaFluxoDesde: object.etapaFluxoDesde,
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

  /** Filtros comuns de list/searchByName (tenant, ativo, programaIU, etapa, dia de nascimento). */
  private listQuery(input: ListPacientesInput): Record<string, unknown> {
    const query = this.baseQuery(input.clinicaId, input.incluirInativos);
    if (input.programaIU !== undefined) query.programaIU = input.programaIU;
    if (input.projeto !== undefined) query.projeto = input.projeto;
    if (input.etapaFluxo !== undefined) query.etapaFluxo = input.etapaFluxo;
    if (input.dataNascimento) {
      // Campo gravado como meia-noite UTC; intervalo de 24h cobre o dia inteiro.
      const inicio = new Date(`${input.dataNascimento}T00:00:00.000Z`);
      const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
      query.dataNascimento = { $gte: inicio, $lt: fim };
    }
    return query;
  }

  private sortSpec(sort: PacienteSort): Record<string, 1 | -1> {
    switch (sort) {
      case 'nome_asc':
        return { nome: 1, _id: 1 };
      case 'nome_desc':
        return { nome: -1, _id: -1 };
      case 'nascimento_asc':
        return { dataNascimento: 1, _id: 1 };
      case 'nascimento_desc':
        return { dataNascimento: -1, _id: -1 };
      default:
        return { criadoEm: -1, _id: -1 };
    }
  }

  private applyCursor(query: Record<string, unknown>, cursor: string | undefined, sort: PacienteSort): void {
    if (!cursor) return;

    const decoded = this.decodeCursor(cursor);
    // Cursor emitido sob outra ordenação não é comparável — ignora e volta à página 1.
    if (!decoded || decoded.s !== sort) return;

    const id = new Types.ObjectId(decoded.id);

    switch (sort) {
      case 'nome_asc':
        query.$or = [{ nome: { $gt: decoded.v } }, { nome: decoded.v, _id: { $gt: id } }];
        return;
      case 'nome_desc':
        query.$or = [{ nome: { $lt: decoded.v } }, { nome: decoded.v, _id: { $lt: id } }];
        return;
      case 'nascimento_asc':
        // Nascimento ausente ordena PRIMEIRO no asc do Mongo (null < Date).
        query.$or =
          decoded.v === null
            ? [{ dataNascimento: null, _id: { $gt: id } }, { dataNascimento: { $ne: null } }]
            : [
                { dataNascimento: { $gt: new Date(decoded.v) } },
                { dataNascimento: new Date(decoded.v), _id: { $gt: id } },
              ];
        return;
      case 'nascimento_desc':
        // Nascimento ausente ordena POR ÚLTIMO no desc — depois de todas as datas.
        query.$or =
          decoded.v === null
            ? [{ dataNascimento: null, _id: { $lt: id } }]
            : [
                { dataNascimento: { $lt: new Date(decoded.v) } },
                { dataNascimento: new Date(decoded.v), _id: { $lt: id } },
                { dataNascimento: null },
              ];
        return;
      default:
        query.$or = [
          { criadoEm: { $lt: new Date(decoded.v as string) } },
          { criadoEm: new Date(decoded.v as string), _id: { $lt: id } },
        ];
    }
  }

  private encodeCursor(document: PacienteDocument, sort: PacienteSort): string {
    let v: string | null;
    switch (sort) {
      case 'nome_asc':
      case 'nome_desc':
        v = document.nome;
        break;
      case 'nascimento_asc':
      case 'nascimento_desc':
        v = document.dataNascimento ? document.dataNascimento.toISOString() : null;
        break;
      default:
        v = document.criadoEm.toISOString();
    }

    const payload: DecodedCursor = { s: sort, v, id: document._id.toString() };

    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  private decodeCursor(cursor: string): DecodedCursor | null {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as DecodedCursor;
      // Cursor legado ({criadoEm,id}) ou malformado: sem `s`/`id`, não dá pra retomar.
      if (!decoded || typeof decoded.id !== 'string' || typeof decoded.s !== 'string') return null;
      return decoded;
    } catch {
      return null;
    }
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
