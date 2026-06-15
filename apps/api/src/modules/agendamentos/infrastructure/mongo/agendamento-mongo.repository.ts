import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateAgendamentoInput,
  CreateBloqueioInput,
  ListAgendamentosInput,
  AgendamentoRepository,
  UpdateAgendamentoInput,
} from '../../application/ports/agendamento.repository';
import { Agendamento, BloqueioAgenda, StatusAgendamento } from '../../domain/agendamento.entity';
import {
  AgendamentoDocument,
  AgendamentoMongo,
  BloqueioAgendaDocument,
  BloqueioAgendaMongo,
} from './agendamento.schema';

@Injectable()
export class AgendamentoMongoRepository implements AgendamentoRepository {
  constructor(
    @InjectModel(AgendamentoMongo.name) private readonly model: Model<AgendamentoDocument>,
    @InjectModel(BloqueioAgendaMongo.name) private readonly bloqueioModel: Model<BloqueioAgendaDocument>,
  ) {}

  async create(input: CreateAgendamentoInput): Promise<Agendamento> {
    const doc = await this.model.create({
      clinicaId: input.clinicaId,
      pacienteId: input.pacienteId,
      medicoId: input.medicoId,
      modalidade: input.modalidade,
      dataHoraInicio: input.dataHoraInicio,
      dataHoraFim: input.dataHoraFim,
      tipo: input.tipo,
      status: StatusAgendamento.AGENDADO,
      observacoes: input.observacoes,
      criadoPor: input.criadoPor,
    });

    return this.toEntity(doc);
  }

  async findById(clinicaId: string, id: string): Promise<Agendamento | null> {
    const doc = await this.model.findOne({ clinicaId, _id: new Types.ObjectId(id) }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async list(input: ListAgendamentosInput): Promise<Agendamento[]> {
    const query: Record<string, unknown> = { clinicaId: input.clinicaId };

    if (input.medicoId) query.medicoId = input.medicoId;
    if (input.pacienteId) query.pacienteId = input.pacienteId;
    if (input.modalidade) query.modalidade = input.modalidade;
    if (input.status) query.status = input.status;
    if (input.dataInicio || input.dataFim) {
      query.dataHoraInicio = {};
      if (input.dataInicio) (query.dataHoraInicio as Record<string, unknown>).$gte = input.dataInicio;
      if (input.dataFim) (query.dataHoraInicio as Record<string, unknown>).$lte = input.dataFim;
    }

    const docs = await this.model.find(query).sort({ dataHoraInicio: 1 }).limit(500).exec();
    return docs.map((d) => this.toEntity(d));
  }

  async update(clinicaId: string, id: string, input: UpdateAgendamentoInput): Promise<Agendamento | null> {
    const set: Record<string, unknown> = {};

    if (input.medicoId !== undefined) set.medicoId = input.medicoId;
    if (input.modalidade !== undefined) set.modalidade = input.modalidade;
    if (input.dataHoraInicio !== undefined) set.dataHoraInicio = input.dataHoraInicio;
    if (input.dataHoraFim !== undefined) set.dataHoraFim = input.dataHoraFim;
    if (input.tipo !== undefined) set.tipo = input.tipo;
    if (input.observacoes !== undefined) set.observacoes = input.observacoes;

    const doc = await this.model
      .findOneAndUpdate(
        { clinicaId, _id: new Types.ObjectId(id), status: { $nin: [StatusAgendamento.CANCELADO, StatusAgendamento.CONCLUIDO] } },
        { $set: set },
        { new: true },
      )
      .exec();

    return doc ? this.toEntity(doc) : null;
  }

  async updateStatus(clinicaId: string, id: string, status: StatusAgendamento, motivoCancelamento?: string): Promise<Agendamento | null> {
    const set: Record<string, unknown> = { status };
    if (motivoCancelamento) set.motivoCancelamento = motivoCancelamento;

    const doc = await this.model
      .findOneAndUpdate(
        { clinicaId, _id: new Types.ObjectId(id) },
        { $set: set },
        { new: true },
      )
      .exec();

    return doc ? this.toEntity(doc) : null;
  }

  async createBloqueio(input: CreateBloqueioInput): Promise<BloqueioAgenda> {
    const doc = await this.bloqueioModel.create({
      clinicaId: input.clinicaId,
      medicoId: input.medicoId,
      dataHoraInicio: input.dataHoraInicio,
      dataHoraFim: input.dataHoraFim,
      motivo: input.motivo,
      criadoPor: input.criadoPor,
    });

    return this.toBloqueioEntity(doc);
  }

  async listBloqueios(clinicaId: string, medicoId?: string, dataInicio?: Date, dataFim?: Date): Promise<BloqueioAgenda[]> {
    const query: Record<string, unknown> = { clinicaId };

    if (medicoId) query.medicoId = medicoId;
    if (dataInicio || dataFim) {
      query.dataHoraInicio = {};
      if (dataInicio) (query.dataHoraInicio as Record<string, unknown>).$gte = dataInicio;
      if (dataFim) (query.dataHoraInicio as Record<string, unknown>).$lte = dataFim;
    }

    const docs = await this.bloqueioModel.find(query).sort({ dataHoraInicio: 1 }).exec();
    return docs.map((d) => this.toBloqueioEntity(d));
  }

  async deleteBloqueio(clinicaId: string, id: string): Promise<boolean> {
    const result = await this.bloqueioModel
      .deleteOne({ clinicaId, _id: new Types.ObjectId(id) })
      .exec();

    return result.deletedCount > 0;
  }

  private toEntity(doc: AgendamentoDocument): Agendamento {
    const obj = doc.toObject({ getters: false });
    return {
      id: obj._id.toString(),
      clinicaId: obj.clinicaId,
      pacienteId: obj.pacienteId,
      medicoId: obj.medicoId,
      modalidade: obj.modalidade,
      dataHoraInicio: obj.dataHoraInicio,
      dataHoraFim: obj.dataHoraFim,
      tipo: obj.tipo,
      status: obj.status,
      observacoes: obj.observacoes,
      motivoCancelamento: obj.motivoCancelamento,
      criadoPor: obj.criadoPor,
      criadoEm: obj.criadoEm,
      atualizadoEm: obj.atualizadoEm,
    };
  }

  private toBloqueioEntity(doc: BloqueioAgendaDocument): BloqueioAgenda {
    const obj = doc.toObject({ getters: false });
    return {
      id: obj._id.toString(),
      clinicaId: obj.clinicaId,
      medicoId: obj.medicoId,
      dataHoraInicio: obj.dataHoraInicio,
      dataHoraFim: obj.dataHoraFim,
      motivo: obj.motivo,
      criadoPor: obj.criadoPor,
      criadoEm: obj.criadoEm,
    };
  }
}
