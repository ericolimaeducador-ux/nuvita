import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import {
  AdendoConsulta,
  AssinaturaConsulta,
  CobrancaConsulta,
  ConsultaEnfermagem,
  StatusConsulta,
} from '../../domain/consulta-enfermagem.entity';
import { ConsultaRepository, ConteudoConsulta, NovaConsulta } from '../../application/ports/consulta.repository';
import { AdendoConsultaDocument, AdendoConsultaMongo, ConsultaDocument, ConsultaMongo } from './consulta.schema';

@Injectable()
export class ConsultaMongoRepository implements ConsultaRepository {
  constructor(
    @InjectModel(ConsultaMongo.name) private readonly model: Model<ConsultaDocument>,
    @InjectModel(AdendoConsultaMongo.name) private readonly adendos: Model<AdendoConsultaDocument>,
  ) {}

  async create(data: NovaConsulta): Promise<ConsultaEnfermagem> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findById(clinicaId: string, id: string): Promise<ConsultaEnfermagem | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.model.findOne({ _id: id, clinicaId }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<ConsultaEnfermagem[]> {
    const docs = await this.model.find({ clinicaId, pacienteId }).sort({ criadoEm: 1, _id: 1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async updateRascunho(clinicaId: string, id: string, autorId: string, conteudo: ConteudoConsulta): Promise<ConsultaEnfermagem | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, clinicaId, enfermeiroId: autorId, status: StatusConsulta.RASCUNHO },
        { $set: { ...conteudo, atualizadoEm: new Date() } },
        { new: true },
      )
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  async assinar(
    clinicaId: string,
    id: string,
    autorId: string,
    assinatura: AssinaturaConsulta,
    cobranca: CobrancaConsulta,
  ): Promise<ConsultaEnfermagem | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, clinicaId, enfermeiroId: autorId, status: StatusConsulta.RASCUNHO },
        { $set: { status: StatusConsulta.ASSINADA, assinatura, cobranca, atualizadoEm: new Date() } },
        { new: true },
      )
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  async atualizarCobranca(clinicaId: string, id: string, cobranca: CobrancaConsulta): Promise<ConsultaEnfermagem | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, clinicaId, status: StatusConsulta.ASSINADA },
        { $set: { cobranca, atualizadoEm: new Date() } },
        { new: true },
      )
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  async listAdendos(clinicaId: string, consultaId: string): Promise<AdendoConsulta[]> {
    const docs = await this.adendos.find({ clinicaId, consultaId }).sort({ numero: 1 }).lean();
    return docs.map((d) => this.toAdendo(d));
  }

  async ultimoNumeroAdendo(clinicaId: string, consultaId: string): Promise<number> {
    const ultimo = await this.adendos.findOne({ clinicaId, consultaId }).sort({ numero: -1 }).lean();
    return ultimo?.numero ?? 0;
  }

  async createAdendo(data: Omit<AdendoConsulta, 'id' | 'criadoEm'>): Promise<AdendoConsulta> {
    const doc = await this.adendos.create(data);
    return this.toAdendo(doc.toObject() as unknown as Record<string, unknown>);
  }

  private toEntity(doc: Record<string, unknown>): ConsultaEnfermagem {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as ConsultaEnfermagem;
  }

  private toAdendo(doc: Record<string, unknown>): AdendoConsulta {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as AdendoConsulta;
  }
}
