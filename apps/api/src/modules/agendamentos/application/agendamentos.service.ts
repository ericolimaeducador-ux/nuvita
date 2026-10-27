import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY, USER_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { UserRepository } from '../../auth/application/ports/user.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CreateNotificacaoDto } from '../../notificacoes/application/dto/create-notificacao.dto';
import { NotificacoesService } from '../../notificacoes/application/notificacoes.service';
import { CanalNotificacao, TipoNotificacao } from '../../notificacoes/domain/notificacao.entity';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { AGENDAMENTO_REPOSITORY } from '../agendamentos.constants';
import { Agendamento, ModalidadeAtendimento, StatusAgendamento } from '../domain/agendamento.entity';
import { assertAtendimentoComecou } from '../domain/atendimento-horario';
import { CancelAgendamentoDto } from './dto/cancel-agendamento.dto';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';
import { CreateBloqueioDto } from './dto/create-bloqueio.dto';
import { ListAgendamentosQueryDto } from './dto/list-agendamentos-query.dto';
import { ListBloqueiosQueryDto } from './dto/list-bloqueios-query.dto';
import { UpdateAgendamentoDto } from './dto/update-agendamento.dto';
import { AgendamentoRepository } from './ports/agendamento.repository';

export interface RequestAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

@Injectable()
export class AgendamentosService {
  private readonly logger = new Logger(AgendamentosService.name);

