import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { ORDEM_ETAPAS_FLUXO } from '../../../../../../packages/shared/src/fluxo-clinico';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { Connection } from 'mongoose';
import {
  ANALYTICS_COLLECTION_AGENDAMENTOS,
  ANALYTICS_COLLECTION_AVALIACOES_IU,
  ANALYTICS_COLLECTION_CHECKLIST_DOCUMENTOS,
  ANALYTICS_COLLECTION_ENTREGAS,
  ANALYTICS_COLLECTION_LANCAMENTOS,
  ANALYTICS_COLLECTION_NOTIFICACOES,
  ANALYTICS_COLLECTION_PACIENTES,
} from '../analytics.constants';

// String exata semeada em packages/shared/src/checklist-documentos/documentos-padrao.ts —
// "aguardando relatório" é modelado como um item de checklist com este nome
// pendente, não como um status próprio. Se esse texto for editado lá, este
// relatório precisa acompanhar.
const NOME_DOCUMENTO_RELATORIO_MEDICO = 'Relatório médico';

/** $lookup em pacientes a partir de um pacienteId gravado como string (não ObjectId ref). */
function lookupPaciente() {
  return {
    $lookup: {
      from: ANALYTICS_COLLECTION_PACIENTES,
      let: { pid: { $toObjectId: '$pacienteId' } },
      pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$pid'] } } },
        { $project: { nome: 1 } },
      ],
      as: 'paciente',
    },
  };
}

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

  /**
   * Pacientes por calibre de cateter indicado ("cateter número X") — a partir
   * da avaliação de IU mais recente de cada paciente (não é um recorte por
   * período: é o quadro atual, como "quantos pacientes usam cateter 12 hoje").
   */
  async pacientesPorCateter(clinicaId: string) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_AVALIACOES_IU);

    return col.aggregate([
      { $match: { clinicaId, excluidoEm: { $exists: false } } },
      { $sort: { pacienteId: 1, criadoEm: -1 } },
      { $group: { _id: '$pacienteId', ultima: { $first: '$$ROOT' } } },
      { $match: { 'ultima.produtoIndicado.french': { $exists: true } } },
      { $group: { _id: '$ultima.produtoIndicado.french', total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray();
  }

  /** Pacientes ativos por representante (quem indicou). */
  async pacientesPorRepresentante(clinicaId: string) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_PACIENTES);

    return col.aggregate([
      { $match: { clinicaId, ativo: true, representante: { $ne: null } } },
      { $group: { _id: '$representante', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]).toArray();
  }

  /** Entregas registradas no período, com nome do paciente ("quem recebeu insumo em casa"). */
  async entregasNoPeriodo(clinicaId: string, dataInicio: Date, dataFim: Date) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_ENTREGAS);

    return col.aggregate([
      { $match: { clinicaId, dataEntrega: { $gte: dataInicio, $lte: dataFim } } },
      lookupPaciente(),
      { $unwind: '$paciente' },
      {
        $project: {
          _id: 0,
          pacienteId: 1,
          pacienteNome: '$paciente.nome',
          dataEntrega: 1,
          status: 1,
          itens: 1,
        },
      },
      { $sort: { dataEntrega: -1 } },
    ]).toArray();
  }

  /** Quantidade de sondas entregues no período (soma de quantidade, categoria=sonda). */
  async sondasNoPeriodo(clinicaId: string, dataInicio: Date, dataFim: Date) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_ENTREGAS);

    const resultado = await col.aggregate([
      { $match: { clinicaId, dataEntrega: { $gte: dataInicio, $lte: dataFim } } },
      { $unwind: '$itens' },
      { $match: { 'itens.categoria': 'sonda' } },
      { $group: { _id: null, totalQuantidade: { $sum: '$itens.quantidade' } } },
    ]).toArray();

    return { totalQuantidade: (resultado[0] as { totalQuantidade: number } | undefined)?.totalQuantidade ?? 0 };
  }

  /** Pacientes com o documento "Relatório médico" ainda pendente no checklist. */
  async pacientesAguardandoRelatorio(clinicaId: string) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_CHECKLIST_DOCUMENTOS);

    return col.aggregate([
      { $match: { clinicaId, nome: NOME_DOCUMENTO_RELATORIO_MEDICO, status: 'pendente' } },
      lookupPaciente(),
      { $unwind: '$paciente' },
      { $project: { _id: 0, pacienteId: 1, pacienteNome: '$paciente.nome', criadoEm: 1 } },
      { $sort: { criadoEm: 1 } },
    ]).toArray();
  }

  /** Pacientes ativos por etapa do fluxo clínico, com as etapas sem paciente zeradas (não omitidas). */
  async pacientesPorEtapaFluxo(clinicaId: string) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_PACIENTES);

    const resultado = await col.aggregate([
      { $match: { clinicaId, ativo: true } },
      { $group: { _id: '$etapaFluxo', total: { $sum: 1 } } },
    ]).toArray();

    const porEtapa = new Map(resultado.map((r) => [r._id as string, r.total as number]));
    return ORDEM_ETAPAS_FLUXO.map((etapa) => ({ etapa, total: porEtapa.get(etapa) ?? 0 }));
  }

  defaultPeriod(): { dataInicio: Date; dataFim: Date } {
    const now = new Date();
    return {
      dataInicio: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      dataFim: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }

  resolveClinicaId(user: AuthTokenPayload, requestedId?: string): string {
    return resolveTenantClinicaId(user, requestedId);
  }
}
