import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import {
  AdendoConsulta,
  AnexoConsulta,
  AssinaturaConsulta,
  CobrancaConsulta,
  ConsultaEnfermagem,
  StatusConsulta,
  StatusDesfechoLesoes,
} from '../../domain/consulta-enfermagem.entity';
import { ConsultaRepository, ConteudoConsulta, NovaConsulta } from '../../application/ports/consulta.repository';
import {
  AdendoConsultaDocument,
  AdendoConsultaMongo,
  AnexoConsultaDocument,
  AnexoConsultaMongo,
  ConsultaDocument,
  ConsultaMongo,
} from './consulta.schema';

@Injectable()
export class ConsultaMongoRepository implements ConsultaRepository {
  constructor(
    @InjectModel(ConsultaMongo.name) private readonly model: Model<ConsultaDocument>,
    @InjectModel(AdendoConsultaMongo.name) private readonly adendos: Model<AdendoConsultaDocument>,
    @InjectModel(AnexoConsultaMongo.name) private readonly anexos: Model<AnexoConsultaDocument>,
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

  async atualizarDesfechoLesoes(clinicaId: string, id: string, status: StatusDesfechoLesoes): Promise<ConsultaEnfermagem | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, clinicaId, status: StatusConsulta.ASSINADA },
        { $set: { desfechoLesoesStatus: status, atualizadoEm: new Date() } },
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

  async createAnexo(data: Omit<AnexoConsulta, 'id' | 'criadoEm'>): Promise<AnexoConsulta> {
    const doc = await this.anexos.create(data);
    return this.comId<AnexoConsulta>(doc.toObject() as unknown as Record<string, unknown>);
  }

  async findAnexo(clinicaId: string, consultaId: string, anexoId: string): Promise<AnexoConsulta | null> {
    if (!isValidObjectId(anexoId)) return null;
    const doc = await this.anexos.findOne({ _id: anexoId, clinicaId, consultaId }).lean();
    return doc ? this.comId<AnexoConsulta>(doc) : null;
  }

  async listAnexos(clinicaId: string, consultaId: string): Promise<AnexoConsulta[]> {
    const docs = await this.anexos.find({ clinicaId, consultaId }).sort({ criadoEm: 1, _id: 1 }).lean();
    return docs.map((d) => this.comId<AnexoConsulta>(d));
  }

  async confirmarAnexo(clinicaId: string, consultaId: string, anexoId: string, confirmadoEm: Date): Promise<AnexoConsulta | null> {
    if (!isValidObjectId(anexoId)) return null;
    const doc = await this.anexos
      .findOneAndUpdate({ _id: anexoId, clinicaId, consultaId }, { $set: { confirmadoEm } }, { new: true })
      .lean();
    return doc ? this.comId<AnexoConsulta>(doc) : null;
  }

  private comId<T>(doc: Record<string, unknown>): T {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as T;
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
