import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { AppConfigService } from '../../../common/security/config.service';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY, USER_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { UserRepository } from '../../auth/application/ports/user.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CobrancasService } from '../../cobrancas/application/cobrancas.service';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import {
  AreaModuloAvaliacao,
  ModuloFerida,
  anexosDoModuloFerida,
  anexosReferenciados,
  classificacaoLiberaModulo,
} from '../../../../../../packages/shared/src/consulta';
import { DocumentStorage } from '../../documentos/application/ports/document-storage';
import { DOCUMENT_ACCESS_URL_TTL_SECONDS, MAX_DOCUMENT_SIZE_BYTES } from '../../documentos/documentos.constants';
import { CONSULTA_ANEXO_STORAGE, CONSULTA_REPOSITORY } from '../consultas.constants';
import {
  AdendoConsulta,
  AnexoConsulta,
  CobrancaConsulta,
  ConsultaEnfermagem,
  IntegridadeConsulta,
  PendenciaAssinatura,
  StatusCobrancaConsulta,
  StatusConsulta,
  StatusDesfechoLesoes,
  avaliacaoVazia,
  planejamentoVazio,
} from '../domain/consulta-enfermagem.entity';
import { ModulosAvaliacaoRegistry } from '../domain/modulos-avaliacao.registry';
import { LesoesService, ResultadoDesfechos } from './lesoes.service';
import { ConsultaRepository, ConteudoConsulta } from './ports/consulta.repository';
import {
  AssinarConsultaDto,
  ConteudoConsultaDto,
  CreateAdendoConsultaDto,
  CreateConsultaDto,
  ListConsultasQueryDto,
  PresignAnexoConsultaDto,
  UpdateConsultaDto,
} from './dto/consulta.dto';

export interface ConsultaRequestContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

/** Consulta devolvida na leitura: com o resultado do selo de integridade quando assinada. */
export type ConsultaLida = ConsultaEnfermagem & { integridade?: IntegridadeConsulta };

/** Resposta da assinatura: a assinatura JÁ está gravada; o que falhou depois vem em `pendencias` (nunca como erro). */
export type ConsultaAssinada = ConsultaEnfermagem & { pendencias: PendenciaAssinatura[] };

const MSG_ALTERADA_EM_OUTRA_TELA = 'A consulta foi alterada em outra tela';

export interface ResultadoDesfechoLesoesConsulta {
  consultaId: string;
  desfechoLesoesStatus?: StatusDesfechoLesoes;
  aplicadas: string[];
  jaAplicadas: string[];
  /** Lesões fechadas por OUTRA consulta: o desfecho desta não foi aplicado (não sobrescreve). */
  conflitos: string[];
  falhas: string[];
}

export interface ResultadoCobrancaConsulta {
  consultaId: string;
  cobranca: CobrancaConsulta;
}

const TENTATIVAS_ADENDO = 5;

const EXTENSAO_ANEXO: Record<string, string> = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png' };