  constructor(
    @Inject(AGENDAMENTO_REPOSITORY) private readonly agendamentos: AgendamentoRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly pacientesService: PacientesService,
    private readonly notificacoesService: NotificacoesService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async create(dto: CreateAgendamentoDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);

    const agendamento = await this.agendamentos.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      medicoId: dto.medicoId,
      modalidade: dto.modalidade ?? ModalidadeAtendimento.PSICOLOGIA,
      dataHoraInicio: new Date(dto.dataHoraInicio),
      dataHoraFim: new Date(dto.dataHoraFim),
      tipo: dto.tipo,
      observacoes: dto.observacoes,
      criadoPor: context.user.sub,
    });

    await this.audit(AuditEvent.APPOINTMENT_CREATED, context, { clinicaId, agendamentoId: agendamento.id });

    await this.notificarConfirmacaoAgendamento(agendamento, clinicaId, context);

    return agendamento;
  }

  async list(query: ListAgendamentosQueryDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);

    const agendamentos = await this.agendamentos.list({
      clinicaId,
      medicoId: this.resolveMedicoIdFiltro(context.user, query.medicoId),
      pacienteId: query.pacienteId,
      modalidade: query.modalidade,
      dataInicio: query.dataInicio ? new Date(query.dataInicio) : undefined,
      dataFim: query.dataFim ? new Date(query.dataFim) : undefined,
      status: query.status,
    });

    await this.audit(AuditEvent.APPOINTMENT_LISTED, context, { clinicaId, quantidade: agendamentos.length });
    return this.comDadosDoPaciente(clinicaId, agendamentos);
  }

  async findOne(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const agendamento = await this.agendamentos.findById(resolvedClinicaId, id);

    if (!agendamento) throw new NotFoundException('Agendamento nao encontrado.');
    this.assertPosse(agendamento, context.user);

    await this.audit(AuditEvent.APPOINTMENT_VIEWED, context, { clinicaId: resolvedClinicaId, agendamentoId: id });
    const [enriquecido] = await this.comDadosDoPaciente(resolvedClinicaId, [agendamento]);
    return enriquecido;
  }

  async update(id: string, dto: UpdateAgendamentoDto, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    await this.assertPosseSePsicologo(resolvedClinicaId, id, context.user);
    if (context.user.papel === Papel.PSICOLOGO && dto.medicoId && dto.medicoId !== context.user.sub) {
      throw new ForbiddenException('Psicologo nao pode passar o agendamento para outro profissional.');
    }

    const anterior = await this.agendamentos.findById(resolvedClinicaId, id);

    const agendamento = await this.agendamentos.update(resolvedClinicaId, id, {
      medicoId: dto.medicoId,
      modalidade: dto.modalidade,
      dataHoraInicio: dto.dataHoraInicio ? new Date(dto.dataHoraInicio) : undefined,
      dataHoraFim: dto.dataHoraFim ? new Date(dto.dataHoraFim) : undefined,
      tipo: dto.tipo,
      observacoes: dto.observacoes,
    });

    if (!agendamento) throw new NotFoundException('Agendamento nao encontrado.');

    await this.audit(AuditEvent.APPOINTMENT_UPDATED, context, { clinicaId: resolvedClinicaId, agendamentoId: id });

    // Editar o horário contornaria a regra "atendimento no futuro": a troca fica na trilha (quem/quando = o próprio log).
    if (anterior && (dto.dataHoraInicio || dto.dataHoraFim)) {
      const inicioNovo = dto.dataHoraInicio ? new Date(dto.dataHoraInicio) : anterior.dataHoraInicio;
      const fimNovo = dto.dataHoraFim ? new Date(dto.dataHoraFim) : anterior.dataHoraFim;
      if (inicioNovo.getTime() !== anterior.dataHoraInicio.getTime() || fimNovo.getTime() !== anterior.dataHoraFim.getTime()) {
        await this.audit(AuditEvent.APPOINTMENT_TIME_CHANGED, context, {
          clinicaId: resolvedClinicaId,
          agendamentoId: id,
          inicioAnterior: anterior.dataHoraInicio.toISOString(),
          inicioNovo: inicioNovo.toISOString(),
          fimAnterior: anterior.dataHoraFim.toISOString(),
          fimNovo: fimNovo.toISOString(),
        });
      }
    }
    return agendamento;
  }

  async cancel(id: string, dto: CancelAgendamentoDto, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    await this.assertPosseSePsicologo(resolvedClinicaId, id, context.user);

    const agendamento = await this.agendamentos.updateStatus(
      resolvedClinicaId,
      id,
      StatusAgendamento.CANCELADO,
      dto.motivoCancelamento,
    );

    if (!agendamento) throw new NotFoundException('Agendamento nao encontrado.');

    await this.audit(AuditEvent.APPOINTMENT_CANCELLED, context, {
      clinicaId: resolvedClinicaId,
      agendamentoId: id,
      motivo: dto.motivoCancelamento,
    });

    return agendamento;
  }

  async conclude(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    await this.assertPosseSePsicologo(resolvedClinicaId, id, context.user);

    const atual = await this.agendamentos.findById(resolvedClinicaId, id);
    if (!atual) throw new NotFoundException('Agendamento nao encontrado.');
    assertAtendimentoComecou(atual.dataHoraInicio);

    const agendamento = await this.agendamentos.updateStatus(
      resolvedClinicaId,
      id,
      StatusAgendamento.CONCLUIDO,
    );

    if (!agendamento) throw new NotFoundException('Agendamento nao encontrado.');

    await this.audit(AuditEvent.APPOINTMENT_CONCLUDED, context, { clinicaId: resolvedClinicaId, agendamentoId: id });

    return agendamento;
  }

  async createBloqueio(dto: CreateBloqueioDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);

    const bloqueio = await this.agendamentos.createBloqueio({
      clinicaId,
      medicoId: dto.medicoId,
      dataHoraInicio: new Date(dto.dataHoraInicio),
      dataHoraFim: new Date(dto.dataHoraFim),
      motivo: dto.motivo,
      criadoPor: context.user.sub,
    });

    await this.audit(AuditEvent.SCHEDULE_BLOCKED, context, { clinicaId, bloqueioId: bloqueio.id });
    return bloqueio;
  }

  async listBloqueios(query: ListBloqueiosQueryDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);

    return this.agendamentos.listBloqueios(
      clinicaId,
      this.resolveMedicoIdFiltro(context.user, query.medicoId),
      query.dataInicio ? new Date(query.dataInicio) : undefined,
      query.dataFim ? new Date(query.dataFim) : undefined,
    );
  }

  async deleteBloqueio(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const deleted = await this.agendamentos.deleteBloqueio(resolvedClinicaId, id);

    if (!deleted) throw new NotFoundException('Bloqueio nao encontrado.');

    await this.audit(AuditEvent.SCHEDULE_UNBLOCKED, context, { clinicaId: resolvedClinicaId, bloqueioId: id });
    return { ok: true };
  }

  /**
   * Leitura SILENCIOSA (sem auditar "visualizou") para o servidor montar documentos: 404 se não é da
   * clínica; 403 se o psicólogo não é o profissional do atendimento.
   */
  async obterParaEmissao(clinicaId: string, id: string, user: AuthTokenPayload): Promise<Agendamento> {
    const agendamento = await this.agendamentos.findById(clinicaId, id);
    if (!agendamento) throw new NotFoundException('Agendamento nao encontrado.');
    this.assertPosse(agendamento, user);
    return agendamento;
  }

  /**
   * Os ids do payload de criação precisam pertencer à clínica do token (D4). Para o psicólogo, o
   * agendamento referenciado também precisa ser dele. Chamado pelos controllers antes de criar.
   */
  async validarReferencias(
    refs: { pacienteId?: string; medicoId?: string; agendamentoId?: string },
    clinicaId: string | undefined,
    context: RequestAuditContext,
  ): Promise<void> {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);

    if (refs.pacienteId) {
      const resumo = await this.pacientesService.resumoPorIds(resolvedClinicaId, [refs.pacienteId]);
      if (!resumo.has(refs.pacienteId)) throw new NotFoundException('Paciente nao encontrado.');
    }
    if (refs.medicoId) {
      const medico = await this.users.findById(refs.medicoId);
      if (!medico || medico.clinicaId !== resolvedClinicaId) throw new NotFoundException('Profissional nao encontrado.');
    }
    if (refs.agendamentoId) {
      await this.assertPossePorId(resolvedClinicaId, refs.agendamentoId, context.user);
    }
  }

  /** Psicólogo só opera o que é dele; admin e secretária seguem com a clínica inteira. */
  private assertPosse(agendamento: Agendamento, user: AuthTokenPayload): void {
    if (user.papel === Papel.PSICOLOGO && agendamento.medicoId !== user.sub) {
      throw new ForbiddenException('Este agendamento pertence a outro profissional.');
    }
  }

  /** Só o psicólogo precisa da leitura extra; os demais papéis seguem direto para a atualização atômica. */
  private async assertPosseSePsicologo(clinicaId: string, id: string, user: AuthTokenPayload): Promise<void> {
    if (user.papel === Papel.PSICOLOGO) await this.assertPossePorId(clinicaId, id, user);
  }

  private async assertPossePorId(clinicaId: string, id: string, user: AuthTokenPayload): Promise<void> {
    const agendamento = await this.agendamentos.findById(clinicaId, id);
    if (!agendamento) throw new NotFoundException('Agendamento nao encontrado.');
    this.assertPosse(agendamento, user);
  }

  private resolveClinicaId(user: AuthTokenPayload, requestedClinicaId?: string): string {
    return resolveTenantClinicaId(user, requestedClinicaId);
  }

  /**
   * O psicólogo enxerga só a própria agenda (pacientes do Projeto PSI já são
   * isolados por profissional individualmente) — ignora qualquer `medicoId`
   * pedido na query e força o próprio id. Demais papéis mantêm a agenda
   * compartilhada da clínica (fluxo clínico passa por vários profissionais).
   */
  private resolveMedicoIdFiltro(user: AuthTokenPayload, medicoIdSolicitado?: string): string | undefined {
    if (user.papel === Papel.PSICOLOGO) return user.sub;
    return medicoIdSolicitado;
  }

  /** Anexa nome e CPF do paciente a cada agendamento p/ identificação segura na
   * agenda — resolve em lote (evita N consultas) e tolera paciente inativado. */
  private async comDadosDoPaciente<T extends { pacienteId: string }>(
    clinicaId: string,
    agendamentos: T[],
  ): Promise<Array<T & { pacienteNome?: string; pacienteCpf?: string }>> {
    if (agendamentos.length === 0) return [];
    const resumo = await this.pacientesService.resumoPorIds(
      clinicaId,
      agendamentos.map((a) => a.pacienteId),
    );
    return agendamentos.map((a) => ({
      ...a,
      pacienteNome: resumo.get(a.pacienteId)?.nome,
      pacienteCpf: resumo.get(a.pacienteId)?.cpf,
    }));
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

  /**
   * Dispara a notificação de confirmação de agendamento (CONFIRMACAO_AGENDAMENTO)
   * via NotificacoesService.create() — o método público, que faz o check de
   * opt-out, renderiza o template e ENFILEIRA no BullMQ (o worker processa o
   * envio de fato depois). Não usa notificarElegibilidade(): aquele método
   * grava direto no repositório e nunca enfileira, então nunca chega a enviar.
   *
   * Efeito colateral, não crítico: se o paciente não tem e-mail cadastrado ou
   * se NotificacoesService.create() falhar por qualquer motivo, o agendamento
   * já foi criado e não deve ser desfeito — mas a falha é logada (fail-closed
   * com visibilidade, mesmo padrão de feature-ai-usage-audit-trail), nunca
   * engolida em silêncio total.
   */
  private async notificarConfirmacaoAgendamento(
    agendamento: Agendamento,
    clinicaId: string,
    context: RequestAuditContext,
  ): Promise<void> {
    const paciente = (await this.pacientesService.resumoPorIds(clinicaId, [agendamento.pacienteId])).get(
      agendamento.pacienteId,
    );
    if (!paciente?.email) {
      return;
    }

    const nomeMedico = await this.resolverNomeMedico(agendamento.medicoId, clinicaId);

    try {
      await this.notificacoesService.create(
        {
          clinicaId,
          destinatarioId: agendamento.pacienteId,
          tipo: TipoNotificacao.CONFIRMACAO_AGENDAMENTO,
          canal: CanalNotificacao.EMAIL,
          email: paciente.email,
          nome: paciente.nomeDestinatario,
          nomePaciente: paciente.nome,
          paraResponsavel: paciente.ehResponsavel,
          medico: nomeMedico,
          hora: this.formatarDataHora(agendamento.dataHoraInicio),
        } as CreateNotificacaoDto,
        context,
      );
    } catch (error) {
      this.logFalhaNotificacao(TipoNotificacao.CONFIRMACAO_AGENDAMENTO, clinicaId, agendamento.id, error);
    }
  }

  /**
   * Nome do profissional pro template de confirmação — `medicoId` não é
   * necessariamente `context.user`: SECRETARIA/ADMIN podem criar o
   * agendamento em nome de um profissional diferente. Mesmo tratamento de
   * efeito colateral dos outros dados enriquecidos aqui: "não encontrado"
   * (medicoId inválido/removido) é um caminho normal, sem log — só
   * `findById()` lançar é uma falha de verdade, e essa é logada
   * (notification_data_enrichment_failed), distinto de
   * notification_trigger_failed: aqui a notificação ainda é enviada, só sem
   * o nome do médico — lá a notificação inteira não sai.
   */
  private async resolverNomeMedico(medicoId: string, clinicaId: string): Promise<string | undefined> {
    try {
      const medico = await this.users.findById(medicoId);
      // Nome de profissional de outra clínica nunca entra no template desta.
      if (medico?.clinicaId && medico.clinicaId !== clinicaId) return undefined;
      return medico?.nome;
    } catch (error) {
      this.logFalhaEnriquecimento('medico', medicoId, error);
      return undefined;
    }
  }

  private formatarDataHora(data: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(data);
  }

  private logFalhaNotificacao(
    tipo: TipoNotificacao,
    clinicaId: string,
    agendamentoId: string,
    error: unknown,
  ): void {
    this.logger.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'Falha ao acionar notificacao pos-agendamento; agendamento foi criado normalmente.',
        event: 'notification_trigger_failed',
        tipo,
        clinicaId,
        agendamentoId,
        erro: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  /**
   * Falha ao enriquecer um dado (ex.: nome do médico) usado num template de
   * notificação — escopo e severidade diferentes de notification_trigger_failed:
   * aqui a notificação ainda sai, só incompleta; lá ela não sai nenhuma.
   * Nomes de evento distintos de propósito, pra não esconder essa diferença
   * de quem investigar o log depois.
   */
  private logFalhaEnriquecimento(campo: string, medicoId: string, error: unknown): void {
    this.logger.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'Falha ao enriquecer dado de notificacao; notificacao segue sem esse campo.',
        event: 'notification_data_enrichment_failed',
        campo,
        medicoId,
        erro: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
