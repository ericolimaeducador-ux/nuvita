import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { NotificacoesService } from '../../notificacoes/application/notificacoes.service';
import { CanalNotificacao, TipoNotificacao } from '../../notificacoes/domain/notificacao.entity';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { COBRANCA_REPOSITORY, FINANCEIRO_CONFIG_REPOSITORY } from '../cobrancas.constants';
import {
  Cobranca,
  ItemCobranca,
  StatusCobranca,
  TipoCobranca,
  somaItens,
  statusEfetivo,
} from '../domain/cobranca.entity';
import { FinanceiroConfig, VALOR_CONSULTA_AVALIACAO_PADRAO_CENTAVOS } from '../domain/financeiro-config.entity';
import { CobrancaRepository } from './ports/cobranca.repository';
import { FinanceiroConfigRepository } from './ports/financeiro-config.repository';
import { CreateCobrancaDto } from './dto/create-cobranca.dto';
import { UpdateCobrancaDto } from './dto/update-cobranca.dto';
import {
  CanalAviso,
  CancelarCobrancaDto,
  ConsultaAvaliacaoDto,
  EnviarAvisoDto,
  ListCobrancasQueryDto,
  PagarCobrancaDto,
  ResumoQueryDto,
  SalvarConfigFinanceiroDto,
} from './dto/outros.dto';

export interface CobrancaAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

export interface ResumoMensal {
  mes: string;
  aReceberCentavos: number;
  recebidoCentavos: number;
  vencidoCentavos: number;
  quantidades: { aReceber: number; recebido: number; vencido: number };
}

export interface PaginaCobrancasComPaciente {
  items: Array<Cobranca & { pacienteNome?: string }>;
  hasMore: boolean;
  nextCursor?: string;
}

export interface ResultadoAviso {
  cobranca: Cobranca;
  canais: Array<{ canal: CanalAviso; ok: boolean; erro?: string }>;
}

// TODO(conteudo): descrição padrão da cobrança de consulta de avaliação (texto livre, editável na criação).
const DESCRICAO_CONSULTA_AVALIACAO = 'Consulta de avaliação';

const ABERTAS = [StatusCobranca.PENDENTE, StatusCobranca.ENVIADA];

@Injectable()
export class CobrancasService {
  constructor(
    @Inject(COBRANCA_REPOSITORY) private readonly repo: CobrancaRepository,
    @Inject(FINANCEIRO_CONFIG_REPOSITORY) private readonly configRepo: FinanceiroConfigRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly pacientesService: PacientesService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  // ---------------- configuração (valor da consulta de avaliação, por clínica) ----------------

  async obterConfig(clinicaId: string | undefined, user: AuthTokenPayload): Promise<FinanceiroConfig> {
    return this.configDaClinica(resolveTenantClinicaId(user, clinicaId));
  }

  async salvarConfig(dto: SalvarConfigFinanceiroDto, context: CobrancaAuditContext): Promise<FinanceiroConfig> {
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);
    const config = await this.configRepo.upsert(clinicaId, dto.valorConsultaAvaliacaoCentavos, context.user.sub);
    // Só ids e o NOME do campo (nunca o valor).
    await this.audit(AuditEvent.FINANCEIRO_CONFIG_UPDATED, context, { clinicaId, campos: ['valorConsultaAvaliacaoCentavos'] });
    return config;
  }

  private async configDaClinica(clinicaId: string): Promise<FinanceiroConfig> {
    return (
      (await this.configRepo.findByClinica(clinicaId)) ?? {
        clinicaId,
        valorConsultaAvaliacaoCentavos: VALOR_CONSULTA_AVALIACAO_PADRAO_CENTAVOS,
      }
    );
  }

  // ---------------- criação ----------------

  /** Criação manual. O valor é o campo aberto, ou a soma dos itens (se vierem os dois, precisam bater). */
  async criar(dto: CreateCobrancaDto, context: CobrancaAuditContext): Promise<Cobranca> {
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);
    await this.assertPacienteDaClinica(clinicaId, dto.pacienteId);
    const { valorCentavos, itens } = this.resolverValor(dto.valorCentavos, dto.itens);

