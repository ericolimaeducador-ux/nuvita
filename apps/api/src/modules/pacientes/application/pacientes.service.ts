import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { isMenorDeIdade } from '../../../../../../packages/shared/src/paciente';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { ListPacientesQueryDto } from './dto/list-pacientes-query.dto';
import { AutorizacaoResponsavelDto } from './dto/responsavel-legal.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { UpdateObservacoesPacienteDto } from './dto/update-observacoes-paciente.dto';
import { PACIENTE_REPOSITORY } from '../pacientes.constants';
import { AutorizacaoResponsavel, Paciente, ProjetoPaciente } from '../domain/paciente.entity';
import { PacienteRepository } from './ports/paciente.repository';

/**
 * Resumo de contato de um paciente, já resolvido para o destinatário EFETIVO
 * (ver PacientesService.contatoEfetivo()): o responsável legal, se o paciente
 * for menor com responsável cadastrado; senão o contato do próprio paciente.
 */
export interface ResumoContatoPaciente {
  nome: string;
  cpf?: string;
  email?: string;
  /** A quem a mensagem deve se dirigir ("Olá {nomeDestinatario}") — o responsável ou o próprio paciente. */
  nomeDestinatario: string;
  /** true quando `email`/`nomeDestinatario` acima são do responsável legal, não do paciente. */
  ehResponsavel: boolean;
}

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
    const dataNascimento = dto.dataNascimento ? new Date(dto.dataNascimento) : undefined;

    // dataNascimento é obrigatória no DTO de criação (ver CreatePacienteDto), mas o
    // teste unitário chama o serviço direto, sem passar pela ValidationPipe — por
    // isso a checagem aqui também aceita "indeterminado" sem quebrar (não exige
    // responsável legal quando a data simplesmente não veio).
    if (isMenorDeIdade(dataNascimento) === 'menor') {
      this.validarResponsavelLegalObrigatorio(dto.responsavelLegal, dto.autorizacaoResponsavel?.confirmado);
    }
    const autorizacaoResponsavel = this.construirAutorizacaoResponsavel(dto.autorizacaoResponsavel, context);

    const paciente = await this.traduzirCpfDuplicado(MSG_CPF_DUPLICADO_CADASTRO, () => this.pacientes.create({
      clinicaId,
      nome: dto.nome,
      cpf: dto.cpf,
      dataNascimento,
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
      responsavelLegal: dto.responsavelLegal,
      autorizacaoResponsavel,
    }));

    await this.audit(AuditEvent.PATIENT_CREATED, context, {
      clinicaId,
      pacienteId: paciente.id,
    });
    if (autorizacaoResponsavel?.confirmado) {
      // Metadata só registra QUE a autorização foi confirmada — nunca os dados do
      // responsável (nome/CPF/telefone/email), que ficam só no doc criptografado.
      await this.audit(AuditEvent.PATIENT_GUARDIAN_AUTHORIZATION_SET, context, {
        clinicaId,
        pacienteId: paciente.id,
        confirmado: true,
      });
    }

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
   * Resumo (nome + CPF + contato efetivo) de vários pacientes por id, em lote e
   * sem auditar cada acesso individualmente — usado para (a) identificar
   * pacientes com segurança em telas como a Agenda (nome completo + CPF
   * eliminam erro de paciente errado) e (b) resolver, num só lugar, para quem
   * as notificações operacionais (agenda/teleconsulta/documento) devem ir —
   * ver contatoEfetivo().
   */
  async resumoPorIds(clinicaId: string, pacienteIds: string[]): Promise<Map<string, ResumoContatoPaciente>> {
    const unicos = [...new Set(pacienteIds.filter(Boolean))];
    if (unicos.length === 0) return new Map();
    const pacientes = await this.pacientes.findManyByIds(clinicaId, unicos);
    return new Map(pacientes.map((p) => [p.id, this.contatoEfetivo(p)]));
  }

  /**
   * Paciente menor de idade com responsável legal cadastrado (e-mail
   * informado): o contato efetivo — e a quem a mensagem se dirige — passa a
   * ser o responsável, não o paciente. Sem responsável cadastrado (dado
   * legado ou cadastro ainda incompleto), cai no contato do próprio paciente.
   */
  private contatoEfetivo(paciente: Paciente): ResumoContatoPaciente {
    const usaResponsavel =
      isMenorDeIdade(paciente.dataNascimento) === 'menor' && !!paciente.responsavelLegal?.email;

    return {
      nome: paciente.nome,
      cpf: paciente.cpf,
      email: usaResponsavel ? paciente.responsavelLegal!.email : paciente.email,
      nomeDestinatario: usaResponsavel ? paciente.responsavelLegal!.nome! : paciente.nome,
      ehResponsavel: usaResponsavel,
    };
  }

  async update(
    pacienteId: string,
    dto: UpdatePacienteDto,
    clinicaId: string | undefined,
    context: RequestAuditContext,
  ): Promise<Paciente> {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const atual = await this.assertPacienteVisivel(resolvedClinicaId, pacienteId, context.user.papel);

    // PATCH é parcial: a classificação de idade/responsável considera o valor que
    // RESULTA da mescla entre o que veio no corpo e o que já estava salvo — editar
    // o telefone de um paciente maior não pode, por exemplo, ser barrado por falta
    // de responsável, e editar o CPF de um menor já cadastrado com responsável não
    // pode reexigir os campos que já foram preenchidos antes.
    const dataNascimentoResultante = dto.dataNascimento ? new Date(dto.dataNascimento) : atual.dataNascimento;
    const responsavelResultante = dto.responsavelLegal ?? atual.responsavelLegal;
    const autorizacaoConfirmadaResultante =
      dto.autorizacaoResponsavel !== undefined
        ? dto.autorizacaoResponsavel.confirmado
        : atual.autorizacaoResponsavel?.confirmado;

    if (isMenorDeIdade(dataNascimentoResultante) === 'menor') {
      this.validarResponsavelLegalObrigatorio(responsavelResultante, autorizacaoConfirmadaResultante);
    }

    // undefined = este PATCH não toca em autorizacaoResponsavel — o repositório
    // (toUpdate(), padrão `if (input.X !== undefined)`) preserva o valor já salvo,
    // incluindo o registradaPor/registradaEm históricos de quando foi confirmada.
    const autorizacaoParaGravar = this.construirAutorizacaoResponsavel(dto.autorizacaoResponsavel, context);

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
      autorizacaoResponsavel: autorizacaoParaGravar,
    }));

    if (!paciente) {
      throw new NotFoundException('Paciente nao encontrado.');
    }

    await this.audit(AuditEvent.PATIENT_UPDATED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId,
      campos: Object.keys(dto),
    });
    if (dto.autorizacaoResponsavel !== undefined) {
      await this.audit(AuditEvent.PATIENT_GUARDIAN_AUTHORIZATION_SET, context, {
        clinicaId: resolvedClinicaId,
        pacienteId,
        confirmado: dto.autorizacaoResponsavel.confirmado,
      });
    }

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

  /**
   * Barra update/desativação de paciente fora da visibilidade do papel, mesmo
   * sabendo o ID direto. Devolve o paciente encontrado — update() usa para saber
   * o dataNascimento/responsavelLegal/autorizacaoResponsavel já salvos, sem uma
   * 2ª busca.
   */
  private async assertPacienteVisivel(clinicaId: string, pacienteId: string, papel: Papel): Promise<Paciente> {
    const paciente = await this.pacientes.findById(clinicaId, pacienteId);
    if (!paciente || !this.podeVerPaciente(papel, paciente.projeto)) {
      throw new NotFoundException('Paciente nao encontrado.');
    }
    return paciente;
  }

  /**
   * Paciente menor de idade (Art. 8º do Código de Ética Profissional do CFP +
   * Resolução CFP nº 13/2022 — fonte ainda não verificada em texto normativo
   * primário; ajustar aqui, num só lugar, se a leitura jurídica confirmada
   * exigir outros campos ou uma faixa etária diferente): nome, CPF e telefone
   * do responsável legal, mais a autorização confirmada, passam a ser
   * obrigatórios. Checagem explícita no serviço (não dá para expressar
   * "obrigatório só se outro campo tiver determinado valor" com
   * class-validator sem um validador customizado) — mais fácil de ajustar
   * depois de revisão profissional do enquadramento legal.
   */
  private validarResponsavelLegalObrigatorio(
    responsavelLegal: { nome?: string; cpf?: string; telefone?: string } | undefined,
    autorizacaoConfirmada: boolean | undefined,
  ): void {
    const faltando: string[] = [];
    if (!responsavelLegal?.nome?.trim()) faltando.push('nome do responsável legal');
    if (!responsavelLegal?.cpf?.trim()) faltando.push('CPF do responsável legal');
    if (!responsavelLegal?.telefone?.trim()) faltando.push('telefone do responsável legal');
    if (!autorizacaoConfirmada) faltando.push('confirmação de autorização do responsável legal');

    if (faltando.length > 0) {
      throw new BadRequestException(
        `Paciente menor de idade: informe ${faltando.join(', ')} para concluir o cadastro.`,
      );
    }
  }

  /**
   * `registradaPor`/`registradaEm` nunca vêm do cliente (ResponsavelLegalDto só
   * declara `confirmado`) — são sempre o usuário autenticado e o instante atual,
   * mesmo padrão de `criadoPor` em agendamento/lançamento financeiro.
   * undefined quando o PATCH não toca em autorizacaoResponsavel (ver update()).
   */
  private construirAutorizacaoResponsavel(
    autorizacao: AutorizacaoResponsavelDto | undefined,
    context: RequestAuditContext,
  ): AutorizacaoResponsavel | undefined {
    if (autorizacao === undefined) return undefined;
    return autorizacao.confirmado
      ? { confirmado: true, registradaPor: context.user.sub, registradaEm: new Date() }
      : { confirmado: false };
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
