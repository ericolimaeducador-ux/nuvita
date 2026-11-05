import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { AppConfigService } from '../../../common/security/config.service';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY, USER_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { UserRepository } from '../../auth/application/ports/user.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CobrancasService } from '../../cobrancas/application/cobrancas.service';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { CONSULTA_REPOSITORY } from '../consultas.constants';
import {
  AdendoConsulta,
  CobrancaConsulta,
  ConsultaEnfermagem,
  StatusCobrancaConsulta,
  StatusConsulta,
  avaliacaoVazia,
  planejamentoVazio,
} from '../domain/consulta-enfermagem.entity';
import { ModulosAvaliacaoRegistry } from '../domain/modulos-avaliacao.registry';
import { ConsultaRepository, ConteudoConsulta } from './ports/consulta.repository';
import {
  AssinarConsultaDto,
  ConteudoConsultaDto,
  CreateAdendoConsultaDto,
  CreateConsultaDto,
  ListConsultasQueryDto,
  UpdateConsultaDto,
} from './dto/consulta.dto';

export interface ConsultaRequestContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

export interface ResultadoCobrancaConsulta {
  consultaId: string;
  cobranca: CobrancaConsulta;
}

const TENTATIVAS_ADENDO = 5;

/**
 * Consulta de enfermagem (Res. Cofen 736/2024, 5 etapas). Reusa a infraestrutura do prontuário herdado: assinatura HMAC
 * (PRONTUARIO_SIGNATURE_SECRET) com o COREN do perfil, trava pós-assinatura por update condicional, adendos só depois de
 * assinar, auditoria só com ids/nomes de campo/contagens.
 *
 * ACESSO (diverge do prontuário do psi DE PROPÓSITO: na estomaterapia o cuidado é de equipe, não sigilo de psicoterapia):
 *  - LER: qualquer ENFERMEIRO da mesma clínica (leitura por quem não é o autor é auditada);
 *  - criar, editar rascunho, assinar e fazer adendo: só o ENFERMEIRO AUTOR (diagnóstico e prescrição são privativos do
 *    enfermeiro — Res. 736 art. 6º);
 *  - ADMIN, SUPER_ADMIN e SECRETARIA: sem acesso ao conteúdo clínico (como no prontuário do psi). A única exceção é gerar a
 *    cobrança pendente (ADMIN), que não expõe conteúdo clínico.
 *
 * Travar após assinar é ESCOLHA DO PROJETO (não exigência normativa).
 */
@Injectable()
export class ConsultasService {
  private readonly logger = new Logger(ConsultasService.name);

  constructor(
    @Inject(CONSULTA_REPOSITORY) private readonly repo: ConsultaRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly configService: AppConfigService,
    private readonly pacientesService: PacientesService,
    private readonly cobrancasService: CobrancasService,
    private readonly modulos: ModulosAvaliacaoRegistry,
  ) {}

  // ---------------- criação e rascunho (só o enfermeiro autor) ----------------