    const cobranca = await this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      tipo: dto.tipo,
      descricao: dto.descricao,
      valorCentavos,
      itens,
      formaPagamento: dto.formaPagamento,
      parcelas: dto.parcelas,
      vencimento: new Date(dto.vencimento),
      status: StatusCobranca.PENDENTE,
      atendimentoId: dto.atendimentoId,
      planoId: dto.planoId,
      criadoPor: context.user.sub,
    });
    await this.audit(AuditEvent.LANCAMENTO_FINANCEIRO_CREATED, context, {
      clinicaId,
      cobrancaId: cobranca.id,
      pacienteId: cobranca.pacienteId,
      tipo: cobranca.tipo,
    });
    return this.apresentar(cobranca);
  }

  /**
   * Atalho "consulta de avaliação": o valor vem da configuração da clínica. É também o ponto de entrada para o futuro
   * gatilho automático ligado à consulta inicial (etapa 5): basta chamar este método com o contexto do evento.
   */
  async criarConsultaAvaliacao(dto: ConsultaAvaliacaoDto, context: CobrancaAuditContext): Promise<Cobranca> {
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);
    const config = await this.configDaClinica(clinicaId);
    const vencimento = dto.vencimento ?? new Date().toISOString().slice(0, 10);
    return this.criar(
      {
        pacienteId: dto.pacienteId,
        tipo: TipoCobranca.CONSULTA_AVALIACAO,
        descricao: DESCRICAO_CONSULTA_AVALIACAO,
        valorCentavos: config.valorConsultaAvaliacaoCentavos,
        formaPagamento: dto.formaPagamento,
        parcelas: dto.parcelas,
        vencimento,
      },
      context,
    );
  }

  // ---------------- leitura ----------------

  async listarPorPaciente(pacienteId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<Cobranca[]> {
    if (!pacienteId) throw new BadRequestException('pacienteId e obrigatorio.');
    const lista = await this.repo.listByPaciente(resolveTenantClinicaId(user, clinicaId), pacienteId);
    return lista.map((c) => this.apresentar(c));
  }

  /**
   * Lista da CLÍNICA (sem pacienteId), com filtro por status efetivo e o NOME do paciente junto. Sempre na clínica do
   * token. Paginada por cursor, no padrão do psi (items/hasMore/nextCursor).
   */
  async listarPorClinica(query: ListCobrancasQueryDto, user: AuthTokenPayload, hoje: Date = new Date()): Promise<PaginaCobrancasComPaciente> {
    const clinicaId = resolveTenantClinicaId(user, query.clinicaId);
    const inicioDeHoje = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
    const pagina = await this.repo.listByClinica({
      clinicaId,
      status: query.status,
      hoje: inicioDeHoje,
      cursor: query.cursor,
      limit: query.limit,
    });
    const nomes = await this.pacientesService.resumoPorIds(clinicaId, pagina.items.map((c) => c.pacienteId));
    return {
      items: pagina.items.map((c) => ({ ...this.apresentar(c), pacienteNome: nomes.get(c.pacienteId)?.nome })),
      hasMore: pagina.hasMore,
      nextCursor: pagina.nextCursor,
    };
  }

  async obter(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<Cobranca> {
    const c = await this.repo.findById(resolveTenantClinicaId(user, clinicaId), id);
    if (!c) throw new NotFoundException('Cobranca nao encontrada.');
    return this.apresentar(c);
  }

  /** Resumo do mês: a receber / vencido (pelo vencimento no mês) e recebido (pela data do pagamento no mês). */
  async resumo(query: ResumoQueryDto, user: AuthTokenPayload, hoje: Date = new Date()): Promise<ResumoMensal> {
    const clinicaId = resolveTenantClinicaId(user, query.clinicaId);
    const [ano, mes] = query.mes.split('-').map(Number);
    const de = new Date(Date.UTC(ano, mes - 1, 1));
    const ate = new Date(Date.UTC(ano, mes, 1));
    const dentro = (d?: Date) => !!d && d.getTime() >= de.getTime() && d.getTime() < ate.getTime();

    const resumo: ResumoMensal = {
      mes: query.mes,
      aReceberCentavos: 0,
      recebidoCentavos: 0,
      vencidoCentavos: 0,
      quantidades: { aReceber: 0, recebido: 0, vencido: 0 },
    };
    for (const c of await this.repo.listParaResumo(clinicaId, de, ate)) {
      const efetivo = statusEfetivo(c, hoje);
      if (efetivo === StatusCobranca.PAGA && dentro(c.pagaEm)) {
        resumo.recebidoCentavos += c.valorCentavos;
        resumo.quantidades.recebido += 1;
      } else if (dentro(c.vencimento) && efetivo === StatusCobranca.VENCIDA) {
        resumo.vencidoCentavos += c.valorCentavos;
        resumo.quantidades.vencido += 1;
      } else if (dentro(c.vencimento) && (efetivo === StatusCobranca.PENDENTE || efetivo === StatusCobranca.ENVIADA)) {
        resumo.aReceberCentavos += c.valorCentavos;
        resumo.quantidades.aReceber += 1;
      }
    }
    return resumo;
  }

  // ---------------- alterações ----------------

  async atualizar(id: string, dto: UpdateCobrancaDto, context: CobrancaAuditContext): Promise<Cobranca> {
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);
    const atual = await this.repo.findById(clinicaId, id);
    if (!atual) throw new NotFoundException('Cobranca nao encontrada.');

    const { clinicaId: _ignorado, vencimento, valorCentavos, itens, ...resto } = dto;
    const patch: Partial<Cobranca> = { ...resto };
    if (vencimento !== undefined) patch.vencimento = new Date(vencimento);
    if (valorCentavos !== undefined || itens !== undefined) {
      const efetivosItens = itens ?? atual.itens;
      // Mexeu só nos itens: o valor acompanha a soma. Mexeu só no valor, com itens gravados: tem que bater com eles.
      const valorParaChecar = valorCentavos ?? (itens !== undefined && itens.length > 0 ? undefined : atual.valorCentavos);
      const resolvido = this.resolverValor(valorParaChecar, efetivosItens);
      patch.valorCentavos = resolvido.valorCentavos;
      patch.itens = resolvido.itens;
    }
    if (Object.keys(patch).length === 0) throw new BadRequestException('Informe ao menos um campo para atualizar.');

    const atualizada = await this.repo.update(clinicaId, id, ABERTAS, patch);
    if (!atualizada) throw await this.motivoNaoAlteravel(clinicaId, id);
    await this.audit(AuditEvent.LANCAMENTO_FINANCEIRO_UPDATED, context, {
      clinicaId,
      cobrancaId: id,
      pacienteId: atualizada.pacienteId,
      campos: Object.keys(patch),
    });
    return this.apresentar(atualizada);
  }

  /** Marcar como paga é MANUAL (a clínica recebe por fora): registra quem e quando. */
  async marcarPaga(id: string, dto: PagarCobrancaDto, clinicaId: string | undefined, context: CobrancaAuditContext): Promise<Cobranca> {
    const resolved = resolveTenantClinicaId(context.user, clinicaId);
    const paga = await this.repo.update(resolved, id, ABERTAS, {
      status: StatusCobranca.PAGA,
      pagaEm: new Date(),
      pagoPor: context.user.sub,
      ...(dto.formaPagamento ? { formaPagamento: dto.formaPagamento } : {}),
    });
    if (!paga) throw await this.motivoNaoAlteravel(resolved, id);
    await this.audit(AuditEvent.LANCAMENTO_FINANCEIRO_PAGO, context, {
      clinicaId: resolved,
      cobrancaId: id,
      pacienteId: paga.pacienteId,
    });
    return this.apresentar(paga);
  }

  /** Cancelamento LÓGICO (status + motivo + quem/quando). Cobrança paga não é cancelada; nada é apagado. */
  async cancelar(id: string, dto: CancelarCobrancaDto, clinicaId: string | undefined, context: CobrancaAuditContext): Promise<Cobranca> {
    const resolved = resolveTenantClinicaId(context.user, clinicaId);
    const cancelada = await this.repo.update(resolved, id, ABERTAS, {
      status: StatusCobranca.CANCELADA,
      canceladaEm: new Date(),
      canceladoPor: context.user.sub,
      motivoCancelamento: dto.motivo.trim(),
    });
    if (!cancelada) throw await this.motivoNaoAlteravel(resolved, id);
    // O motivo é texto livre (pode ter dado pessoal): fica no registro, não no log de auditoria.
    await this.audit(AuditEvent.LANCAMENTO_FINANCEIRO_CANCELADO, context, {
      clinicaId: resolved,
      cobrancaId: id,
      pacienteId: cancelada.pacienteId,
    });
    return this.apresentar(cancelada);
  }

  // ---------------- avisos ----------------

  /**
   * Envia o aviso de cobrança (e-mail) e/ou o lembrete (WhatsApp) pelo NotificacoesService (respeita opt-out, janela de
   * envio e fila). Basta UM canal aceito para a cobrança ir a `enviada`; canais que falham voltam no resultado.
   * O texto vem do template (TODO(conteudo) em notificacao-template.service.ts).
   */
  async enviarAviso(id: string, dto: EnviarAvisoDto, clinicaId: string | undefined, context: CobrancaAuditContext): Promise<ResultadoAviso> {
    const resolved = resolveTenantClinicaId(context.user, clinicaId);
    const cobranca = await this.repo.findById(resolved, id);
    if (!cobranca) throw new NotFoundException('Cobranca nao encontrada.');
    if (!ABERTAS.includes(cobranca.status)) throw await this.motivoNaoAlteravel(resolved, id);

    const contato = (await this.pacientesService.resumoPorIds(resolved, [cobranca.pacienteId])).get(cobranca.pacienteId);
    if (!contato) throw new NotFoundException('Paciente nao encontrado.');

    const resultados: ResultadoAviso['canais'] = [];
    for (const canal of dto.canais) {
      try {
        const destino = canal === CanalAviso.EMAIL ? { email: contato.email } : { telefone: contato.telefone };
        if (!Object.values(destino)[0]) {
          throw new BadRequestException(canal === CanalAviso.EMAIL ? 'Paciente sem e-mail cadastrado.' : 'Paciente sem telefone cadastrado.');
        }
        await this.notificacoes.create(
          {
            clinicaId: resolved,
            destinatarioId: cobranca.pacienteId,
            tipo: TipoNotificacao.AVISO_COBRANCA,
            canal: canal === CanalAviso.EMAIL ? CanalNotificacao.EMAIL : CanalNotificacao.WHATSAPP,
            ...destino,
            nome: contato.nomeDestinatario,
            nomePaciente: contato.nome,
            paraResponsavel: contato.ehResponsavel,
            valor: formatarReais(cobranca.valorCentavos),
            vencimento: formatarData(cobranca.vencimento),
          },
          { ip: context.ip, userAgent: context.userAgent, user: context.user },
        );
        resultados.push({ canal, ok: true });
      } catch (erro) {
        resultados.push({ canal, ok: false, erro: (erro as Error).message });
      }
    }

    if (!resultados.some((r) => r.ok)) {
      throw new BadRequestException(`Nenhum aviso foi enviado: ${resultados.map((r) => `${r.canal}: ${r.erro}`).join('; ')}`);
    }

    const enviada = (await this.repo.update(resolved, id, ABERTAS, { status: StatusCobranca.ENVIADA, enviadaEm: new Date() })) ?? cobranca;
    await this.audit(AuditEvent.LANCAMENTO_FINANCEIRO_ENVIADO, context, {
      clinicaId: resolved,
      cobrancaId: id,
      pacienteId: cobranca.pacienteId,
      canais: resultados.filter((r) => r.ok).map((r) => r.canal),
    });
    return { cobranca: this.apresentar(enviada), canais: resultados };
  }

  // ---------------- internos ----------------

  /** `status` devolvido ao cliente é o EFETIVO (com `vencida` derivada). */
  private apresentar(c: Cobranca): Cobranca {
    return { ...c, status: statusEfetivo(c) };
  }

  private resolverValor(
    valorCentavos: number | undefined,
    itensDto: Array<{ descricao: string; valorCentavos: number }> | undefined,
  ): { valorCentavos: number; itens: ItemCobranca[] } {
    const itens = (itensDto ?? []).map((i) => ({ descricao: i.descricao, valorCentavos: i.valorCentavos }));
    if (itens.length > 0) {
      const soma = somaItens(itens);
      if (valorCentavos !== undefined && valorCentavos !== soma) {
        throw new BadRequestException('O valor informado nao confere com a soma dos itens.');
      }
      return { valorCentavos: soma, itens };
    }
    if (valorCentavos === undefined) throw new BadRequestException('Informe o valor (ou os itens da cobranca).');
    return { valorCentavos, itens };
  }

  /** O paciente precisa ser da clínica do token (nunca confiar no id do payload). */
  private async assertPacienteDaClinica(clinicaId: string, pacienteId: string): Promise<void> {
    const resumo = await this.pacientesService.resumoPorIds(clinicaId, [pacienteId]);
    if (!resumo.has(pacienteId)) throw new NotFoundException('Paciente nao encontrado.');
  }

  /** Update condicional falhou: a cobrança não existe (404) ou não está mais em aberto (409). */
  private async motivoNaoAlteravel(clinicaId: string, id: string): Promise<Error> {
    const existente = await this.repo.findById(clinicaId, id);
    if (!existente) return new NotFoundException('Cobranca nao encontrada.');
    return new ConflictException(`Cobranca ${existente.status}: so cobrancas pendentes ou enviadas podem ser alteradas.`);
  }

  private async audit(event: AuditEvent, context: CobrancaAuditContext, metadata: Record<string, unknown>): Promise<void> {
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

export function formatarReais(centavos: number): string {
  return `R$ ${(centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatarData(d: Date): string {
  const [ano, mes, dia] = d.toISOString().slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}
