import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { DOCUMENTOS_PADRAO } from '../../../../../../packages/shared/src/checklist-documentos';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { CHECKLIST_DOCUMENTO_REPOSITORY } from '../checklist-documentos.constants';
import { ChecklistDocumentoItem, StatusChecklistDocumento } from '../domain/checklist-documento.entity';
import { ChecklistDocumentoRepository } from './ports/checklist-documento.repository';
import { CreateChecklistDocumentoDto } from './dto/create-checklist-documento.dto';
import { UpdateChecklistDocumentoDto } from './dto/update-checklist-documento.dto';
import { CriarChecklistPadraoDto } from './dto/criar-checklist-padrao.dto';

export interface ChecklistAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

@Injectable()
export class ChecklistDocumentosService {
  constructor(
    @Inject(CHECKLIST_DOCUMENTO_REPOSITORY) private readonly repo: ChecklistDocumentoRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly pacientesService: PacientesService,
  ) {}

  async create(dto: CreateChecklistDocumentoDto, context: ChecklistAuditContext): Promise<ChecklistDocumentoItem> {
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);
    await this.assertPacienteDaClinica(clinicaId, dto.pacienteId);

    const item = await this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      nome: dto.nome,
      status: StatusChecklistDocumento.PENDENTE,
      observacao: dto.observacao,
      criadoPor: context.user.sub,
    });
    // Metadata só com ids (o nome do documento e a observação podem conter dado pessoal).
    await this.audit(AuditEvent.CHECKLIST_ITEM_CREATED, context, { clinicaId, itemId: item.id, pacienteId: item.pacienteId });
    return item;
  }

  async listByPaciente(
    pacienteId: string,
    clinicaId: string | undefined,
    user: AuthTokenPayload,
  ): Promise<ChecklistDocumentoItem[]> {
    if (!pacienteId) throw new BadRequestException('pacienteId e obrigatorio.');
    return this.repo.listByPaciente(resolveTenantClinicaId(user, clinicaId), pacienteId);
  }

  /**
   * Atualiza o item. Quando ele vira RECEBIDO e TODOS os itens do paciente ficam RECEBIDO, tenta levar o paciente
   * para AGUARDANDO_CONSULTA_MEDICA. O avanço é do PacientesService.avancarEtapaFluxo: só para frente, só para
   * paciente ELEGÍVEL ao fluxo (classificado exatamente como IU) e sem nunca lançar — paciente fora do fluxo tem o
   * item atualizado normalmente e a etapa NÃO muda.
   */
  async update(
    id: string,
    dto: UpdateChecklistDocumentoDto,
    context: ChecklistAuditContext,
  ): Promise<ChecklistDocumentoItem> {
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);
    const { clinicaId: _ignorado, ...campos } = dto;
    const updated = await this.repo.update(clinicaId, id, campos);
    if (!updated) throw new NotFoundException('Item do checklist nao encontrado.');

    const recebido = dto.status === StatusChecklistDocumento.RECEBIDO;
    await this.audit(recebido ? AuditEvent.CHECKLIST_ITEM_RECEBIDO : AuditEvent.CHECKLIST_ITEM_UPDATED, context, {
      clinicaId,
      itemId: updated.id,
      pacienteId: updated.pacienteId,
      status: updated.status,
    });

    if (recebido) {
      const itens = await this.repo.listByPaciente(clinicaId, updated.pacienteId);
      const completo = itens.length > 0 && itens.every((i) => i.status === StatusChecklistDocumento.RECEBIDO);
      if (completo) {
        await this.pacientesService.avancarEtapaFluxo(
          clinicaId,
          updated.pacienteId,
          EtapaFluxoClinico.AGUARDANDO_CONSULTA_MEDICA,
          { ip: context.ip, userAgent: context.userAgent, user: context.user },
        );
      }
    }

    return updated;
  }

  /** Exclusão lógica: o item some das listagens e da conta de "todos recebidos"; fica registrado quem excluiu. */
  async delete(id: string, clinicaId: string | undefined, context: ChecklistAuditContext): Promise<{ ok: true }> {
    const resolved = resolveTenantClinicaId(context.user, clinicaId);
    const excluido = await this.repo.softDelete(resolved, id, context.user.sub);
    if (!excluido) throw new NotFoundException('Item do checklist nao encontrado.');
    await this.audit(AuditEvent.CHECKLIST_ITEM_DELETED, context, {
      clinicaId: resolved,
      itemId: excluido.id,
      pacienteId: excluido.pacienteId,
    });
    return { ok: true };
  }

  /** Cria de uma vez os itens da lista padrão que o paciente ainda não tem (por nome). */
  async criarPadrao(dto: CriarChecklistPadraoDto, context: ChecklistAuditContext): Promise<ChecklistDocumentoItem[]> {
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);
    await this.assertPacienteDaClinica(clinicaId, dto.pacienteId);

    const existentes = await this.repo.listByPaciente(clinicaId, dto.pacienteId);
    const nomesExistentes = new Set(existentes.map((i) => i.nome.trim().toLowerCase()));
    const faltantes = DOCUMENTOS_PADRAO.filter((nome) => !nomesExistentes.has(nome.trim().toLowerCase()));

    const criados = await Promise.all(
      faltantes.map((nome) =>
        this.repo.create({
          clinicaId,
          pacienteId: dto.pacienteId,
          nome,
          status: StatusChecklistDocumento.PENDENTE,
          criadoPor: context.user.sub,
        }),
      ),
    );
    await this.audit(AuditEvent.CHECKLIST_PADRAO_CREATED, context, {
      clinicaId,
      pacienteId: dto.pacienteId,
      itensCriados: criados.length,
    });
    return [...criados, ...existentes];
  }

  resumoPendentes(clinicaId: string | undefined, user: AuthTokenPayload): Promise<{ pendentes: number }> {
    return this.repo
      .countPendentesPorClinica(resolveTenantClinicaId(user, clinicaId))
      .then((pendentes) => ({ pendentes }));
  }

  /** O paciente precisa ser da clínica do token (nunca confiar no id do payload). */
  private async assertPacienteDaClinica(clinicaId: string, pacienteId: string): Promise<void> {
    const resumo = await this.pacientesService.resumoPorIds(clinicaId, [pacienteId]);
    if (!resumo.has(pacienteId)) throw new NotFoundException('Paciente nao encontrado.');
  }

  private async audit(event: AuditEvent, context: ChecklistAuditContext, metadata: Record<string, unknown>): Promise<void> {
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