/** Anexo devolvido ao cliente: sem a URL privada do storage. */
export type AnexoPublico = Omit<AnexoConsulta, 'url'>;

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
    @Inject(CONSULTA_ANEXO_STORAGE) private readonly storage: DocumentStorage,
    private readonly lesoes: LesoesService,
  ) {}

  // ---------------- criação e rascunho (só o enfermeiro autor) ----------------

  async criar(dto: CreateConsultaDto, context: ConsultaRequestContext): Promise<ConsultaEnfermagem> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);
    // Paciente de outra clínica -> 404 (isolamento por tenant).
    const resumo = await this.pacientesService.resumoPorIds(clinicaId, [dto.pacienteId]);
    if (!resumo.has(dto.pacienteId)) throw new NotFoundException('Paciente nao encontrado.');

    const conteudo = await this.montarConteudo(dto, context.user, { clinicaId, pacienteId: dto.pacienteId });
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
      modulos: (conteudo.avaliacao?.modulos ?? []).map((m) => m.area),
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
    if (dto.versao !== atual.versao) throw new ConflictException(MSG_ALTERADA_EM_OUTRA_TELA);

    const conteudo = await this.montarConteudo(dto, context.user, { clinicaId, pacienteId: atual.pacienteId, consultaId: id }, atual);
    const atualizada = await this.repo.updateRascunho(clinicaId, id, context.user.sub, dto.versao, conteudo);
    if (!atualizada) await this.conflitoDeGravacao(clinicaId, id);
    await this.audit(AuditEvent.CONSULTA_ENFERMAGEM_UPDATED, context, {
      clinicaId,
      consultaId: id,
      pacienteId: atual.pacienteId,
      etapas: Object.keys(conteudo),
      modulos: (conteudo.avaliacao?.modulos ?? []).map((m) => m.area),
    });
    return atualizada!;
  }

  // ---------------- assinatura + cobrança ("assina primeiro, cobra depois") ----------------

  /**
   * 1) Assinatura condicional (só RASCUNHO do autor), gravando JUNTO a decisão de cobrança (pacote ou valor).
   * 2) Depois, a cobrança idempotente pelo módulo de cobranças. Se ela falhar, a consulta continua assinada com
   *    cobranca.status = PENDENTE_GERACAO (auditado) e pode ser gerada depois em POST /consultas/:id/cobranca.
   * Assinar de novo dá 409 (não duplica nada).
   */
  async assinar(id: string, dto: AssinarConsultaDto, clinicaIdQuery: string | undefined, context: ConsultaRequestContext): Promise<ConsultaAssinada> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, clinicaIdQuery);
    const atual = await this.obterOuFalhar(clinicaId, id);
    this.assertAutor(atual, context.user);
    if (atual.status !== StatusConsulta.RASCUNHO) throw new ConflictException('Consulta ja assinada.');
    if (dto.versao !== atual.versao) throw new ConflictException(MSG_ALTERADA_EM_OUTRA_TELA);

    // Fonte única do COREN: o perfil do usuário (mesmo padrão do prontuário).
    const profissional = await this.users.findById(context.user.sub);
    const coren = profissional?.coren?.trim();
    if (!coren) throw new UnprocessableEntityException('Informe o COREN no seu perfil para assinar a consulta.');
    // Ferida (5c): as lesões avaliadas precisam continuar abertas (outra consulta pode ter encerrado alguma).
    await this.lesoes.assertLesoesAbertasParaAssinar(atual);

    const decisao: CobrancaConsulta = dto.cobranca.incluidaEmPacote
      ? { incluidaEmPacote: true, status: StatusCobrancaConsulta.INCLUIDA_EM_PACOTE }
      : {
          incluidaEmPacote: false,
          valorCentavos: dto.cobranca.valorCentavos ?? (await this.cobrancasService.valorConsultaPadrao(clinicaId)),
          status: StatusCobrancaConsulta.PENDENTE_GERACAO,
        };

    // Identificação das lesões avaliadas, como está AGORA (vai junto e entra no selo).
    const identificacoesLesoes = await this.lesoes.identificacoesParaAssinatura(atual);
    const selada: ConsultaEnfermagem = identificacoesLesoes ? { ...atual, identificacoesLesoes } : atual;

    // O selo é calculado sobre o conteúdo DESTA versão, e a gravação filtra por { RASCUNHO, versao }: se outra tela
    // salvou no meio do caminho, nada é gravado (409) — o selo de A nunca fica com o conteúdo de B.
    const dataAssinatura = new Date();
    const assinada = await this.repo.assinar(
      clinicaId,
      id,
      context.user.sub,
      dto.versao,
      { enfermeiroId: context.user.sub, coren, dataAssinatura, hash: this.hashAssinatura(selada, coren, dataAssinatura) },
      decisao,
      identificacoesLesoes,
    );
    if (!assinada) await this.conflitoDeGravacao(clinicaId, id);

    // A PARTIR DAQUI a assinatura está gravada: nenhuma falha vira erro na resposta. Cada etapa posterior que falhar
    // fica como pendência persistida (padrão PENDENTE_*), e a resposta é 200 com a lista de pendências.
    return this.posAssinatura(assinada!, decisao, context);
  }

  private async posAssinatura(assinada: ConsultaEnfermagem, decisao: CobrancaConsulta, context: ConsultaRequestContext): Promise<ConsultaAssinada> {
    const { clinicaId, id, pacienteId } = assinada;
    let atual = assinada;
    let auditoriaPendente = false;

    try {
      await this.audit(AuditEvent.CONSULTA_ENFERMAGEM_SIGNED, context, { clinicaId, consultaId: id, pacienteId });
    } catch (erro) {
      auditoriaPendente = true;
      this.logger.error(`Auditoria da assinatura da consulta ${id} nao gravada: ${(erro as Error).message}`);
      await this.repo.marcarAuditoriaAssinatura(clinicaId, id, true).catch((e: Error) =>
        this.logger.error(`Pendencia de auditoria da consulta ${id} nao gravada: ${e.message}`),
      );
    }

    // Desfecho das lesões avaliadas (só agora, na assinatura; rascunho nunca muda a lesão).
    try {
      atual = await this.registrarDesfechoLesoes(atual, await this.lesoes.aplicarDesfechos(atual, context), context);
    } catch (erro) {
      this.logger.error(`Desfecho das lesoes da consulta ${id} nao aplicado: ${(erro as Error).message}`);
      atual = await this.repo
        .atualizarDesfechoLesoes(clinicaId, id, StatusDesfechoLesoes.PENDENTE_APLICACAO)
        .then((c) => c ?? { ...atual, desfechoLesoesStatus: StatusDesfechoLesoes.PENDENTE_APLICACAO })
        .catch(() => ({ ...atual, desfechoLesoesStatus: StatusDesfechoLesoes.PENDENTE_APLICACAO }));
    }

    // Cobrança: pacote (só auditoria) ou geração idempotente; falha -> PENDENTE_GERACAO (já gravado na assinatura).
    try {
      if (decisao.incluidaEmPacote) {
        await this.audit(AuditEvent.CONSULTA_COBRANCA_INCLUIDA_EM_PACOTE, context, { clinicaId, consultaId: id, pacienteId });
      } else {
        atual = (await this.tentarGerarCobranca(atual, context)) ?? atual;
      }
    } catch (erro) {
      this.logger.error(`Pos-assinatura (cobranca) da consulta ${id}: ${(erro as Error).message}`);
    }

    const pendencias: PendenciaAssinatura[] = [];
    if (auditoriaPendente) pendencias.push('AUDITORIA');
    if (atual.cobranca?.status === StatusCobrancaConsulta.PENDENTE_GERACAO) pendencias.push('COBRANCA');
    if (atual.desfechoLesoesStatus === StatusDesfechoLesoes.PENDENTE_APLICACAO) pendencias.push('DESFECHO_LESOES');
    return { ...atual, ...(auditoriaPendente ? { auditoriaAssinaturaPendente: true } : {}), pendencias };
  }

  /** Gravação condicional recusada: assinada no meio do caminho ou alterada em outra tela. Sempre 409. */
  private async conflitoDeGravacao(clinicaId: string, id: string): Promise<never> {
    const agora = await this.repo.findById(clinicaId, id);
    if (agora?.status === StatusConsulta.ASSINADA) throw new ConflictException('Consulta ja assinada.');
    throw new ConflictException(MSG_ALTERADA_EM_OUTRA_TELA);
  }

  /**
   * Reaplica EXATAMENTE os desfechos gravados na consulta ASSINADA (mesmo padrão da cobrança pendente). Idempotente:
   * lesão já fechada por esta consulta não muda; fechada por OUTRA consulta não é sobrescrita (conflito auditado e
   * devolvido). Acesso: ENFERMEIRO da clínica (só reaplica o que o autor assinou). Não devolve conteúdo clínico.
   */
  async aplicarDesfechoLesoes(id: string, clinicaIdQuery: string | undefined, context: ConsultaRequestContext): Promise<ResultadoDesfechoLesoesConsulta> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, clinicaIdQuery);
    const consulta = await this.obterOuFalhar(clinicaId, id);
    if (consulta.status !== StatusConsulta.ASSINADA) throw new ConflictException('O desfecho so e aplicado em consulta assinada.');
    const resultado = await this.lesoes.aplicarDesfechos(consulta, context);
    const atualizada = await this.registrarDesfechoLesoes(consulta, resultado, context);
    await this.audit(AuditEvent.CONSULTA_DESFECHO_LESOES_REAPLICADO, context, {
      clinicaId,
      consultaId: id,
      aplicadas: resultado.aplicadas.length,
      jaAplicadas: resultado.jaAplicadas.length,
      conflitos: resultado.conflitos.length,
      falhas: resultado.falhas.length,
    });
    return {
      consultaId: id,
      desfechoLesoesStatus: atualizada.desfechoLesoesStatus,
      aplicadas: resultado.aplicadas,
      jaAplicadas: resultado.jaAplicadas,
      conflitos: resultado.conflitos,
      falhas: resultado.falhas,
    };
  }

  /** Grava APLICADO / PENDENTE_APLICACAO na consulta (só quando há desfecho que fecha lesão). Conflito não é falha. */
  private async registrarDesfechoLesoes(consulta: ConsultaEnfermagem, r: ResultadoDesfechos, context: ConsultaRequestContext): Promise<ConsultaEnfermagem> {
    if (r.aSerAplicadas === 0) return consulta;
    const status = r.falhas.length > 0 ? StatusDesfechoLesoes.PENDENTE_APLICACAO : StatusDesfechoLesoes.APLICADO;
    if (status === StatusDesfechoLesoes.PENDENTE_APLICACAO) {
      await this.audit(AuditEvent.CONSULTA_DESFECHO_LESOES_PENDENTE, context, { clinicaId: consulta.clinicaId, consultaId: consulta.id, falhas: r.falhas.length });
    }
    if (consulta.desfechoLesoesStatus === status) return consulta;
    try {
      return (await this.repo.atualizarDesfechoLesoes(consulta.clinicaId, consulta.id, status)) ?? { ...consulta, desfechoLesoesStatus: status };
    } catch (erro) {
      // Se nem isso gravar, os eventos de auditoria ficam como rastro; a rota de reaplicar continua valendo.
      this.logger.warn(`Situacao do desfecho da consulta ${consulta.id} nao gravada: ${(erro as Error).message}`);
      return { ...consulta, desfechoLesoesStatus: status };
    }
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
      }).catch((e: Error) => this.logger.error(`Auditoria da cobranca pendente da consulta ${consulta.id} nao gravada: ${e.message}`));
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

  async obter(id: string, clinicaIdQuery: string | undefined, context: ConsultaRequestContext): Promise<ConsultaLida & { adendos: AdendoConsulta[] }> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, clinicaIdQuery);
    const consulta = await this.obterOuFalhar(clinicaId, id);
    const adendos = await this.repo.listAdendos(clinicaId, id);
    await this.regravarAuditoriaPendente(consulta, context);
    if (consulta.enfermeiroId !== context.user.sub) {
      await this.audit(AuditEvent.CONSULTA_ENFERMAGEM_VIEWED, context, {
        clinicaId,
        consultaId: id,
        pacienteId: consulta.pacienteId,
        autor: false,
      });
    }
    return { ...(await this.comIntegridade(consulta, context)), adendos };
  }

  async listarPorPaciente(query: ListConsultasQueryDto, context: ConsultaRequestContext): Promise<ConsultaLida[]> {
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
    return Promise.all(consultas.map((c) => this.comIntegridade(c, context)));
  }

  /**
   * Selo de integridade (HMAC-SHA256 com segredo do servidor — NÃO é assinatura digital nem ICP-Brasil): recalcula sobre
   * o conteúdo gravado e compara. FALHA é auditada e mostrada em destaque na tela.
   */
  verificarIntegridade(consulta: ConsultaEnfermagem): IntegridadeConsulta | undefined {
    if (consulta.status !== StatusConsulta.ASSINADA || !consulta.assinatura) return undefined;
    const { coren, dataAssinatura, hash } = consulta.assinatura;
    const esperado = Buffer.from(this.hashAssinatura(consulta, coren, new Date(dataAssinatura)), 'utf8');
    const gravado = Buffer.from(String(hash ?? ''), 'utf8');
    return esperado.length === gravado.length && timingSafeEqual(esperado, gravado) ? 'VALIDA' : 'FALHA';
  }

  private async comIntegridade(consulta: ConsultaEnfermagem, context: ConsultaRequestContext): Promise<ConsultaLida> {
    const integridade = this.verificarIntegridade(consulta);
    if (integridade === 'FALHA') {
      this.logger.error(`Selo de integridade da consulta ${consulta.id} nao confere.`);
      await this.audit(AuditEvent.CONSULTA_INTEGRIDADE_FALHA, context, { clinicaId: consulta.clinicaId, consultaId: consulta.id, pacienteId: consulta.pacienteId });
    }
    return integridade ? { ...consulta, integridade } : consulta;
  }

  /** A auditoria da assinatura ficou pendente: regrava agora e limpa a pendência (sem nunca falhar a leitura). */
  private async regravarAuditoriaPendente(consulta: ConsultaEnfermagem, context: ConsultaRequestContext): Promise<void> {
    if (!consulta.auditoriaAssinaturaPendente || !consulta.assinatura) return;
    try {
      await this.auditLogs.create({
        event: AuditEvent.CONSULTA_ENFERMAGEM_SIGNED,
        userId: consulta.assinatura.enfermeiroId,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { clinicaId: consulta.clinicaId, consultaId: consulta.id, pacienteId: consulta.pacienteId, regravado: true, lidoPor: context.user.sub },
      });
      await this.repo.marcarAuditoriaAssinatura(consulta.clinicaId, consulta.id, false);
    } catch (erro) {
      this.logger.warn(`Auditoria pendente da consulta ${consulta.id} ainda nao regravada: ${(erro as Error).message}`);
    }
  }

  // ---------------- internos ----------------

  /** Monta só as etapas enviadas; os módulos da Avaliação passam pela definição registrada da área. */
  private async montarConteudo(
    dto: ConteudoConsultaDto,
    user: AuthTokenPayload,
    alvo: { clinicaId: string; pacienteId: string; consultaId?: string },
    atual?: ConsultaEnfermagem,
  ): Promise<ConteudoConsulta> {
    const conteudo: ConteudoConsulta = {};
    if (dto.avaliacao) {
      const base = atual?.avaliacao ?? avaliacaoVazia();
      conteudo.avaliacao = {
        dadosSubjetivos: dto.avaliacao.dadosSubjetivos ?? base.dadosSubjetivos,
        dadosObjetivos: dto.avaliacao.dadosObjetivos ?? base.dadosObjetivos,
        modulos: dto.avaliacao.modulos ? await this.validarModulos(dto.avaliacao.modulos, alvo) : base.modulos,
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

  /**
   * Módulos da Avaliação: (1) só os liberados para a classificação do paciente (IU e incontinência anal -> IU);
   * (2) dados validados pelo pacote compartilhado; (3) anexos citados nos diários têm de ser anexos CONFIRMADOS desta
   * consulta (na criação ainda não há anexos).
   */
  private async validarModulos(
    modulos: NonNullable<ConteudoConsultaDto['avaliacao']>['modulos'] & object,
    alvo: { clinicaId: string; pacienteId: string; consultaId?: string },
  ) {
    if (modulos.length > 0) {
      const classificacoes = await this.pacientesService.classificacoesDoPaciente(alvo.clinicaId, alvo.pacienteId);
      for (const m of modulos) {
        if (!classificacaoLiberaModulo(m.area, classificacoes)) {
          throw new BadRequestException(`Modulo de avaliacao ${m.area} nao disponivel para a classificacao deste paciente.`);
        }
      }
    }
    const validados = await this.modulos.validar(modulos);
    // Ferida (5c): regras que dependem das lesões + medidas por foto RECALCULADAS no servidor.
    for (const m of validados) {
      if (m.area === AreaModuloAvaliacao.FERIDA) {
        m.dados = (await this.lesoes.validarModuloDaConsulta(alvo.clinicaId, alvo.pacienteId, m.dados as ModuloFerida)) as Record<string, unknown>;
      }
    }
    const citados = new Set(validados.flatMap((m) => anexosReferenciados(m)));
    if (citados.size > 0) {
      const existentes = alvo.consultaId ? await this.repo.listAnexos(alvo.clinicaId, alvo.consultaId) : [];
      const confirmados = new Map(existentes.filter((a) => a.confirmadoEm != null).map((a) => [a.id, a]));
      for (const idAnexo of citados) {
        if (!confirmados.has(idAnexo)) throw new BadRequestException('Anexo citado no modulo nao pertence a esta consulta.');
      }
      // Foto de medição: imagem enviada para a MESMA lesão.
      const ferida = validados.find((m) => m.area === AreaModuloAvaliacao.FERIDA);
      for (const { anexoId, lesaoId } of anexosDoModuloFerida(ferida?.dados as ModuloFerida | undefined)) {
        const anexo = confirmados.get(anexoId)!;
        if (anexo.lesaoId !== lesaoId || anexo.mimeType === 'application/pdf') {
          throw new BadRequestException('A foto da medicao deve ser uma imagem enviada para a mesma lesao.');
        }
      }
    }
    return validados;
  }

  // ---------------- anexos (diário em papel etc.) ----------------

  /** Envio: só o AUTOR, só em RASCUNHO; PDF/JPG/PNG no limite do módulo de documentos. Chave sem dado pessoal. */
  async criarUploadAnexo(id: string, dto: PresignAnexoConsultaDto, clinicaIdQuery: string | undefined, context: ConsultaRequestContext) {
    const { clinicaId, consulta } = await this.consultaDoAutorEmRascunho(id, clinicaIdQuery, context);
    if (dto.lesaoId) {
      // Foto de ferida (5c): só JPG/PNG, lesão deste paciente e consentimento de imagem vigente.
      if (dto.mimeType === 'application/pdf') throw new BadRequestException('Foto de ferida deve ser JPG ou PNG.');
      await this.lesoes.lesaoDoPaciente(clinicaId, consulta.pacienteId, dto.lesaoId);
      await this.lesoes.assertConsentimentoVigente(clinicaId, consulta.pacienteId, context, { consultaId: id, lesaoId: dto.lesaoId });
    }
    if (dto.tamanho > MAX_DOCUMENT_SIZE_BYTES) {
      throw new BadRequestException(`Arquivo acima do limite de ${Math.round(MAX_DOCUMENT_SIZE_BYTES / 1024 / 1024)}MB.`);
    }
    const hash = dto.hash.toLowerCase();
    const key = `${clinicaId}/consultas/${id}/${randomUUID()}${EXTENSAO_ANEXO[dto.mimeType] ?? ''}`;
    const presigned = await this.storage.createUploadUrl({ key, mimeType: dto.mimeType, tamanho: dto.tamanho, hash });
    const anexo = await this.repo.createAnexo({
      clinicaId,
      consultaId: id,
      pacienteId: consulta.pacienteId,
      mimeType: dto.mimeType,
      tamanho: dto.tamanho,
      hash,
      url: presigned.privateUrl,
      enviadoPor: context.user.sub,
      ...(dto.lesaoId ? { lesaoId: dto.lesaoId } : {}),
      confirmadoEm: null,
    });
    await this.audit(AuditEvent.CONSULTA_ANEXO_UPLOAD_URL_CREATED, context, {
      clinicaId,
      consultaId: id,
      anexoId: anexo.id,
      mimeType: dto.mimeType,
      tamanho: dto.tamanho,
      foto: !!dto.lesaoId,
    });
    return {
      anexo: this.anexoPublico(anexo),
      uploadUrl: presigned.uploadUrl,
      expiresInSeconds: presigned.expiresInSeconds,
      // Headers que o navegador DEVE enviar no PUT (a URL assina os dois), como no módulo de documentos.
      requiredHeaders: { 'Content-Type': dto.mimeType, 'x-amz-meta-sha256': hash },
    };
  }

  /** Confirma que o objeto existe no storage com o tamanho declarado (HeadObject), como no módulo de documentos. */
  async confirmarUploadAnexo(id: string, anexoId: string, clinicaIdQuery: string | undefined, context: ConsultaRequestContext): Promise<AnexoPublico> {
    const { clinicaId, consulta } = await this.consultaDoAutorEmRascunho(id, clinicaIdQuery, context);
    const anexo = await this.repo.findAnexo(clinicaId, id, anexoId);
    if (!anexo) throw new NotFoundException('Anexo nao encontrado.');
    if (anexo.confirmadoEm) return this.anexoPublico(anexo);
    // Consentimento revogado entre o presign e a confirmação: a foto não é confirmada.
    if (anexo.lesaoId) await this.lesoes.assertConsentimentoVigente(clinicaId, consulta.pacienteId, context, { consultaId: id, anexoId });

    let head: { tamanho: number } | undefined;
    try {
      head = await this.storage.headObject(anexo.url);
    } catch (erro) {
      this.logger.warn(`HeadObject falhou para o anexo ${anexo.id}: ${(erro as Error).message}`);
      throw new ServiceUnavailableException('Nao foi possivel verificar o arquivo enviado. Tente novamente.');
    }
    if (!head) throw new UnprocessableEntityException('Arquivo nao encontrado no armazenamento. Envie o arquivo novamente.');
    if (head.tamanho !== anexo.tamanho) {
      throw new UnprocessableEntityException('O tamanho do arquivo enviado difere do declarado. Envie o arquivo novamente.');
    }
    const confirmado = await this.repo.confirmarAnexo(clinicaId, id, anexoId, new Date());
    await this.audit(AuditEvent.CONSULTA_ANEXO_CONFIRMED, context, { clinicaId, consultaId: id, anexoId });
    return this.anexoPublico(confirmado ?? anexo);
  }

  /** Lista: quem lê a consulta (enfermeiros da clínica). Só anexos confirmados. */
  async listarAnexos(id: string, clinicaIdQuery: string | undefined, context: ConsultaRequestContext): Promise<AnexoPublico[]> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, clinicaIdQuery);
    await this.obterOuFalhar(clinicaId, id);
    const anexos = await this.repo.listAnexos(clinicaId, id);
    return anexos.filter((a) => a.confirmadoEm != null).map((a) => this.anexoPublico(a));
  }

  /** URL temporária de leitura: quem lê a consulta. Sempre auditada (marca se quem abriu não é o autor da consulta). */
  async urlAcessoAnexo(id: string, anexoId: string, clinicaIdQuery: string | undefined, context: ConsultaRequestContext) {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, clinicaIdQuery);
    const consulta = await this.obterOuFalhar(clinicaId, id);
    const anexo = await this.repo.findAnexo(clinicaId, id, anexoId);
    if (!anexo || anexo.confirmadoEm == null) throw new NotFoundException('Anexo nao encontrado.');
    const accessUrl = await this.storage.createReadUrl(
      anexo.url,
      DOCUMENT_ACCESS_URL_TTL_SECONDS,
      `anexo-consulta${EXTENSAO_ANEXO[anexo.mimeType] ?? ''}`,
    );
    await this.audit(AuditEvent.CONSULTA_ANEXO_VIEW_URL_CREATED, context, {
      clinicaId,
      consultaId: id,
      anexoId,
      autor: consulta.enfermeiroId === context.user.sub,
    });
    return { accessUrl, mimeType: anexo.mimeType, expiresInSeconds: DOCUMENT_ACCESS_URL_TTL_SECONDS };
  }

  private async consultaDoAutorEmRascunho(id: string, clinicaIdQuery: string | undefined, context: ConsultaRequestContext) {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, clinicaIdQuery);
    const consulta = await this.obterOuFalhar(clinicaId, id);
    this.assertAutor(consulta, context.user);
    if (consulta.status !== StatusConsulta.RASCUNHO) {
      throw new ConflictException('Consulta assinada: nao recebe anexos novos. Use um adendo.');
    }
    return { clinicaId, consulta };
  }

  private anexoPublico(a: AnexoConsulta): AnexoPublico {
    const { url: _privada, ...resto } = a;
    return resto;
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
        // Só entra quando existe (consultas sem módulo Ferida mantêm exatamente o mesmo selo de antes).
        ...(consulta.identificacoesLesoes ? { identificacoesLesoes: consulta.identificacoesLesoes } : {}),
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
  // Chave com valor undefined não existe depois de gravada no Mongo: fica fora do selo (senão a verificação falharia).
  return `{${Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(',')}}`;
}
