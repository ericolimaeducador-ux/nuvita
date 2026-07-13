import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { PRONTUARIO_REPOSITORY } from '../../prontuarios/prontuarios.constants';
import { ProntuarioRepository } from '../../prontuarios/application/ports/prontuario.repository';
import { TipoAtendimento } from '../../prontuarios/domain/prontuario.entity';
import { CONFIG_PSICOLOGO_REPOSITORY, LANCAMENTO_REPOSITORY } from '../financeiro.constants';
import {
  Lancamento,
  OrigemLancamento,
  StatusLancamento,
  TipoLancamento,
} from '../domain/lancamento.entity';
import {
  PacientePsicologia,
  PainelPsicologia,
  SESSOES_POR_CICLO,
  StatusCiclo,
} from '../domain/psicologia.entity';
import { ConfigPsicologoRepository } from './ports/config-psicologo.repository';
import { LancamentoRepository } from './ports/lancamento.repository';
import { CobrarCicloDto } from './dto/cobrar-ciclo.dto';
import { SalvarConfigPsicologoDto } from './dto/salvar-config-psicologo.dto';
import { RequestAuditContext } from './financeiro.service';

/**
 * Financeiro do psicólogo autônomo: o acompanhamento é vendido em ciclos de 4
 * sessões, pagos antes de começar. O sistema conta as sessões pelos prontuários
 * de psicoterapia e avisa quando o ciclo atual ainda não foi cobrado.
 */
@Injectable()
export class PsicologiaFinanceiroService {
  constructor(
    @Inject(LANCAMENTO_REPOSITORY) private readonly lancamentos: LancamentoRepository,
    @Inject(CONFIG_PSICOLOGO_REPOSITORY) private readonly configs: ConfigPsicologoRepository,
    @Inject(PRONTUARIO_REPOSITORY) private readonly prontuarios: ProntuarioRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly pacientesService: PacientesService,
  ) {}

  async painel(profissionalIdSolicitado: string | undefined, context: RequestAuditContext): Promise<PainelPsicologia> {
    const clinicaId = resolveTenantClinicaId(context.user);
    const profissionalId = this.profissionalDoPainel(context.user, profissionalIdSolicitado);

    const [sessoes, cobrancas, config] = await Promise.all([
      this.prontuarios.resumoSessoesPorPaciente(clinicaId, TipoAtendimento.PSICOTERAPIA, profissionalId),
      this.lancamentos.list({
        clinicaId,
        origem: OrigemLancamento.PSICOLOGIA,
        profissionalId,
      }),
      this.configs.find(clinicaId, profissionalId),
    ]);

    const nomes = await this.pacientesService.resumoPorIds(clinicaId, sessoes.map((s) => s.pacienteId));

    const cobrancasPorPaciente = new Map<string, Lancamento[]>();
    for (const c of cobrancas) {
      if (!c.pacienteId || c.status === StatusLancamento.CANCELADO) continue;
      const lista = cobrancasPorPaciente.get(c.pacienteId) ?? [];
      lista.push(c);
      cobrancasPorPaciente.set(c.pacienteId, lista);
    }

    // Pacientes que já têm cobrança mas ainda nenhuma sessão (pagaram o 1º ciclo
    // adiantado) também aparecem no painel — senão sumiriam até a 1ª sessão.
    const pacienteIds = new Set([...sessoes.map((s) => s.pacienteId), ...cobrancasPorPaciente.keys()]);
    const sessoesPorPaciente = new Map(sessoes.map((s) => [s.pacienteId, s]));

    const pacientes: PacientePsicologia[] = [];
    for (const pacienteId of pacienteIds) {
      const resumo = sessoesPorPaciente.get(pacienteId);
      const doPaciente = (cobrancasPorPaciente.get(pacienteId) ?? []).sort((a, b) => (a.ciclo ?? 0) - (b.ciclo ?? 0));
      pacientes.push(
        this.montarLinha(pacienteId, nomes.get(pacienteId)?.nome, resumo?.total ?? 0, resumo?.primeiraEm, resumo?.ultimaEm, doPaciente),
      );
    }

    // O que precisa de ação vem primeiro: cobrar, depois receber, depois em dia.
    const peso: Record<StatusCiclo, number> = {
      [StatusCiclo.A_COBRAR]: 0,
      [StatusCiclo.AGUARDANDO_PAGAMENTO]: 1,
      [StatusCiclo.EM_DIA]: 2,
    };
    pacientes.sort(
      (a, b) => peso[a.statusCiclo] - peso[b.statusCiclo] || (a.pacienteNome ?? '').localeCompare(b.pacienteNome ?? ''),
    );

    const inicioDoMes = new Date();
    inicioDoMes.setDate(1);
    inicioDoMes.setHours(0, 0, 0, 0);

    const recebidoNoMes = cobrancas
      .filter((c) => c.status === StatusLancamento.RECEBIDO && c.recebidoEm && c.recebidoEm >= inicioDoMes)
      .reduce((total, c) => total + c.valor, 0);

    await this.audit(AuditEvent.FINANCIAL_DASHBOARD_VIEWED, context, { clinicaId, origem: OrigemLancamento.PSICOLOGIA });

    return {
      valorSessao: config?.valorSessao,
      sessoesPorCiclo: SESSOES_POR_CICLO,
      recebidoNoMes,
      aReceber: pacientes.reduce((total, p) => total + p.valorEmAberto, 0),
      ciclosACobrar: pacientes.filter((p) => p.statusCiclo === StatusCiclo.A_COBRAR).length,
      pacientes,
    };
  }

