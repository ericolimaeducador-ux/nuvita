import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { ListPacientesQueryDto } from './dto/list-pacientes-query.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { UpdateObservacoesPacienteDto } from './dto/update-observacoes-paciente.dto';
import { PACIENTE_REPOSITORY } from '../pacientes.constants';
import { Paciente, ProjetoPaciente } from '../domain/paciente.entity';
import { PacienteRepository } from './ports/paciente.repository';

const MSG_CPF_DUPLICADO_CADASTRO = 'Já existe um paciente com este CPF nesta clínica.';
const MSG_CPF_DUPLICADO_ATUALIZACAO =
  'Não é possível atualizar: já existe outro paciente com este CPF nesta clínica.';

/**
 * Violação do índice único {clinicaId, cpfHash} (E11000). O índice também vale para
 * pacientes inativos: um paciente desativado com o mesmo CPF continua bloqueando o cadastro.
 */
function ehCpfDuplicado(erro: unknown): boolean {
  if (typeof erro !== 'object' || erro === null) return false;
  const e = erro as { code?: number; keyPattern?: Record<string, unknown>; message?: string };
  if (e.code !== 11000) return false;
  return e.keyPattern ? 'cpfHash' in e.keyPattern : /cpfHash/.test(e.message ?? '');
}

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
    const paciente = await this.traduzirCpfDuplicado(MSG_CPF_DUPLICADO_CADASTRO, () => this.pacientes.create({
      clinicaId,
      nome: dto.nome,
      cpf: dto.cpf,
      dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
      sexo: dto.sexo,
      telefone: dto.telefone,
      email: dto.email,
      endereco: dto.endereco,
      convenio: dto.convenio,
      consentimentoLGPD: dto.consentimentoLGPD
        ? {
            aceito: dto.consentimentoLGPD.aceito,
            dataAceite: new Date(dto.consentimentoLGPD.dataAceite),
            versao: dto.consentimentoLGPD.versao,
          }
        : undefined,
      projeto: dto.projeto,
      linhaTerapeutica: dto.linhaTerapeutica,
      representante: dto.representante,
    }));

    await this.audit(AuditEvent.PATIENT_CREATED, context, {
      clinicaId,
      pacienteId: paciente.id,
    });

    return paciente;
  }

  async list(query: ListPacientesQueryDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);
    const { projeto } = this.resolveVisibilidadeProjeto(context.user.papel, query.projeto);

    if (query.cpf) {
      const paciente = await this.pacientes.findByCpf(clinicaId, query.cpf, query.incluirInativos);
      const visivel = paciente && this.podeVerPaciente(context.user.papel, paciente.projeto);
      await this.audit(AuditEvent.PATIENT_SEARCHED, context, {
        clinicaId,
        criterio: 'cpf',
        pacienteId: visivel ? paciente!.id : undefined,
      });

      return {
        items: visivel ? [paciente!] : [],
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
          projeto,
          linhaTerapeutica: query.linhaTerapeutica,
          representante: query.representante,
          dataNascimento: query.dataNascimento,
          sort: query.sort,
        })
      : await this.pacientes.list({
          clinicaId,
          cursor: query.cursor,
          limit: query.limit,
          incluirInativos: query.incluirInativos,
          projeto,
          linhaTerapeutica: query.linhaTerapeutica,
          representante: query.representante,
          dataNascimento: query.dataNascimento,
          sort: query.sort,
        });

    await this.audit(query.nome ? AuditEvent.PATIENT_SEARCHED : AuditEvent.PATIENT_LISTED, context, {
      clinicaId,
      criterio: query.nome ? 'nome' : 'lista',
      quantidade: result.items.length,
    });

    return result;
  }

  /** Valores de `representante` já usados na clínica, para autocomplete no cadastro/filtro. */
  async listarRepresentantes(clinicaId: string | undefined, user: AuthTokenPayload): Promise<string[]> {
    const resolvedClinicaId = this.resolveClinicaId(user, clinicaId);
    return this.pacientes.listarRepresentantesDistintos(resolvedClinicaId);
  }

  async findOne(pacienteId: string, clinicaId: string | undefined, context: RequestAuditContext): Promise<Paciente> {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const paciente = await this.pacientes.findById(resolvedClinicaId, pacienteId);

    if (!paciente || !this.podeVerPaciente(context.user.papel, paciente.projeto)) {
      throw new NotFoundException('Paciente nao encontrado.');
    }

    await this.audit(AuditEvent.PATIENT_VIEWED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId,
    });

    return paciente;
  }

  /**
   * Resumo (nome + CPF) de vários pacientes por id, em lote e sem auditar cada
   * acesso individualmente — usado para identificar pacientes com segurança em
   * telas como a Agenda (nome completo + CPF eliminam erro de paciente errado).
   */
  async resumoPorIds(
    clinicaId: string,
    pacienteIds: string[],
  ): Promise<Map<string, { nome: string; cpf?: string; email?: string }>> {
    const unicos = [...new Set(pacienteIds.filter(Boolean))];
    if (unicos.length === 0) return new Map();
    const pacientes = await this.pacientes.findManyByIds(clinicaId, unicos);
    return new Map(pacientes.map((p) => [p.id, { nome: p.nome, cpf: p.cpf, email: p.email }]));
  }

  async update(
    pacienteId: string,
    dto: UpdatePacienteDto,
    clinicaId: string | undefined,
    context: RequestAuditContext,
  ): Promise<Paciente> {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    await this.assertPacienteVisivel(resolvedClinicaId, pacienteId, context.user.papel);
    const paciente = await this.traduzirCpfDuplicado(MSG_CPF_DUPLICADO_ATUALIZACAO, () => this.pacientes.update(resolvedClinicaId, pacienteId, {
      ...dto,
      dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
      consentimentoLGPD: dto.consentimentoLGPD
        ? {
            aceito: dto.consentimentoLGPD.aceito,
            dataAceite: new Date(dto.consentimentoLGPD.dataAceite),
            versao: dto.consentimentoLGPD.versao,
          }
        : undefined,
    }));

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
    await this.assertPacienteVisivel(resolvedClinicaId, pacienteId, context.user.papel);
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
    await this.assertPacienteVisivel(resolvedClinicaId, pacienteId, context.user.papel);
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

  /** Executa a gravação e converte a violação do índice único de CPF em 409 com mensagem clara. */
  private async traduzirCpfDuplicado<T>(mensagem: string, operacao: () => Promise<T>): Promise<T> {
    try {
      return await operacao();
    } catch (erro) {
      if (ehCpfDuplicado(erro)) throw new ConflictException(mensagem);
      throw erro;
    }
  }

  private resolveClinicaId(user: AuthTokenPayload, requestedClinicaId?: string): string {
    return resolveTenantClinicaId(user, requestedClinicaId);
  }

  /**
   * Nuvita-psi é um produto de uma especialidade só (psicologia) — todo
   * paciente da clínica é visível a qualquer profissional/secretaria/admin.
   * `projeto` continua existindo como classificação opcional (filtro livre
   * quando informado na busca), sem restringir visibilidade por papel.
   */
  private resolveVisibilidadeProjeto(
    _papel: Papel,
    projetoSolicitado?: ProjetoPaciente,
  ): { projeto?: ProjetoPaciente } {
    return { projeto: projetoSolicitado };
  }

  private podeVerPaciente(_papel: Papel, _projetoPaciente?: ProjetoPaciente): boolean {
    return true;
  }

  /** Barra update/desativação de paciente fora da visibilidade do papel, mesmo sabendo o ID direto. */
  private async assertPacienteVisivel(clinicaId: string, pacienteId: string, papel: Papel): Promise<void> {
    const paciente = await this.pacientes.findById(clinicaId, pacienteId);
    if (!paciente || !this.podeVerPaciente(papel, paciente.projeto)) {
      throw new NotFoundException('Paciente nao encontrado.');
    }
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
