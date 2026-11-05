import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { AvaliacaoIUService } from '../../avaliacao-iu/application/avaliacao-iu.service';
import { NotificacoesService } from '../../notificacoes/application/notificacoes.service';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { FOLLOWUP_REPOSITORY } from '../followup.constants';
import { FollowUp, StatusElegibilidade } from '../domain/followup.entity';
import { FollowUpRepository } from './ports/followup.repository';
import { CreateFollowUpDto } from './dto/create-followup.dto';

export interface ResumoFollowUp {
  emAvaliacao: number;
  elegivel: number;
  naoElegivel: number;
}

export interface FollowUpAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

@Injectable()
export class FollowUpService {
  constructor(
    @Inject(FOLLOWUP_REPOSITORY) private readonly repo: FollowUpRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly notificacoes: NotificacoesService,
    private readonly pacientesService: PacientesService,
    private readonly avaliacaoIU: AvaliacaoIUService,
  ) {}

  /**
   * Registra o follow-up e religa o fluxo clínico:
   *  - ELEGIVEL      -> avisa a equipe (notificação de elegibilidade, só paciente do fluxo) e tenta APTO_AGUARDANDO_CONTATO;
   *  - NAO_ELEGIVEL  -> tenta NAO_ELEGIVEL;
   *  - EM_AVALIACAO  -> não mexe na etapa.
   * O avanço é do PacientesService.avancarEtapaFluxo: só para frente, só para paciente ELEGÍVEL ao fluxo (classificado
   * exatamente como IU) e sem nunca lançar — paciente fora do fluxo tem o follow-up registrado e a etapa NÃO muda.
   */
  async create(dto: CreateFollowUpDto, context: FollowUpAuditContext): Promise<FollowUp> {
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);

    // O paciente precisa ser da clínica do token (nunca confiar no id do payload).
    const resumo = await this.pacientesService.resumoPorIds(clinicaId, [dto.pacienteId]);
    const paciente = resumo.get(dto.pacienteId);
    if (!paciente) throw new NotFoundException('Paciente nao encontrado.');

    // Referência à avaliação: precisa existir, ser desta clínica e deste paciente (nunca um id solto).
    if (dto.avaliacaoIuId && !(await this.avaliacaoIU.pertenceAoPaciente(clinicaId, dto.avaliacaoIuId, dto.pacienteId))) {
      throw new NotFoundException('Avaliacao de IU nao encontrada.');
    }

    const followup = await this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      avaliacaoIuId: dto.avaliacaoIuId,
      enfermeiroId: context.user.sub,
      dataFollowup: new Date(dto.dataFollowup),
      statusElegibilidade: dto.statusElegibilidade,
      observacoes: dto.observacoes,
      proximoFollowup: dto.proximoFollowup ? new Date(dto.proximoFollowup) : undefined,
    });

    // Metadata só com ids e o status (sem as observações clínicas).
    await this.audit(AuditEvent.FOLLOWUP_CREATED, context, {
      clinicaId,
      followupId: followup.id,
      pacienteId: followup.pacienteId,
      statusElegibilidade: followup.statusElegibilidade,
    });

    const aoFluxo = { ip: context.ip, userAgent: context.userAgent, user: context.user };
    if (dto.statusElegibilidade === StatusElegibilidade.ELEGIVEL) {
      // A notificação de elegibilidade é do fluxo clínico de IU: só para paciente DENTRO do fluxo (mesmo critério do
      // avanço de etapa). Fora do fluxo o follow-up fica registrado, sem notificação. Não lança (não crítica).
      // Texto do template: TODO(conteudo) em notificacao-template.service.ts.
      if (await this.pacientesService.estaNoFluxoClinico(clinicaId, dto.pacienteId)) {
        await this.notificacoes.notificarElegibilidade(clinicaId, dto.pacienteId, paciente.nome);
      }
      await this.pacientesService.avancarEtapaFluxo(
        clinicaId, dto.pacienteId, EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO, aoFluxo,
      );
    } else if (dto.statusElegibilidade === StatusElegibilidade.NAO_ELEGIVEL) {
      await this.pacientesService.avancarEtapaFluxo(
        clinicaId, dto.pacienteId, EtapaFluxoClinico.NAO_ELEGIVEL, aoFluxo,
      );
    }

    return followup;
  }

  async resumo(clinicaId: string | undefined, user: AuthTokenPayload): Promise<ResumoFollowUp> {
    const resolved = resolveTenantClinicaId(user, clinicaId);
    const [emAvaliacao, elegivel, naoElegivel] = await Promise.all([
      this.repo.countByStatus(resolved, StatusElegibilidade.EM_AVALIACAO),
      this.repo.countByStatus(resolved, StatusElegibilidade.ELEGIVEL),
      this.repo.countByStatus(resolved, StatusElegibilidade.NAO_ELEGIVEL),
    ]);
    return { emAvaliacao, elegivel, naoElegivel };
  }

  async listByPaciente(pacienteId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<FollowUp[]> {
    if (!pacienteId) throw new BadRequestException('pacienteId e obrigatorio.');
    return this.repo.listByPaciente(resolveTenantClinicaId(user, clinicaId), pacienteId);
  }

  async listByAvaliacao(avaliacaoIuId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<FollowUp[]> {
    return this.repo.listByAvaliacaoIU(resolveTenantClinicaId(user, clinicaId), avaliacaoIuId);
  }

  async findOne(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<FollowUp> {
    const f = await this.repo.findById(resolveTenantClinicaId(user, clinicaId), id);
    if (!f) throw new NotFoundException('Follow-up nao encontrado.');
    return f;
  }

  /** Exclusão lógica (o registro fica com quem excluiu e quando). Não desfaz a etapa do fluxo já avançada. */
  async excluir(id: string, clinicaId: string | undefined, context: FollowUpAuditContext): Promise<FollowUp> {
    const resolved = resolveTenantClinicaId(context.user, clinicaId);
    const excluido = await this.repo.softDelete(resolved, id, context.user.sub);
    if (!excluido) throw new NotFoundException('Follow-up nao encontrado.');
    await this.audit(AuditEvent.FOLLOWUP_DELETED, context, {
      clinicaId: resolved,
      followupId: excluido.id,
      pacienteId: excluido.pacienteId,
    });
    return excluido;
  }

  private async audit(event: AuditEvent, context: FollowUpAuditContext, metadata: Record<string, unknown>): Promise<void> {
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