  async salvarConfig(dto: SalvarConfigPsicologoDto, context: RequestAuditContext) {
    const clinicaId = resolveTenantClinicaId(context.user);
    const profissionalId = this.profissionalDoPainel(context.user, dto.profissionalId);

    const config = await this.configs.save(clinicaId, profissionalId, dto.valorSessao);
    await this.audit(AuditEvent.FINANCIAL_ENTRY_CREATED, context, {
      clinicaId,
      configPsicologo: config.id,
      valorSessao: dto.valorSessao,
    });
    return config;
  }

  async cobrarCiclo(dto: CobrarCicloDto, context: RequestAuditContext) {
    const clinicaId = resolveTenantClinicaId(context.user);
    const profissionalId = this.profissionalDoPainel(context.user, dto.profissionalId);

    const jaCobrado = (
      await this.lancamentos.list({
        clinicaId,
        origem: OrigemLancamento.PSICOLOGIA,
        profissionalId,
        pacienteId: dto.pacienteId,
      })
    ).some((l) => l.ciclo === dto.ciclo && l.status !== StatusLancamento.CANCELADO);

    if (jaCobrado) {
      throw new BadRequestException(`O ciclo ${dto.ciclo} deste paciente já tem uma cobrança. Cancele a anterior antes de emitir outra.`);
    }

    const lancamento = await this.lancamentos.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      tipo: TipoLancamento.RECEITA,
      descricao: dto.descricao ?? `Psicoterapia — ciclo ${dto.ciclo} (${SESSOES_POR_CICLO} sessões)`,
      valor: dto.valor,
      formaPagamento: dto.formaPagamento,
      vencimento: dto.vencimento ? new Date(dto.vencimento) : undefined,
      observacoes: dto.observacoes,
      origem: OrigemLancamento.PSICOLOGIA,
      profissionalId,
      ciclo: dto.ciclo,
      criadoPor: context.user.sub,
    });

    await this.audit(AuditEvent.FINANCIAL_ENTRY_CREATED, context, {
      clinicaId,
      lancamentoId: lancamento.id,
      origem: OrigemLancamento.PSICOLOGIA,
      ciclo: dto.ciclo,
    });
    return lancamento;
  }

  async receber(id: string, context: RequestAuditContext) {
    const clinicaId = resolveTenantClinicaId(context.user);
    await this.garantirCobrancaPropria(clinicaId, id, context.user);

    const lancamento = await this.lancamentos.updateStatus(clinicaId, id, StatusLancamento.RECEBIDO, new Date());
    if (!lancamento) throw new NotFoundException('Cobranca nao encontrada ou ja baixada.');

    await this.audit(AuditEvent.FINANCIAL_ENTRY_RECEIVED, context, { clinicaId, lancamentoId: id });
    return lancamento;
  }

  async cancelar(id: string, context: RequestAuditContext) {
    const clinicaId = resolveTenantClinicaId(context.user);
    await this.garantirCobrancaPropria(clinicaId, id, context.user);

    const lancamento = await this.lancamentos.updateStatus(clinicaId, id, StatusLancamento.CANCELADO);
    if (!lancamento) throw new NotFoundException('Cobranca nao encontrada ou ja baixada.');

    await this.audit(AuditEvent.FINANCIAL_ENTRY_CANCELLED, context, { clinicaId, lancamentoId: id });
    return lancamento;
  }

  /** Monta a situação do paciente: onde ele está nas sessões e no pagamento. */
  private montarLinha(
    pacienteId: string,
    pacienteNome: string | undefined,
    sessoesRealizadas: number,
    primeiraSessaoEm: Date | undefined,
    ultimaSessaoEm: Date | undefined,
    cobrancas: Lancamento[],
  ): PacientePsicologia {
    const cicloAtual = Math.floor(sessoesRealizadas / SESSOES_POR_CICLO) + 1;
    const sessoesNoCiclo = sessoesRealizadas % SESSOES_POR_CICLO;

    const doCicloAtual = cobrancas.find((c) => c.ciclo === cicloAtual);
    const statusCiclo = !doCicloAtual
      ? StatusCiclo.A_COBRAR
      : doCicloAtual.status === StatusLancamento.RECEBIDO
        ? StatusCiclo.EM_DIA
        : StatusCiclo.AGUARDANDO_PAGAMENTO;

    return {
      pacienteId,
      pacienteNome,
      sessoesRealizadas,
      proximaSessao: sessoesRealizadas + 1,
      cicloAtual,
      sessoesNoCiclo,
      sessoesAteFecharCiclo: SESSOES_POR_CICLO - sessoesNoCiclo,
      statusCiclo,
      valorEmAberto: cobrancas
        .filter((c) => c.status === StatusLancamento.PENDENTE)
        .reduce((total, c) => total + c.valor, 0),
      primeiraSessaoEm,
      ultimaSessaoEm,
      cobrancas: cobrancas.map((c) => ({
        id: c.id,
        ciclo: c.ciclo ?? 0,
        valor: c.valor,
        status: c.status,
        formaPagamento: c.formaPagamento,
        vencimento: c.vencimento,
        recebidoEm: c.recebidoEm,
        criadoEm: c.criadoEm,
      })),
    };
  }

  /** O psicólogo só mexe no próprio caixa — nem enxerga nem baixa cobrança de outro. */
  private async garantirCobrancaPropria(clinicaId: string, id: string, user: AuthTokenPayload) {
    const lancamento = await this.lancamentos.findById(clinicaId, id);
    if (!lancamento || lancamento.origem !== OrigemLancamento.PSICOLOGIA) {
      throw new NotFoundException('Cobranca nao encontrada.');
    }
    if (user.papel === Papel.PSICOLOGO && lancamento.profissionalId !== user.sub) {
      throw new ForbiddenException('Esta cobranca pertence a outro profissional.');
    }
  }

  /**
   * De quem é o caixa. O psicólogo só opera o próprio, sempre — nem informando
   * outro id. Admin/super-admin podem abrir o painel de um psicólogo específico.
   */
  private profissionalDoPainel(user: AuthTokenPayload, solicitado?: string): string {
    if (user.papel === Papel.PSICOLOGO) return user.sub;
    return solicitado ?? user.sub;
  }

  private async audit(event: AuditEvent, context: RequestAuditContext, metadata: Record<string, unknown>) {
    await this.auditLogs.create({
      event,
      userId: context.user.sub,
      email: context.user.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata,
    });
  }
}
