import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import {
  EtapaFluxoClinico,
  podeAvancarPara,
  PROXIMA_ETAPA_MANUAL,
  PAPEIS_AVANCO_MANUAL,
} from '../../../../../../packages/shared/src/fluxo-clinico';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { ListPacientesQueryDto } from './dto/list-pacientes-query.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { UpdateObservacoesPacienteDto } from './dto/update-observacoes-paciente.dto';
import { PACIENTE_REPOSITORY } from '../pacientes.constants';
import { Paciente } from '../domain/paciente.entity';
import { PacienteRepository } from './ports/paciente.repository';

export interface RequestAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

@Injectable()
export class PacientesService {
  private readonly logger = new Logger(PacientesService.name);

  constructor(
    @Inject(PACIENTE_REPOSITORY) private readonly pacientes: PacienteRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
  ) {}

  async create(dto: CreatePacienteDto, context: RequestAuditContext): Promise<Paciente> {
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);
    const paciente = await this.pacientes.create({
      clinicaId,
      nome: dto.nome,
      cpf: dto.cpf,
      dataNascimento: new Date(dto.dataNascimento),
      sexo: dto.sexo,
      telefone: dto.telefone,
      email: dto.email,
      endereco: dto.endereco,
      convenio: dto.convenio,
      consentimentoLGPD: {
        aceito: dto.consentimentoLGPD.aceito,
        dataAceite: new Date(dto.consentimentoLGPD.dataAceite),
        versao: dto.consentimentoLGPD.versao,
      },
      programaIU: dto.programaIU ?? false,
    });

    await this.audit(AuditEvent.PATIENT_CREATED, context, {
      clinicaId,
      pacienteId: paciente.id,
    });

