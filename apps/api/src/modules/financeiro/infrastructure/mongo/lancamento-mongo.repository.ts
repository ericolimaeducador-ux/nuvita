import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateLancamentoInput,
  DashboardInput,
  LancamentoRepository,
  ListLancamentosInput,
} from '../../application/ports/lancamento.repository';
import { DashboardFinanceiro, Lancamento, StatusLancamento, TipoLancamento } from '../../domain/lancamento.entity';
import { LancamentoDocument, LancamentoMongo } from './lancamento.schema';

@Injectable()
export class LancamentoMongoRepository implements LancamentoRepository {
  constructor(
    @InjectModel(LancamentoMongo.name) private readonly model: Model<LancamentoDocument>,
  ) {}

  async create(input: CreateLancamentoInput): Promise<Lancamento> {
    const doc = await this.model.create({
      clinicaId: input.clinicaId,
      pacienteId: input.pacienteId,
      agendamentoId: input.agendamentoId,
      tipo: input.tipo,
      descricao: input.descricao,
      valor: input.valor,
      formaPagamento: input.formaPagamento,
      status: StatusLancamento.PENDENTE,
      vencimento: input.vencimento,
      observacoes: input.observacoes,
      criadoPor: input.criadoPor,
    });

    return this.toEntity(doc);
  }

  async findById(clinicaId: string, id: string): Promise<Lancamento | null> {
    const doc = await this.model.findOne({ clinicaId, _id: new Types.ObjectId(id) }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async list(input: ListLancamentosInput): Promise<Lancamento[]> {
    const query: Record<string, unknown> = { clinicaId: input.clinicaId };

    if (input.pacienteId) query.pacienteId = input.pacienteId;
    if (input.agendamentoId) query.agendamentoId = input.agendamentoId;
    if (input.tipo) query.tipo = input.tipo;
    if (input.status) query.status = input.status;
    if (input.dataInicio || input.dataFim) {
      query.criadoEm = {};
      if (input.dataInicio) (query.criadoEm as Record<string, unknown>).$gte = input.dataInicio;
      if (input.dataFim) (query.criadoEm as Record<string, unknown>).$lte = input.dataFim;
    }

    const docs = await this.model.find(query).sort({ criadoEm: -1 }).limit(500).exec();
    return docs.map((d) => this.toEntity(d));
  }

  async updateStatus(clinicaId: string, id: string, status: StatusLancamento, recebidoEm?: Date): Promise<Lancamento | null> {
    const set: Record<string, unknown> = { status };
    if (recebidoEm) set.recebidoEm = recebidoEm;

    const doc = await this.model
      .findOneAndUpdate(
        { clinicaId, _id: new Types.ObjectId(id), status: StatusLancamento.PENDENTE },
        { $set: set },
        { new: true },
      )
      .exec();

    return doc ? this.toEntity(doc) : null;
  }

  async dashboard(input: DashboardInput): Promise<DashboardFinanceiro> {
    const pipeline = [
      {
        $match: {
          clinicaId: input.clinicaId,
          status: { $ne: StatusLancamento.CANCELADO },
          criadoEm: { $gte: input.dataInicio, $lte: input.dataFim },
        },
      },
      {
        $group: {
          _id: { tipo: '$tipo', formaPagamento: '$formaPagamento', status: '$status' },
          total: { $sum: '$valor' },
          quantidade: { $sum: 1 },
        },
      },
    ];

    const results = await this.model.aggregate(pipeline).exec() as Array<{
      _id: { tipo: TipoLancamento; formaPagamento?: string; status: StatusLancamento };
      total: number;
      quantidade: number;
    }>;

    let totalReceitas = 0;
    let totalDespesas = 0;
    let totalPendente = 0;
    const formaMap = new Map<string, { total: number; quantidade: number }>();

    for (const r of results) {
      if (r._id.tipo === TipoLancamento.RECEITA && r._id.status === StatusLancamento.RECEBIDO) {
        totalReceitas += r.total;
      } else if (r._id.tipo === TipoLancamento.DESPESA && r._id.status === StatusLancamento.RECEBIDO) {
        totalDespesas += r.total;
      }

      if (r._id.status === StatusLancamento.PENDENTE) {
        totalPendente += r.total;
      }

      const forma = r._id.formaPagamento ?? 'nao_informado';
      const current = formaMap.get(forma) ?? { total: 0, quantidade: 0 };
      formaMap.set(forma, { total: current.total + r.total, quantidade: current.quantidade + r.quantidade });
    }

    return {
      totalReceitas,
      totalDespesas,
      totalPendente,
      saldo: totalReceitas - totalDespesas,
      porFormaPagamento: Array.from(formaMap.entries()).map(([forma, data]) => ({ forma, ...data })),
    };
  }

  private toEntity(doc: LancamentoDocument): Lancamento {
    const obj = doc.toObject({ getters: false });
    return {
      id: obj._id.toString(),
      clinicaId: obj.clinicaId,
      pacienteId: obj.pacienteId,
      agendamentoId: obj.agendamentoId,
      tipo: obj.tipo,
      descricao: obj.descricao,
      valor: obj.valor,
      formaPagamento: obj.formaPagamento,
      status: obj.status,
      vencimento: obj.vencimento,
      recebidoEm: obj.recebidoEm,
      observacoes: obj.observacoes,
      criadoPor: obj.criadoPor,
      criadoEm: obj.criadoEm,
      atualizadoEm: obj.atualizadoEm,
    };
  }
}
