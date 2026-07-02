import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppConfigService } from '../../../common/security/config.service';
import { createHmac } from 'crypto';
import { AuthTokenPayload, ehProfissional } from '../../../../../../packages/shared/src/auth';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CreateAddendumDto } from './dto/create-addendum.dto';
import { CreateProntuarioDto } from './dto/create-prontuario.dto';
import { ListProntuariosQueryDto } from './dto/list-prontuarios-query.dto';
import { UpdateProntuarioDto } from './dto/update-prontuario.dto';
import { CID10_REPOSITORY, PRONTUARIO_REPOSITORY } from '../prontuarios.constants';
import { Prontuario } from '../domain/prontuario.entity';
import { Cid10Repository, ProntuarioRepository } from './ports/prontuario.repository';

export interface ProntuarioRequestContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

@Injectable()
export class ProntuariosService {
  constructor(
    @Inject(PRONTUARIO_REPOSITORY) private readonly prontuarios: ProntuarioRepository,
    @Inject(CID10_REPOSITORY) private readonly cid10: Cid10Repository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly configService: AppConfigService,
  ) {}

  async create(dto: CreateProntuarioDto, context: ProntuarioRequestContext): Promise<Prontuario> {
    this.assertMedico(context.user);
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);
    const prontuario = await this.prontuarios.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      medicoId: context.user.sub,
      agendamentoId: dto.agendamentoId,
      dataAtendimento: new Date(dto.dataAtendimento),
      tipo: dto.tipo,
      subjetivo: dto.subjetivo,
      objetivo: dto.objetivo,
      avaliacao: dto.avaliacao,
      plano: dto.plano,
      fichaVaPro: dto.fichaVaPro,
      arquivos: dto.arquivos ?? [],
    });

    await this.audit(AuditEvent.MEDICAL_RECORD_CREATED, context, {
      clinicaId,
      pacienteId: prontuario.pacienteId,
      prontuarioId: prontuario.id,
    });

    return prontuario;
  }

  async listByPaciente(query: ListProntuariosQueryDto, context: ProntuarioRequestContext): Promise<Prontuario[]> {
    this.assertMedico(context.user);
    if (!query.pacienteId) {
      throw new BadRequestException('pacienteId e obrigatorio para listar historico de prontuario.');
    }

    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);
    const prontuarios = await this.prontuarios.listByPaciente(clinicaId, query.pacienteId);

    await this.audit(AuditEvent.MEDICAL_RECORD_LISTED, context, {
      clinicaId,
      pacienteId: query.pacienteId,
      quantidade: prontuarios.length,
    });

    return prontuarios;
  }

  async findOne(prontuarioId: string, clinicaId: string | undefined, context: ProntuarioRequestContext) {
    const prontuario = await this.getProntuarioOrThrow(prontuarioId, clinicaId, context);
    const addendums = await this.prontuarios.listAddendums(prontuario.id);

    await this.audit(AuditEvent.MEDICAL_RECORD_VIEWED, context, {
      clinicaId: prontuario.clinicaId,
      pacienteId: prontuario.pacienteId,
      prontuarioId,
    });

    return { ...prontuario, addendums };
  }

  async updateDraft(
    prontuarioId: string,
    dto: UpdateProntuarioDto,
    clinicaId: string | undefined,
    context: ProntuarioRequestContext,
  ): Promise<Prontuario> {
    const current = await this.getProntuarioOrThrow(prontuarioId, clinicaId, context);
    this.assertOwner(current, context.user);

    if (current.assinado) {
      throw new ConflictException('Prontuario assinado e imutavel. Use addendum.');
    }

    const updated = await this.prontuarios.updateDraft(current.clinicaId, prontuarioId, {
      ...dto,
      dataAtendimento: dto.dataAtendimento ? new Date(dto.dataAtendimento) : undefined,
    });

    if (!updated) {
      throw new ConflictException('Prontuario nao pode ser alterado.');
    }

    await this.audit(AuditEvent.MEDICAL_RECORD_UPDATED, context, {
      clinicaId: current.clinicaId,
      pacienteId: current.pacienteId,
      prontuarioId,
      campos: Object.keys(dto),
    });

    return updated;
  }

  async sign(
    prontuarioId: string,
    clinicaId: string | undefined,
    context: ProntuarioRequestContext,
  ): Promise<Prontuario> {
    const current = await this.getProntuarioOrThrow(prontuarioId, clinicaId, context);
    this.assertOwner(current, context.user);

    if (current.assinado) {
      throw new ConflictException('Prontuario ja assinado.');
    }

    const dataAssinatura = new Date();
    const signed = await this.prontuarios.sign(current.clinicaId, prontuarioId, {
      medicoId: context.user.sub,
      dataAssinatura,
      hash: this.signatureHash(current, context.user.sub, dataAssinatura),
    });

    if (!signed) {
      throw new ConflictException('Prontuario nao pode ser assinado.');
    }

    await this.audit(AuditEvent.MEDICAL_RECORD_SIGNED, context, {
      clinicaId: current.clinicaId,
      pacienteId: current.pacienteId,
      prontuarioId,
    });

    return signed;
  }

  async createAddendum(
    prontuarioId: string,
    dto: CreateAddendumDto,
    clinicaId: string | undefined,
    context: ProntuarioRequestContext,
  ) {
    const prontuario = await this.getProntuarioOrThrow(prontuarioId, clinicaId, context);
    if (!prontuario.assinado) {
      throw new ConflictException('Addendum deve ser usado apenas apos assinatura. Edite o rascunho antes disso.');
    }

    const addendum = await this.prontuarios.addAddendum(prontuarioId, context.user.sub, dto.texto);

    await this.audit(AuditEvent.MEDICAL_RECORD_ADDENDUM_CREATED, context, {
      clinicaId: prontuario.clinicaId,
      pacienteId: prontuario.pacienteId,
      prontuarioId,
      addendumId: addendum.id,
    });

    return addendum;
  }

  async listAddendums(prontuarioId: string, clinicaId: string | undefined, context: ProntuarioRequestContext) {
    const prontuario = await this.getProntuarioOrThrow(prontuarioId, clinicaId, context);
    const addendums = await this.prontuarios.listAddendums(prontuarioId);

    await this.audit(AuditEvent.MEDICAL_RECORD_VIEWED, context, {
      clinicaId: prontuario.clinicaId,
      pacienteId: prontuario.pacienteId,
      prontuarioId,
      recurso: 'addendums',
    });

    return addendums;
  }

  async autocompleteCid10(query: string, limit: number | undefined, context: ProntuarioRequestContext) {
    this.assertMedico(context.user);
    const result = await this.cid10.autocomplete(query, limit);

    await this.audit(AuditEvent.CID10_SEARCHED, context, {
      termo: query,
      quantidade: result.length,
    });

    return result;
  }

  private async getProntuarioOrThrow(
    prontuarioId: string,
    clinicaId: string | undefined,
    context: ProntuarioRequestContext,
  ): Promise<Prontuario> {
    this.assertMedico(context.user);
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const prontuario = await this.prontuarios.findById(resolvedClinicaId, prontuarioId);

    if (!prontuario) {
      throw new NotFoundException('Prontuario nao encontrado.');
    }

    return prontuario;
  }

  private assertMedico(user: AuthTokenPayload): void {
    // Paridade profissional: médico, enfermeiro e advogado acessam o prontuário.
    if (!ehProfissional(user.papel)) {
      throw new ForbiddenException('Somente profissionais de atendimento acessam o prontuario.');
    }
  }

  private assertOwner(prontuario: Prontuario, user: AuthTokenPayload): void {
    if (prontuario.medicoId !== user.sub) {
      throw new ForbiddenException('Somente o medico responsavel pode alterar ou assinar este prontuario.');
    }
  }

  private resolveClinicaId(user: AuthTokenPayload, requestedClinicaId?: string): string {
    if (user.clinicaId) {
      return user.clinicaId;
    }

    if (requestedClinicaId) {
      return requestedClinicaId;
    }

    throw new BadRequestException('clinicaId e obrigatorio para esta operacao.');
  }

  private signatureHash(prontuario: Prontuario, medicoId: string, dataAssinatura: Date): string {
    const secret =
      this.configService.getConfig().prontuarioSignatureSecret ??
      this.configService.getConfig().jwtAccessSecret;
    const payload = {
      prontuario: {
        clinicaId: prontuario.clinicaId,
        pacienteId: prontuario.pacienteId,
        medicoId: prontuario.medicoId,
        agendamentoId: prontuario.agendamentoId,
        dataAtendimento: prontuario.dataAtendimento.toISOString(),
        tipo: prontuario.tipo,
        subjetivo: prontuario.subjetivo,
        objetivo: prontuario.objetivo,
        avaliacao: prontuario.avaliacao,
        plano: prontuario.plano,
        fichaVaPro: prontuario.fichaVaPro ?? null,
        arquivos: prontuario.arquivos,
      },
      medicoId,
      dataAssinatura: dataAssinatura.toISOString(),
    };

    return createHmac('sha256', secret).update(this.stableStringify(payload)).digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${this.stableStringify(object[key])}`)
      .join(',')}}`;
  }

  private async audit(
    event: AuditEvent,
    context: ProntuarioRequestContext,
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