    return paciente;
  }

  async list(query: ListPacientesQueryDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);

    if (query.cpf) {
      const paciente = await this.pacientes.findByCpf(clinicaId, query.cpf, query.incluirInativos);
      await this.audit(AuditEvent.PATIENT_SEARCHED, context, {
        clinicaId,
        criterio: 'cpf',
        pacienteId: paciente?.id,
      });

      return {
        items: paciente ? [paciente] : [],
        hasMore: false,
      };
    }

    const result = query.nome
      ? await this.pacientes.searchByName({
          clinicaId,
          nome: query.nome,
          cursor: query.cursor,
          limit: query.limit,
          incluirInativos: query.incluirInativos,
          programaIU: query.programaIU,
          etapaFluxo: query.etapaFluxo,
        })
      : await this.pacientes.list({
          clinicaId,
          cursor: query.cursor,
          limit: query.limit,
          incluirInativos: query.incluirInativos,
          programaIU: query.programaIU,
          etapaFluxo: query.etapaFluxo,
        });

    await this.audit(query.nome ? AuditEvent.PATIENT_SEARCHED : AuditEvent.PATIENT_LISTED, context, {
      clinicaId,
      criterio: query.nome ? 'nome' : 'lista',
      quantidade: result.items.length,
    });

    return result;
  }

  async findOne(pacienteId: string, clinicaId: string | undefined, context: RequestAuditContext): Promise<Paciente> {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const paciente = await this.pacientes.findById(resolvedClinicaId, pacienteId);

    if (!paciente) {
      throw new NotFoundException('Paciente nao encontrado.');
    }

    await this.audit(AuditEvent.PATIENT_VIEWED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId,
    });

    return paciente;
  }

  async update(
    pacienteId: string,
    dto: UpdatePacienteDto,
    clinicaId: string | undefined,
    context: RequestAuditContext,
  ): Promise<Paciente> {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const paciente = await this.pacientes.update(resolvedClinicaId, pacienteId, {
      ...dto,
      dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
    });

    if (!paciente) {
      throw new NotFoundException('Paciente nao encontrado.');
    }

    await this.audit(AuditEvent.PATIENT_UPDATED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId,
      campos: Object.keys(dto),
    });

    return paciente;
  }

  async updateObservacoes(
    pacienteId: string,
    dto: UpdateObservacoesPacienteDto,
    clinicaId: string | undefined,
    context: RequestAuditContext,
  ): Promise<Paciente> {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const paciente = await this.pacientes.update(resolvedClinicaId, pacienteId, { observacoes: dto.observacoes });

    if (!paciente) {
      throw new NotFoundException('Paciente nao encontrado.');
    }

    await this.audit(AuditEvent.PATIENT_UPDATED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId,
      campos: ['observacoes'],
    });

    return paciente;
  }

  async deactivate(pacienteId: string, clinicaId: string | undefined, context: RequestAuditContext): Promise<Paciente> {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const paciente = await this.pacientes.deactivate(resolvedClinicaId, pacienteId);

    if (!paciente) {
      throw new NotFoundException('Paciente nao encontrado.');
    }

    await this.audit(AuditEvent.PATIENT_DEACTIVATED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId,
    });

    return paciente;
  }

  async exportLgpd(pacienteId: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const paciente = await this.pacientes.findById(resolvedClinicaId, pacienteId);

    if (!paciente) {
      throw new NotFoundException('Paciente nao encontrado.');
    }

    await this.audit(AuditEvent.PATIENT_EXPORTED, context, {
      clinicaId: paciente.clinicaId,
      pacienteId,
      formato: 'json',
    });

    return {
      exportadoEm: new Date().toISOString(),
      formato: 'application/json',
      dados: paciente,
    };
  }

  /**
   * Único ponto de mutação de etapaFluxo no sistema. Chamado pelos services de
   * avaliacao-iu, followup, agendamentos, checklist-documentos, laudo-medico,
   * processo-juridico e entregas quando um evento de negócio faz o paciente
   * avançar no pipeline clínico. Nunca lança exceção: uma falha nessa
   * transição secundária não pode derrubar a operação clínica primária que a
   * disparou (criar avaliação, follow-up, laudo, etc.).
   */
  async avancarEtapaFluxo(
    clinicaId: string,
    pacienteId: string,
    novaEtapa: EtapaFluxoClinico,
    context: RequestAuditContext,
  ): Promise<void> {
    try {
      const atual = await this.pacientes.findById(clinicaId, pacienteId);
      if (!atual) {
        this.logger.warn(`avancarEtapaFluxo: paciente ${pacienteId} nao encontrado (clinica ${clinicaId}).`);
        return;
      }
      if (!podeAvancarPara(atual.etapaFluxo, novaEtapa)) {
        return;
      }

      await this.pacientes.update(clinicaId, pacienteId, {
        etapaFluxo: novaEtapa,
        etapaFluxoDesde: new Date(),
      });

      await this.audit(AuditEvent.PIPELINE_STAGE_CHANGED, context, {
        clinicaId,
        pacienteId,
        etapaAnterior: atual.etapaFluxo,
        etapaNova: novaEtapa,
      });
    } catch (err) {
      this.logger.error(
        `avancarEtapaFluxo falhou para paciente ${pacienteId} -> ${novaEtapa}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Avanço MANUAL, acionado pelo botão "Avançar etapa" na tela do paciente —
   * ao contrário de avancarEtapaFluxo (chamado internamente pelos hooks de
   * outros módulos), este É a ação primária do request e por isso lança
   * exceção normalmente em vez de engolir o erro. Só permite mover para a
   * ÚNICA próxima etapa definida em PROXIMA_ETAPA_MANUAL (nunca pula etapas),
   * e só para quem tem o papel autorizado a fechar aquela etapa específica
   * (ADMIN sempre pode, como qualquer ação administrativa do sistema).
   */
  async avancarEtapaManual(
    pacienteId: string,
    clinicaId: string | undefined,
    context: RequestAuditContext,
  ): Promise<Paciente> {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const paciente = await this.pacientes.findById(resolvedClinicaId, pacienteId);
    if (!paciente) throw new NotFoundException('Paciente nao encontrado.');

    const proximaEtapa = PROXIMA_ETAPA_MANUAL[paciente.etapaFluxo];
    if (!proximaEtapa) {
      throw new BadRequestException('Esta etapa nao pode ser avancada manualmente.');
    }

    const papeisPermitidos = PAPEIS_AVANCO_MANUAL[paciente.etapaFluxo] ?? [];
    if (context.user.papel !== Papel.ADMIN && !papeisPermitidos.includes(context.user.papel)) {
      throw new ForbiddenException('Seu papel nao pode avancar esta etapa.');
    }

    await this.pacientes.update(resolvedClinicaId, pacienteId, {
      etapaFluxo: proximaEtapa,
      etapaFluxoDesde: new Date(),
    });

    await this.audit(AuditEvent.PIPELINE_STAGE_CHANGED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId,
      etapaAnterior: paciente.etapaFluxo,
      etapaNova: proximaEtapa,
      manual: true,
    });

    const atualizado = await this.pacientes.findById(resolvedClinicaId, pacienteId);
    if (!atualizado) throw new NotFoundException('Paciente nao encontrado.');
    return atualizado;
  }

  private resolveClinicaId(user: AuthTokenPayload, requestedClinicaId?: string): string {
    return resolveTenantClinicaId(user, requestedClinicaId);
  }

  private async audit(
    event: AuditEvent,
    context: RequestAuditContext,
    metadata: Record<string, unknown>,
  ): Promise<void> {
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
