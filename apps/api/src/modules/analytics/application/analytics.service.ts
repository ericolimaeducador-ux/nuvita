import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { Connection } from 'mongoose';
import {
  ANALYTICS_COLLECTION_AGENDAMENTOS,
  ANALYTICS_COLLECTION_LANCAMENTOS,
  ANALYTICS_COLLECTION_NOTIFICACOES,
  ANALYTICS_COLLECTION_PACIENTES,
} from '../analytics.constants';

@Injectable()
export class AnalyticsService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async pacientes(clinicaId: string, dataInicio: Date, dataFim: Date) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_PACIENTES);

    const [totalAtivos, novosPorMes, porSexo] = await Promise.all([
      col.countDocuments({ clinicaId, ativo: true }),

      col.aggregate([
        { $match: { clinicaId, criadoEm: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: { ano: { $year: '$criadoEm' }, mes: { $month: '$criadoEm' } }, total: { $sum: 1 } } },
        { $sort: { '_id.ano': 1, '_id.mes': 1 } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, ativo: true } },
        { $group: { _id: '$sexo', total: { $sum: 1 } } },
      ]).toArray(),
    ]);

    return { totalAtivos, novosPorMes, porSexo };
  }

  async agendamentos(clinicaId: string, dataInicio: Date, dataFim: Date) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_AGENDAMENTOS);

    const [porStatus, porTipo, porMedico, porMes] = await Promise.all([
      col.aggregate([
        { $match: { clinicaId, dataHoraInicio: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: '$status', total: { $sum: 1 } } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, dataHoraInicio: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: '$tipo', total: { $sum: 1 } } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, dataHoraInicio: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: '$medicoId', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, dataHoraInicio: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: { ano: { $year: '$dataHoraInicio' }, mes: { $month: '$dataHoraInicio' } }, total: { $sum: 1 } } },
        { $sort: { '_id.ano': 1, '_id.mes': 1 } },
      ]).toArray(),
    ]);

    return { porStatus, porTipo, topMedicos: porMedico, porMes };
  }

  async financeiro(clinicaId: string, dataInicio: Date, dataFim: Date) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_LANCAMENTOS);

    const [receitasPorMes, despesasPorMes, porFormaPagamento, totalGeral] = await Promise.all([
      col.aggregate([
        { $match: { clinicaId, tipo: 'receita', status: 'recebido', criadoEm: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: { ano: { $year: '$criadoEm' }, mes: { $month: '$criadoEm' } }, total: { $sum: '$valor' }, quantidade: { $sum: 1 } } },
        { $sort: { '_id.ano': 1, '_id.mes': 1 } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, tipo: 'despesa', status: 'recebido', criadoEm: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: { ano: { $year: '$criadoEm' }, mes: { $month: '$criadoEm' } }, total: { $sum: '$valor' }, quantidade: { $sum: 1 } } },
        { $sort: { '_id.ano': 1, '_id.mes': 1 } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, tipo: 'receita', status: 'recebido', criadoEm: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: '$formaPagamento', total: { $sum: '$valor' }, quantidade: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, status: { $ne: 'cancelado' }, criadoEm: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: { tipo: '$tipo', status: '$status' }, total: { $sum: '$valor' } } },
      ]).toArray(),
    ]);

    return { receitasPorMes, despesasPorMes, porFormaPagamento, totalGeral };
  }

  async notificacoes(clinicaId: string, dataInicio: Date, dataFim: Date) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_NOTIFICACOES);

    const [porStatus, porCanal, porTipo, taxaEntrega] = await Promise.all([
      col.aggregate([
        { $match: { clinicaId, criadoEm: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: '$status', total: { $sum: 1 } } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, criadoEm: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: '$canal', total: { $sum: 1 }, enviados: { $sum: { $cond: [{ $eq: ['$status', 'enviado'] }, 1, 0] } } } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, criadoEm: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: '$tipo', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]).toArray(),

      col.aggregate([
        { $match: { clinicaId, criadoEm: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: null, total: { $sum: 1 }, enviados: { $sum: { $cond: [{ $eq: ['$status', 'enviado'] }, 1, 0] } } } },
      ]).toArray(),
    ]);

    const taxa = taxaEntrega[0] as { total: number; enviados: number } | undefined;

    return {
      porStatus,
      porCanal,
      porTipo,
      taxaEntrega: taxa ? Math.round((taxa.enviados / taxa.total) * 100) : 0,
    };
  }

  defaultPeriod(): { dataInicio: Date; dataFim: Date } {
    const now = new Date();
    return {
      dataInicio: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      dataFim: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }

  resolveClinicaId(user: AuthTokenPayload, requestedId?: string): string {
    if (user.papel !== Papel.ADMIN && user.clinicaId) return user.clinicaId;
    if (requestedId) return requestedId;
    throw new BadRequestException('clinicaId obrigatorio.');
  }
}
