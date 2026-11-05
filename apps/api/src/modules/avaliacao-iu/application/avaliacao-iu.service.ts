import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { AVALIACAO_IU_REPOSITORY } from '../avaliacao-iu.constants';
import { AvaliacaoIU } from '../domain/avaliacao-iu.entity';
import { AvaliacaoIURepository } from './ports/avaliacao-iu.repository';
import { CreateAvaliacaoIUDto } from './dto/create-avaliacao-iu.dto';
import { UpdateAvaliacaoIUDto } from './dto/update-avaliacao-iu.dto';

export interface AvaliacaoAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

// TODO(conteudo): a ficha de avaliação é de incontinência urinária (ver domain/avaliacao-iu.entity.ts).
@Injectable()
export class AvaliacaoIUService {
  constructor(
    @Inject(AVALIACAO_IU_REPOSITORY) private readonly repo: AvaliacaoIURepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly pacientesService: PacientesService,
  ) {}

  /**
   * Registra a avaliação e religa o fluxo clínico: tenta levar o paciente para AVALIACAO_IU. O avanço é do
   * PacientesService.avancarEtapaFluxo: só para frente, só para paciente ELEGÍVEL ao fluxo (classificado exatamente
   * como IU) e sem nunca lançar — paciente fora do fluxo tem a avaliação registrada e a etapa NÃO muda.
   */
  async create(dto: CreateAvaliacaoIUDto, context: AvaliacaoAuditContext): Promise<AvaliacaoIU> {
    const { user } = context;
    const clinicaId = resolveTenantClinicaId(user, dto.clinicaId);

    // O paciente precisa ser da clínica do token (nunca confiar no id do payload).
    const resumo = await this.pacientesService.resumoPorIds(clinicaId, [dto.pacienteId]);
    if (!resumo.has(dto.pacienteId)) throw new NotFoundException('Paciente nao encontrado.');

    const { clinicaId: _ignorado, ...campos } = dto;
    const avaliacao = await this.repo.create({
      ...campos,
      clinicaId,
      enfermeiroId: user.sub,
      // Nome do profissional para a assinatura da ficha; COREN cai no registro do perfil se não vier preenchido
      // (evita redigitar toda vez).
      enfermeiroNome: user.nome,
      dataAtendimento: new Date(dto.dataAtendimento),
      coren: dto.coren || user.registroProfissional,
    });

    // Metadata só com ids (a ficha tem dado clínico sensível: nada dela vai para o log).
    await this.audit(AuditEvent.AVALIACAO_IU_CREATED, context, {
      clinicaId,
      avaliacaoId: avaliacao.id,
      pacienteId: avaliacao.pacienteId,
    });

    await this.pacientesService.avancarEtapaFluxo(clinicaId, avaliacao.pacienteId, EtapaFluxoClinico.AVALIACAO_IU, {
      ip: context.ip,
      userAgent: context.userAgent,
      user,
    });

    return avaliacao;
  }

  /**
   * Edita uma ficha já preenchida (ex.: completar o COREN esquecido). Não é append-only: corrige o próprio registro.
   * Faz backfill do nome do profissional quando quem edita é o próprio autor da ficha e ela ainda não tem o nome gravado
   * (fichas antigas, anteriores a esse campo).
   */
  async update(
    id: string,
    dto: UpdateAvaliacaoIUDto,
    clinicaId: string | undefined,
    context: AvaliacaoAuditContext,
  ): Promise<AvaliacaoIU> {
    const { user } = context;
    const resolved = resolveTenantClinicaId(user, clinicaId ?? dto.clinicaId);
    const atual = await this.repo.findById(resolved, id);
    if (!atual) throw new NotFoundException('Avaliação de IU não encontrada.');

    const { clinicaId: _ignoraClinica, dataAtendimento, ...resto } = dto;
    const patch: Partial<AvaliacaoIU> = { ...resto };
    if (dataAtendimento !== undefined) patch.dataAtendimento = new Date(dataAtendimento);
    if (!atual.enfermeiroNome && atual.enfermeiroId === user.sub && user.nome) {
      patch.enfermeiroNome = user.nome;
    }

    const atualizado = await this.repo.update(resolved, id, patch);
    if (!atualizado) throw new NotFoundException('Avaliação de IU não encontrada.');

    // Só os NOMES dos campos alterados (nunca os valores).
    await this.audit(AuditEvent.AVALIACAO_IU_UPDATED, context, {
      clinicaId: resolved,
      avaliacaoId: atualizado.id,
      pacienteId: atualizado.pacienteId,
      campos: Object.keys(patch),
    });
    return atualizado;
  }

  async findOne(id: string, clinicaId: string | undefined, context: AvaliacaoAuditContext): Promise<AvaliacaoIU> {
    const resolved = resolveTenantClinicaId(context.user, clinicaId);
    const av = await this.repo.findById(resolved, id);
    if (!av) throw new NotFoundException('Avaliação de IU não encontrada.');
    await this.audit(AuditEvent.AVALIACAO_IU_VIEWED, context, {
      clinicaId: resolved,
      avaliacaoId: av.id,
      pacienteId: av.pacienteId,
    });
    return av;
  }

  /**
   * A avaliação existe, é da clínica do token e é DESTE paciente? Usado por outros módulos (follow-up, entregas) para
   * validar a referência `avaliacaoIuId` em vez de aceitar um id solto.
   */
  async pertenceAoPaciente(clinicaId: string, avaliacaoId: string, pacienteId: string): Promise<boolean> {
    const av = await this.repo.findById(clinicaId, avaliacaoId);
    return !!av && av.pacienteId === pacienteId;
  }

  async listByPaciente(pacienteId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<AvaliacaoIU[]> {
    if (!pacienteId) throw new BadRequestException('pacienteId é obrigatório.');
    return this.repo.listByPaciente(resolveTenantClinicaId(user, clinicaId), pacienteId);
  }

  async listMinha(user: AuthTokenPayload): Promise<AvaliacaoIU[]> {
    if (user.papel !== Papel.ENFERMEIRO) throw new ForbiddenException('Somente enfermeiros.');
    return this.repo.listByEnfermeiro(resolveTenantClinicaId(user, undefined), user.sub);
  }

  async contarTotal(user: AuthTokenPayload): Promise<{ total: number }> {
    return { total: await this.repo.countByClinica(resolveTenantClinicaId(user, undefined)) };
  }

  /** Exclusão lógica (a ficha fica com quem excluiu e quando). Não desfaz a etapa do fluxo já avançada. */
  async excluir(id: string, clinicaId: string | undefined, context: AvaliacaoAuditContext): Promise<AvaliacaoIU> {
    const resolved = resolveTenantClinicaId(context.user, clinicaId);
    const excluida = await this.repo.softDelete(resolved, id, context.user.sub);
    if (!excluida) throw new NotFoundException('Avaliação de IU não encontrada.');
    await this.audit(AuditEvent.AVALIACAO_IU_DELETED, context, {
      clinicaId: resolved,
      avaliacaoId: excluida.id,
      pacienteId: excluida.pacienteId,
    });
    return excluida;
  }

  private async audit(event: AuditEvent, context: AvaliacaoAuditContext, metadata: Record<string, unknown>): Promise<void> {
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
