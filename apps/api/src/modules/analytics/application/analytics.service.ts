import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { Connection } from 'mongoose';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import {
  ANALYTICS_COLLECTION_AGENDAMENTOS,
  ANALYTICS_COLLECTION_LANCAMENTOS,
  ANALYTICS_COLLECTION_NOTIFICACOES,
  ANALYTICS_COLLECTION_PACIENTES,
} from '../analytics.constants';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly pacientesService: PacientesService,
  ) {}

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

    const [porStatus, porTipo, porMedico, porMes, porDia, porSemana] = await Promise.all([
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

      // Pacientes/atendimentos por dia — contagem diária dentro do período.
      col.aggregate([
        { $match: { clinicaId, dataHoraInicio: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$dataHoraInicio' } }, total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]).toArray(),

      // Por semana ISO — evita 40+ barras diárias virarem ilegíveis em períodos longos.
      col.aggregate([
        { $match: { clinicaId, dataHoraInicio: { $gte: dataInicio, $lte: dataFim } } },
        { $group: { _id: { ano: { $isoWeekYear: '$dataHoraInicio' }, semana: { $isoWeek: '$dataHoraInicio' } }, total: { $sum: 1 } } },
        { $sort: { '_id.ano': 1, '_id.semana': 1 } },
      ]).toArray(),
    ]);

    return { porStatus, porTipo, topMedicos: porMedico, porMes, porDia, porSemana };
  }

  /** Cobranças de psicologia pendentes, separadas por vencidas / a vencer (7 dias) / sem data. */
  async cobrancasPsicologia(clinicaId: string, profissionalId?: string) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_LANCAMENTOS);
    const match: Record<string, unknown> = { clinicaId, origem: 'psicologia', status: 'pendente' };
    if (profissionalId) match.profissionalId = profissionalId;

    const lancamentos = await col.find(match).sort({ vencimento: 1 }).toArray();

    const hoje = new Date();
    const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);

    const vencidas: typeof lancamentos = [];
    const aVencer: typeof lancamentos = [];
    const semData: typeof lancamentos = [];
    for (const l of lancamentos) {
      if (!l.vencimento) semData.push(l);
      else if (new Date(l.vencimento) < hoje) vencidas.push(l);
      else if (new Date(l.vencimento) <= em7Dias) aVencer.push(l);
    }

    const pacienteIds = lancamentos.map((l) => l.pacienteId).filter((id): id is string => !!id);
    const nomes = await this.pacientesService.resumoPorIds(clinicaId, pacienteIds);

    const montar = (lista: typeof lancamentos) =>
      lista.map((l) => ({
        id: l._id.toString(),
        pacienteId: l.pacienteId,
        pacienteNome: l.pacienteId ? nomes.get(l.pacienteId)?.nome : undefined,
        valor: l.valor,
        vencimento: l.vencimento,
        ciclo: l.ciclo,
      }));

    return {
      vencidas: montar(vencidas),
      aVencer: montar(aVencer),
      semData: montar(semData),
      totalVencido: vencidas.reduce((soma, l) => soma + (l.valor ?? 0), 0),
      totalAVencer: aVencer.reduce((soma, l) => soma + (l.valor ?? 0), 0),
    };
  }

  /**
   * Pacientes com sinal de perda de seguimento: sem sessão concluída há mais
   * de `diasLimite` dias, ou com proporção alta de faltas no período.
   */
  async perdaSeguimento(clinicaId: string, profissionalId?: string, diasLimite = 30) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_AGENDAMENTOS);
    const match: Record<string, unknown> = { clinicaId };
    if (profissionalId) match.medicoId = profissionalId;

    const porPaciente = await col.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$pacienteId',
          total: { $sum: 1 },
          faltas: { $sum: { $cond: [{ $eq: ['$status', 'falta'] }, 1, 0] } },
          ultimaConcluida: {
            $max: { $cond: [{ $eq: ['$status', 'concluido'] }, '$dataHoraInicio', undefined] },
          },
        },
      },
    ]).toArray();

    const limite = new Date(Date.now() - diasLimite * 24 * 60 * 60 * 1000);
    const emRisco = porPaciente.filter((p) => {
      const semSessaoRecente = !p.ultimaConcluida || new Date(p.ultimaConcluida) < limite;
      const proporcaoFaltas = p.total > 0 ? p.faltas / p.total : 0;
      return semSessaoRecente || proporcaoFaltas >= 0.3;
    });

    const pacienteIds = emRisco.map((p) => p._id).filter((id): id is string => !!id);
    const nomes = await this.pacientesService.resumoPorIds(clinicaId, pacienteIds);

    return emRisco
      .map((p) => ({
        pacienteId: p._id,
        pacienteNome: p._id ? nomes.get(p._id)?.nome : undefined,
        totalAgendamentos: p.total,
        faltas: p.faltas,
        ultimaSessaoConcluidaEm: p.ultimaConcluida,
      }))
      .sort((a, b) => (a.ultimaSessaoConcluidaEm ?? '').localeCompare(b.ultimaSessaoConcluidaEm ?? ''));
  }

  /**
   * Intervalos livres de um dia dentro da janela [horaInicio, horaFim), com
   * base nos agendamentos já marcados (não persiste nenhuma configuração de
   * expediente — a janela é informada a cada consulta).
   */
  async horariosVagos(
    clinicaId: string,
    data: Date,
    profissionalId?: string,
    horaInicio = 8,
    horaFim = 19,
    slotMinutos = 60,
  ) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_AGENDAMENTOS);
    const inicioDoDia = new Date(data);
    inicioDoDia.setHours(0, 0, 0, 0);
    const fimDoDia = new Date(inicioDoDia.getTime() + 24 * 60 * 60 * 1000);

    const match: Record<string, unknown> = {
      clinicaId,
      dataHoraInicio: { $gte: inicioDoDia, $lt: fimDoDia },
      status: { $ne: 'cancelado' },
    };
    if (profissionalId) match.medicoId = profissionalId;

    const ocupados = await col
      .find(match)
      .sort({ dataHoraInicio: 1 })
      .project({ dataHoraInicio: 1, dataHoraFim: 1 })
      .toArray();

    const janelaInicio = new Date(inicioDoDia);
    janelaInicio.setHours(horaInicio, 0, 0, 0);
    const janelaFim = new Date(inicioDoDia);
    janelaFim.setHours(horaFim, 0, 0, 0);

    const livres: Array<{ inicio: Date; fim: Date }> = [];
    let cursor = janelaInicio;
    for (const ag of ocupados) {
      const inicioAg = new Date(ag.dataHoraInicio);
      const fimAg = new Date(ag.dataHoraFim ?? ag.dataHoraInicio);
      if (inicioAg > cursor) livres.push({ inicio: new Date(cursor), fim: new Date(Math.min(inicioAg.getTime(), janelaFim.getTime())) });
      if (fimAg > cursor) cursor = fimAg;
      if (cursor >= janelaFim) break;
    }
    if (cursor < janelaFim) livres.push({ inicio: new Date(cursor), fim: new Date(janelaFim) });

    // Quebra os buracos livres em slots de `slotMinutos` para ficar acionável
    // (um buraco de 3h sem quebra não diz quantas consultas cabem nele).
    const slots: Array<{ inicio: Date; fim: Date }> = [];
    for (const livre of livres) {
      let s = new Date(livre.inicio);
      while (s.getTime() + slotMinutos * 60 * 1000 <= livre.fim.getTime()) {
        const fimSlot = new Date(s.getTime() + slotMinutos * 60 * 1000);
        slots.push({ inicio: s, fim: fimSlot });
        s = fimSlot;
      }
    }

    return slots;
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

  /** Pacientes ativos por representante (quem indicou). */
  async pacientesPorRepresentante(clinicaId: string) {
    const col = this.connection.collection(ANALYTICS_COLLECTION_PACIENTES);

    return col.aggregate([
      { $match: { clinicaId, ativo: true, representante: { $ne: null } } },
      { $group: { _id: '$representante', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]).toArray();
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

  /** PSICOLOGO só enxerga os próprios relatórios de caixa/agenda, mesmo informando outro id. */
  resolveProfissionalId(user: AuthTokenPayload, requestedId?: string): string | undefined {
    if (user.papel === Papel.PSICOLOGO) return user.sub;
    return requestedId;
  }
}
