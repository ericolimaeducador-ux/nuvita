import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateSalaInput,
  FindAllSalasFiltro,
  SalaTelemedicinaRepository,
} from '../../application/ports/sala-telemedicina.repository';
import { SalaTelemedicina, StatusSala } from '../../domain/sala-telemedicina.entity';
import { SalaTelemedicinaDocument, SalaTelemedicinaMongo } from './sala-telemedicina.schema';

@Injectable()
export class SalaTelemedicinaMongoRepository implements SalaTelemedicinaRepository {
  constructor(
    @InjectModel(SalaTelemedicinaMongo.name) private readonly model: Model<SalaTelemedicinaDocument>,
  ) {}

  async create(input: CreateSalaInput): Promise<SalaTelemedicina> {
    const doc = await this.model.create({
      clinicaId: input.clinicaId,
      agendamentoId: input.agendamentoId,
      medicoId: input.medicoId,
      modalidade: input.modalidade,
      pacienteId: input.pacienteId,
      status: StatusSala.AGUARDANDO,
      tokenMedico: input.tokenMedico,
      tokenPaciente: input.tokenPaciente,
      expiresAt: input.expiresAt,
    });

    return this.toEntity(doc, input.tokenMedico, input.tokenPaciente);
  }

  async findById(clinicaId: string, id: string): Promise<SalaTelemedicina | null> {
    const doc = await this.model
      .findOne({ clinicaId, _id: new Types.ObjectId(id) })
      .select('+tokenMedico +tokenPaciente')
      .exec();

    return doc ? this.toEntity(doc) : null;
  }

  async findByToken(token: string): Promise<SalaTelemedicina | null> {
    const doc = await this.model
      .findOne({ $or: [{ tokenMedico: token }, { tokenPaciente: token }] })
      .select('+tokenMedico +tokenPaciente')
      .exec();

    return doc ? this.toEntity(doc) : null;
  }

  async findByAgendamento(clinicaId: string, agendamentoId: string): Promise<SalaTelemedicina | null> {
    // Um agendamento pode ter mais de uma sala (a anterior encerrou e o
    // profissional abriu outra) — vale sempre a mais recente.
    const doc = await this.model
      .findOne({ clinicaId, agendamentoId })
      .sort({ criadoEm: -1 })
      .select('+tokenMedico +tokenPaciente')
      .exec();

    return doc ? this.toEntity(doc) : null;
  }

  async findAll(clinicaId: string, filtro: FindAllSalasFiltro): Promise<SalaTelemedicina[]> {
    const query: Record<string, unknown> = { clinicaId };

    if (filtro.dataInicio || filtro.dataFim) {
      const criadoEm: Record<string, Date> = {};
      if (filtro.dataInicio) criadoEm.$gte = filtro.dataInicio;
      if (filtro.dataFim) criadoEm.$lte = filtro.dataFim;
      query.criadoEm = criadoEm;
    }

    const docs = await this.model.find(query).sort({ criadoEm: -1 }).limit(500).exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  async updateStatus(clinicaId: string, id: string, status: StatusSala, timestamp?: Date): Promise<SalaTelemedicina | null> {
    const set: Record<string, unknown> = { status };

    if (status === StatusSala.EM_ANDAMENTO && timestamp) set.iniciadaEm = timestamp;
    if (status === StatusSala.ENCERRADA && timestamp) set.encerradaEm = timestamp;

    const doc = await this.model
      .findOneAndUpdate(
        { clinicaId, _id: new Types.ObjectId(id) },
        { $set: set },
        { new: true },
      )
      .select('+tokenMedico +tokenPaciente')
      .exec();

    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: SalaTelemedicinaDocument, tokenMedico?: string, tokenPaciente?: string): SalaTelemedicina {
    const obj = doc.toObject({ getters: false });
    return {
      id: obj._id.toString(),
      clinicaId: obj.clinicaId,
      agendamentoId: obj.agendamentoId,
      medicoId: obj.medicoId,
      modalidade: obj.modalidade,
      pacienteId: obj.pacienteId,
      status: obj.status,
      tokenMedico: obj.tokenMedico ?? tokenMedico ?? '',
      tokenPaciente: obj.tokenPaciente ?? tokenPaciente ?? '',
      expiresAt: obj.expiresAt,
      iniciadaEm: obj.iniciadaEm,
      encerradaEm: obj.encerradaEm,
      criadoEm: obj.criadoEm,
    };
  }
}
