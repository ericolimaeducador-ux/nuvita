import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Cobranca, StatusCobranca } from '../../domain/cobranca.entity';
import {
  CobrancaRepository,
  ListCobrancasClinicaInput,
  NovaCobranca,
  PaginaCobrancas,
} from '../../application/ports/cobranca.repository';
import { CobrancaDocument, CobrancaMongo } from './cobranca.schema';

const LIMITE_PADRAO = 20;
const LIMITE_MAXIMO = 100;

/**
 * Filtro da lista da clínica. O `clinicaId` entra SEMPRE, fora de qualquer $or (a lista nunca vaza cobrança de outra
 * clínica). Status efetivo -> cláusula: `vencida` é pendente/enviada com vencimento anterior a hoje.
 */
export function montarFiltroClinica(input: ListCobrancasClinicaInput, cursor?: { v: Date; id: string }): Record<string, unknown> {
  const clausulas: Record<string, unknown>[] = [];
  for (const s of input.status ?? []) {
    if (s === StatusCobranca.PENDENTE || s === StatusCobranca.ENVIADA) {
      clausulas.push({ status: s, vencimento: { $gte: input.hoje } });
    } else if (s === StatusCobranca.VENCIDA) {
      clausulas.push({ status: { $in: [StatusCobranca.PENDENTE, StatusCobranca.ENVIADA] }, vencimento: { $lt: input.hoje } });
    } else {
      clausulas.push({ status: s });
    }
  }
  const e: Record<string, unknown>[] = [{ clinicaId: input.clinicaId }];
  if (clausulas.length > 0) e.push({ $or: clausulas });
  if (cursor) e.push({ $or: [{ vencimento: { $gt: cursor.v } }, { vencimento: cursor.v, _id: { $gt: cursor.id } }] });
  return { $and: e };
}

function decodificarCursor(cursor: string | undefined): { v: Date; id: string } | undefined {
  if (!cursor) return undefined;
  try {
    const o = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { v?: string; id?: string };
    const v = o.v ? new Date(o.v) : undefined;
    if (v && !Number.isNaN(v.getTime()) && o.id && isValidObjectId(o.id)) return { v, id: o.id };
  } catch {
    // cursor inválido: ignora e devolve a primeira página
  }
  return undefined;
}

@Injectable()
export class CobrancaMongoRepository implements CobrancaRepository {
  constructor(@InjectModel(CobrancaMongo.name) private readonly model: Model<CobrancaDocument>) {}

  async create(data: NovaCobranca): Promise<Cobranca> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findById(clinicaId: string, id: string): Promise<Cobranca | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.model.findOne({ _id: id, clinicaId }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findByConsultaId(clinicaId: string, consultaId: string): Promise<Cobranca | null> {
    const doc = await this.model.findOne({ clinicaId, consultaId }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<Cobranca[]> {
    const docs = await this.model.find({ clinicaId, pacienteId }).sort({ vencimento: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async listByClinica(input: ListCobrancasClinicaInput): Promise<PaginaCobrancas> {
    const limit = Math.min(Math.max(input.limit ?? LIMITE_PADRAO, 1), LIMITE_MAXIMO);
    const docs = await this.model
      .find(montarFiltroClinica(input, decodificarCursor(input.cursor)) as never)
      .sort({ vencimento: 1, _id: 1 })
      .limit(limit + 1)
      .lean();
    const hasMore = docs.length > limit;
    const pagina = docs.slice(0, limit);
    const ultimo = pagina[pagina.length - 1];
    return {
      items: pagina.map((d) => this.toEntity(d)),
      hasMore,
      nextCursor:
        hasMore && ultimo
          ? Buffer.from(JSON.stringify({ v: (ultimo.vencimento as Date).toISOString(), id: String(ultimo._id) })).toString('base64url')
          : undefined,
    };
  }

  async listParaResumo(clinicaId: string, de: Date, ate: Date): Promise<Cobranca[]> {
    const docs = await this.model
      .find({ clinicaId, $or: [{ vencimento: { $gte: de, $lt: ate } }, { pagaEm: { $gte: de, $lt: ate } }] })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async update(
    clinicaId: string,
    id: string,
    statusPermitidos: StatusCobranca[],
    data: Partial<Omit<Cobranca, 'id' | 'clinicaId' | 'criadoEm'>>,
  ): Promise<Cobranca | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, clinicaId, status: { $in: statusPermitidos } },
        { $set: { ...data, atualizadoEm: new Date() } },
        { new: true },
      )
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: Record<string, unknown>): Cobranca {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest, itens: (rest['itens'] as Cobranca['itens']) ?? [] } as Cobranca;
  }
}