  async criar(dto: CreateConsultaDto, context: ConsultaRequestContext): Promise<ConsultaEnfermagem> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);
    // Paciente de outra clínica -> 404 (isolamento por tenant).
    const resumo = await this.pacientesService.resumoPorIds(clinicaId, [dto.pacienteId]);
    if (!resumo.has(dto.pacienteId)) throw new NotFoundException('Paciente nao encontrado.');

    const conteudo = await this.montarConteudo(dto, context.user);
    const consulta = await this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      enfermeiroId: context.user.sub,
      status: StatusConsulta.RASCUNHO,
      avaliacao: conteudo.avaliacao ?? avaliacaoVazia(),
      diagnosticos: conteudo.diagnosticos ?? [],
      planejamento: conteudo.planejamento ?? planejamentoVazio(),
      implementacao: conteudo.implementacao ?? { registros: [] },
      evolucao: conteudo.evolucao ?? { texto: '' },
    });
    await this.audit(AuditEvent.CONSULTA_ENFERMAGEM_CREATED, context, {
      clinicaId,
      consultaId: consulta.id,
      pacienteId: consulta.pacienteId,
      etapas: Object.keys(conteudo),
    });
    return consulta;
  }

  async atualizarRascunho(id: string, dto: UpdateConsultaDto, context: ConsultaRequestContext): Promise<ConsultaEnfermagem> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);
    const atual = await this.obterOuFalhar(clinicaId, id);
    this.assertAutor(atual, context.user);
    if (atual.status !== StatusConsulta.RASCUNHO) {
      throw new ConflictException('Consulta assinada: nao pode ser alterada. Use um adendo.');
    }

    const conteudo = await this.montarConteudo(dto, context.user, atual);
    const atualizada = await this.repo.updateRascunho(clinicaId, id, context.user.sub, conteudo);
    if (!atualizada) throw new ConflictException('Consulta assinada: nao pode ser alterada. Use um adendo.');
    await this.audit(AuditEvent.CONSULTA_ENFERMAGEM_UPDATED, context, {
      clinicaId,
      consultaId: id,
      pacienteId: atual.pacienteId,
      etapas: Object.keys(conteudo),
    });
    return atualizada;
  }

  // ---------------- assinatura + cobrança ("assina primeiro, cobra depois") ----------------

  /**
   * 1) Assinatura condicional (só RASCUNHO do autor), gravando JUNTO a decisão de cobrança (pacote ou valor).
   * 2) Depois, a cobrança idempotente pelo módulo de cobranças. Se ela falhar, a consulta continua assinada com
   *    cobranca.status = PENDENTE_GERACAO (auditado) e pode ser gerada depois em POST /consultas/:id/cobranca.
   * Assinar de novo dá 409 (não duplica nada).
   */
  async assinar(id: string, dto: AssinarConsultaDto, clinicaIdQuery: string | undefined, context: ConsultaRequestContext): Promise<ConsultaEnfermagem> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, clinicaIdQuery);
    const atual = await this.obterOuFalhar(clinicaId, id);
    this.assertAutor(atual, context.user);
    if (atual.status !== StatusConsulta.RASCUNHO) throw new ConflictException('Consulta ja assinada.');

    // Fonte única do COREN: o perfil do usuário (mesmo padrão do prontuário).
    const profissional = await this.users.findById(context.user.sub);
    const coren = profissional?.coren?.trim();
    if (!coren) throw new UnprocessableEntityException('Informe o COREN no seu perfil para assinar a consulta.');

    const decisao: CobrancaConsulta = dto.cobranca.incluidaEmPacote
      ? { incluidaEmPacote: true, status: StatusCobrancaConsulta.INCLUIDA_EM_PACOTE }
      : {
          incluidaEmPacote: false,
          valorCentavos: dto.cobranca.valorCentavos ?? (await this.cobrancasService.valorConsultaPadrao(clinicaId)),
          status: StatusCobrancaConsulta.PENDENTE_GERACAO,
        };

    const dataAssinatura = new Date();
    const assinada = await this.repo.assinar(clinicaId, id, context.user.sub, {
      enfermeiroId: context.user.sub,
      coren,
      dataAssinatura,
      hash: this.hashAssinatura(atual, coren, dataAssinatura),
    }, decisao);
    if (!assinada) throw new ConflictException('Consulta ja assinada.');

    await this.audit(AuditEvent.CONSULTA_ENFERMAGEM_SIGNED, context, { clinicaId, consultaId: id, pacienteId: atual.pacienteId });

    if (decisao.incluidaEmPacote) {
      await this.audit(AuditEvent.CONSULTA_COBRANCA_INCLUIDA_EM_PACOTE, context, { clinicaId, consultaId: id, pacienteId: atual.pacienteId });
      return assinada;
    }
    return (await this.tentarGerarCobranca(assinada, context)) ?? assinada;
  }

  /**
   * Gera a cobrança de uma consulta ASSINADA com cobrança PENDENTE_GERACAO, usando exatamente o valor gravado na
   * assinatura. Idempotente: já gerada (ou incluída em pacote) devolve a situação atual sem criar nada.
   * Acesso: o ENFERMEIRO autor ou ADMIN (SUPER_ADMIN sempre). Não devolve conteúdo clínico.
   */
  async gerarCobrancaPendente(id: string, clinicaIdQuery: string | undefined, context: ConsultaRequestContext): Promise<ResultadoCobrancaConsulta> {
    const papel = context.user.papel;
    if (papel !== Papel.ENFERMEIRO && papel !== Papel.ADMIN && papel !== Papel.SUPER_ADMIN) {
      throw new ForbiddenException('Sem permissao para gerar a cobranca desta consulta.');
    }
    const clinicaId = resolveTenantClinicaId(context.user, clinicaIdQuery);
    const consulta = await this.obterOuFalhar(clinicaId, id);
    if (papel === Papel.ENFERMEIRO) this.assertAutor(consulta, context.user);
    if (consulta.status !== StatusConsulta.ASSINADA || !consulta.cobranca) {
      throw new ConflictException('A cobranca so e gerada para consulta assinada.');
    }
    if (consulta.cobranca.status !== StatusCobrancaConsulta.PENDENTE_GERACAO) {
      return { consultaId: id, cobranca: consulta.cobranca };
    }
    const atualizada = await this.tentarGerarCobranca(consulta, context);
    if (!atualizada) throw new UnprocessableEntityException('Nao foi possivel gerar a cobranca agora. Tente novamente.');
    return { consultaId: id, cobranca: atualizada.cobranca! };
  }

  /** null = falhou (a consulta fica PENDENTE_GERACAO e o evento é auditado). */
  private async tentarGerarCobranca(consulta: ConsultaEnfermagem, context: ConsultaRequestContext): Promise<ConsultaEnfermagem | null> {
    const decisao = consulta.cobranca!;
    try {
      const cobranca = await this.cobrancasService.gerarCobrancaDeConsulta(
        { clinicaId: consulta.clinicaId, pacienteId: consulta.pacienteId, consultaId: consulta.id, valorCentavos: decisao.valorCentavos ?? 0 },
        context,
      );
      const atualizada = await this.repo.atualizarCobranca(consulta.clinicaId, consulta.id, {
        ...decisao,
        status: StatusCobrancaConsulta.GERADA,
        cobrancaId: cobranca.id,
      });
      await this.audit(AuditEvent.CONSULTA_COBRANCA_GERADA, context, {
        clinicaId: consulta.clinicaId,
        consultaId: consulta.id,
        cobrancaId: cobranca.id,
      });
      return atualizada;
    } catch (erro) {
      this.logger.warn(`Cobranca da consulta ${consulta.id} pendente de geracao: ${(erro as Error).message}`);
      await this.audit(AuditEvent.CONSULTA_COBRANCA_PENDENTE, context, {
        clinicaId: consulta.clinicaId,
        consultaId: consulta.id,
      });
      return null;
    }
  }

  // ---------------- adendos (só o autor, só depois de assinar) ----------------

  async criarAdendo(id: string, dto: CreateAdendoConsultaDto, clinicaIdQuery: string | undefined, context: ConsultaRequestContext): Promise<AdendoConsulta> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, clinicaIdQuery);
    const consulta = await this.obterOuFalhar(clinicaId, id);
    this.assertAutor(consulta, context.user);
    if (consulta.status !== StatusConsulta.ASSINADA) {
      throw new ConflictException('Adendo so depois da assinatura. Antes disso, edite o rascunho.');
    }

    // Número sequencial sem corrida: o índice único (consultaId, numero) recusa o mesmo número duas vezes (E11000);
    // nesse caso relê o último e tenta o próximo.
    for (let tentativa = 0; tentativa < TENTATIVAS_ADENDO; tentativa += 1) {
      const numero = (await this.repo.ultimoNumeroAdendo(clinicaId, id)) + 1;
      try {
        const adendo = await this.repo.createAdendo({
          consultaId: id,
          clinicaId,
          numero,
          autorId: context.user.sub,
          motivo: dto.motivo.trim(),
          texto: dto.texto,
        });
        await this.audit(AuditEvent.CONSULTA_ENFERMAGEM_ADENDO_CREATED, context, {
          clinicaId,
          consultaId: id,
          adendoId: adendo.id,
          numero,
        });
        return adendo;
      } catch (erro) {
        if ((erro as { code?: number }).code !== 11000) throw erro;
      }
    }
    throw new ConflictException('Muitos adendos simultaneos nesta consulta. Tente novamente.');
  }

  // ---------------- leitura (enfermeiros da clínica) ----------------

  async obter(id: string, clinicaIdQuery: string | undefined, context: ConsultaRequestContext): Promise<ConsultaEnfermagem & { adendos: AdendoConsulta[] }> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, clinicaIdQuery);
    const consulta = await this.obterOuFalhar(clinicaId, id);
    const adendos = await this.repo.listAdendos(clinicaId, id);
    if (consulta.enfermeiroId !== context.user.sub) {
      await this.audit(AuditEvent.CONSULTA_ENFERMAGEM_VIEWED, context, {
        clinicaId,
        consultaId: id,
        pacienteId: consulta.pacienteId,
        autor: false,
      });
    }
    return { ...consulta, adendos };
  }

  async listarPorPaciente(query: ListConsultasQueryDto, context: ConsultaRequestContext): Promise<ConsultaEnfermagem[]> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, query.clinicaId);
    const consultas = await this.repo.listByPaciente(clinicaId, query.pacienteId);
    const deOutros = consultas.filter((c) => c.enfermeiroId !== context.user.sub).length;
    await this.audit(AuditEvent.CONSULTA_ENFERMAGEM_LISTED, context, {
      clinicaId,
      pacienteId: query.pacienteId,
      quantidade: consultas.length,
      deOutrosEnfermeiros: deOutros,
    });
    return consultas;
  }

  // ---------------- internos ----------------

  /** Monta só as etapas enviadas; os módulos da Avaliação passam pela definição registrada da área. */
  private async montarConteudo(dto: ConteudoConsultaDto, user: AuthTokenPayload, atual?: ConsultaEnfermagem): Promise<ConteudoConsulta> {
    const conteudo: ConteudoConsulta = {};
    if (dto.avaliacao) {
      const base = atual?.avaliacao ?? avaliacaoVazia();
      conteudo.avaliacao = {
        dadosSubjetivos: dto.avaliacao.dadosSubjetivos ?? base.dadosSubjetivos,
        dadosObjetivos: dto.avaliacao.dadosObjetivos ?? base.dadosObjetivos,
        modulos: dto.avaliacao.modulos ? await this.modulos.validar(dto.avaliacao.modulos) : base.modulos,
      };
    }
    if (dto.diagnosticos) conteudo.diagnosticos = dto.diagnosticos.map((d) => ({ texto: d.texto.trim(), origem: d.origem }));
    if (dto.planejamento) conteudo.planejamento = { ...(atual?.planejamento ?? planejamentoVazio()), ...dto.planejamento };
    if (dto.implementacao) {
      conteudo.implementacao = {
        registros: dto.implementacao.registros.map((r) => ({
          padrao: r.padrao,
          descricao: r.descricao,
          registradoEm: r.registradoEm ? new Date(r.registradoEm) : new Date(),
          registradoPor: user.sub,
        })),
      };
    }
    if (dto.evolucao) conteudo.evolucao = { texto: dto.evolucao.texto };
    return conteudo;
  }

  private async obterOuFalhar(clinicaId: string, id: string): Promise<ConsultaEnfermagem> {
    const consulta = await this.repo.findById(clinicaId, id);
    if (!consulta) throw new NotFoundException('Consulta nao encontrada.');
    return consulta;
  }

  /** Conteúdo clínico: só ENFERMEIRO (SUPER_ADMIN passa no RolesGuard, mas não lê prontuário — igual ao psi). */
  private assertEnfermeiro(user: AuthTokenPayload): void {
    if (user.papel !== Papel.ENFERMEIRO) {
      throw new ForbiddenException('Somente enfermeiros acessam a consulta de enfermagem.');
    }
  }

  private assertAutor(consulta: ConsultaEnfermagem, user: AuthTokenPayload): void {
    if (consulta.enfermeiroId !== user.sub) {
      throw new ForbiddenException('Somente o enfermeiro autor altera, assina ou faz adendo nesta consulta.');
    }
  }

  /** HMAC-SHA256 com PRONTUARIO_SIGNATURE_SECRET sobre o conteúdo clínico, o autor, o COREN e a data (padrão do prontuário). */
  hashAssinatura(consulta: ConsultaEnfermagem, coren: string, dataAssinatura: Date): string {
    const secret = this.configService.getConfig().prontuarioSignatureSecret;
    const payload = {
      consulta: {
        clinicaId: consulta.clinicaId,
        pacienteId: consulta.pacienteId,
        enfermeiroId: consulta.enfermeiroId,
        avaliacao: consulta.avaliacao,
        diagnosticos: consulta.diagnosticos,
        planejamento: consulta.planejamento,
        implementacao: consulta.implementacao,
        evolucao: consulta.evolucao,
      },
      coren,
      dataAssinatura: dataAssinatura.toISOString(),
    };
    return createHmac('sha256', secret).update(stableStringify(payload)).digest('hex');
  }

  private async audit(event: AuditEvent, context: ConsultaRequestContext, metadata: Record<string, unknown>): Promise<void> {
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

function stableStringify(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(',')}}`;
}
