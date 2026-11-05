import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CriarTicketInput,
  ListarTicketsInput,
  ResolverTicketInput,
  TicketRepository,
} from '../../application/ports/ticket.repository';
import { Ticket, TicketStatus } from '../../domain/ticket.entity';
import { PacienteCryptoService } from '../../../pacientes/infrastructure/crypto/paciente-crypto.service';
import { TICKET_RESERVA_TTL_MS } from '../../tickets.constants';
import { TicketDocument, TicketMongo } from './ticket.schema';

@Injectable()
export class TicketMongoRepository implements TicketRepository {
  constructor(
    @InjectModel(TicketMongo.name) private readonly model: Model<TicketDocument>,
    private readonly crypto: PacienteCryptoService,
  ) {}

  async criar(input: CriarTicketInput): Promise<Ticket> {
    const created = await this.model.create({
      ...input,
      justificativa: this.crypto.encryptString(input.justificativa),
    });
    return this.toEntity(created);
  }

  async buscarPorId(clinicaId: string, ticketId: string): Promise<Ticket | null> {
    const document = await this.model.findOne({ clinicaId, _id: new Types.ObjectId(ticketId) }).exec();
    return document ? this.toEntity(document) : null;
  }

  async listar(input: ListarTicketsInput): Promise<Ticket[]> {
    const filtro: Record<string, unknown> = { clinicaId: input.clinicaId };
    if (input.status) filtro.status = input.status;
    if (input.pacienteId) filtro.pacienteId = input.pacienteId;
    const documents = await this.model.find(filtro).sort({ abertoEm: -1 }).limit(200).exec();
    return documents.map((document) => this.toEntity(document));
  }

  async reservar(clinicaId: string, ticketId: string, usuarioId: string, agora: Date): Promise<Ticket | null> {
    const vencimento = new Date(agora.getTime() - TICKET_RESERVA_TTL_MS);
    const document = await this.model
      .findOneAndUpdate(
        {
          clinicaId,
          _id: new Types.ObjectId(ticketId),
          status: TicketStatus.ABERTO,
          $or: [{ reservadoEm: { $exists: false } }, { reservadoEm: null }, { reservadoEm: { $lt: vencimento } }],
        },
        { $set: { reservadoPor: usuarioId, reservadoEm: agora } },
        { new: true },
      )
      .exec();
    return document ? this.toEntity(document) : null;
  }

  async liberar(clinicaId: string, ticketId: string, usuarioId: string): Promise<void> {
    await this.model
      .updateOne(
        { clinicaId, _id: new Types.ObjectId(ticketId), status: TicketStatus.ABERTO, reservadoPor: usuarioId },
        { $unset: { reservadoPor: 1, reservadoEm: 1 } },
      )
      .exec();
  }

  async resolver(clinicaId: string, ticketId: string, dados: ResolverTicketInput): Promise<Ticket | null> {
    const set: Record<string, unknown> = {
      status: dados.status,
      resolvidoPor: dados.resolvidoPor,
      resolvidoEm: dados.resolvidoEm,
    };
    if (dados.motivoRecusa !== undefined) set.motivoRecusa = this.crypto.encryptString(dados.motivoRecusa);

    const document = await this.model
      .findOneAndUpdate(
        {
          clinicaId,
          _id: new Types.ObjectId(ticketId),
          status: TicketStatus.ABERTO,
          ...(dados.exigeReservaDe ? { reservadoPor: dados.exigeReservaDe } : {}),
        },
        { $set: set, $unset: { reservadoPor: 1, reservadoEm: 1 } },
        { new: true },
      )
      .exec();
    return document ? this.toEntity(document) : null;
  }

  private toEntity(document: TicketDocument): Ticket {
    const o = document.toObject({ getters: false });
    return {
      id: o._id.toString(),
      clinicaId: o.clinicaId,
      pacienteId: o.pacienteId,
      tipo: o.tipo,
      justificativa: this.crypto.decryptString(o.justificativa),
      autorId: o.autorId,
      status: o.status,
      abertoEm: o.abertoEm,
      resolvidoEm: o.resolvidoEm,
      resolvidoPor: o.resolvidoPor,
      motivoRecusa: o.motivoRecusa ? this.crypto.decryptString(o.motivoRecusa) : undefined,
    };
  }
}
