import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import {
  AreaModuloAvaliacao,
  AvaliacaoLesao,
  ModuloFerida,
  PontoMedida,
  normalizarModuloFerida,
  pontosMedida,
  validarAvaliacaoContraLesao,
  validarIdentificacaoLesao,
} from '../../../../../../packages/shared/src/consulta';
import { ClassificacaoArea } from '../../../../../../packages/shared/src/paciente';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { ProdutosService } from '../../produtos/application/produtos.service';
import { CONSULTA_REPOSITORY, LESAO_REPOSITORY } from '../consultas.constants';
import { ConsultaEnfermagem, StatusConsulta } from '../domain/consulta-enfermagem.entity';
import { ConsentimentoImagem, IdentificacaoLesao, Lesao } from '../domain/lesao.entity';
import { ConsultaRepository } from './ports/consulta.repository';
import { LesaoRepository } from './ports/lesao.repository';
import { CorrigirLesaoDto, CreateLesaoDto, IdentificacaoLesaoDto, PacienteQueryDto, RegistrarConsentimentoImagemDto } from './dto/lesao.dto';

export interface LesaoRequestContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

export interface EntradaHistoricoLesao {
  consultaId: string;
  assinadaEm: Date;
  enfermeiroId: string;
  avaliacao: AvaliacaoLesao;
  /** Cada medida com o método (MANUAL | FOTO); as de foto são estimativa por imagem. */
  medidas: PontoMedida[];
}

export interface ResultadoDesfechos {
  /** Avaliações com desfecho que fecha lesão (CICATRIZADA / ENCERRADA). */
  aSerAplicadas: number;
  aplicadas: string[];
  /** Já fechadas por esta mesma consulta (reaplicação sem efeito). */
  jaAplicadas: string[];
  /** Fechadas por OUTRA consulta: não sobrescritas. */
  conflitos: string[];
  /** Falha de escrita: a consulta fica PENDENTE_APLICACAO. */
  falhas: string[];
}

export interface HistoricoLesao {
  lesao: Lesao;
  avaliacoes: EntradaHistoricoLesao[];
}

const TENTATIVAS_NUMERO = 5;

/**
 * Lesões do paciente (etapa 5c) e consentimento de imagem.
 * ACESSO (mesma regra da consulta de enfermagem): só ENFERMEIRO da clínica lê (leitura por quem não cadastrou é auditada);
 * cadastrar, corrigir e registrar/revogar consentimento: ENFERMEIRO. ADMIN, SECRETARIA e SUPER_ADMIN não acessam.
 * Status da lesão: só muda pela ASSINATURA de uma consulta (desfecho da avaliação), nunca por rota própria.
 */
@Injectable()
export class LesoesService {
  private readonly logger = new Logger(LesoesService.name);

  constructor(
    @Inject(LESAO_REPOSITORY) private readonly repo: LesaoRepository,
    @Inject(CONSULTA_REPOSITORY) private readonly consultas: ConsultaRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly pacientesService: PacientesService,
    private readonly produtosService: ProdutosService,
  ) {}

  // ---------------- cadastro ----------------

  async criar(dto: CreateLesaoDto, context: LesaoRequestContext): Promise<Lesao> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);
    await this.assertPacienteComFeridas(clinicaId, dto.pacienteId);
    const identificacao = this.identificacao(dto);
    if (dto.dataIdentificacao > hojeIso() || Number.isNaN(Date.parse(`${dto.dataIdentificacao}T00:00:00Z`))) {
      throw new BadRequestException('dataIdentificacao invalida (no futuro ou inexistente).');
    }

    // Número sequencial sem corrida: o índice único (pacienteId, numero) recusa o mesmo número duas vezes (E11000).
    for (let tentativa = 0; tentativa < TENTATIVAS_NUMERO; tentativa += 1) {
      const numero = (await this.repo.ultimoNumero(clinicaId, dto.pacienteId)) + 1;
      try {
        const lesao = await this.repo.create({
          ...identificacao,
          clinicaId,
          pacienteId: dto.pacienteId,
          numero,
          dataIdentificacao: dto.dataIdentificacao,
          criadaPor: context.user.sub,
        });
        await this.audit(AuditEvent.LESAO_CREATED, context, {
          clinicaId,
          pacienteId: dto.pacienteId,
          lesaoId: lesao.id,
          numero,
        });
        return lesao;
      } catch (erro) {
        if ((erro as { code?: number }).code !== 11000) throw erro;
      }
    }
    throw new ConflictException('Muitos cadastros simultaneos de lesao para este paciente. Tente novamente.');
  }

  /** Correção de etiologia/localização: versionada, nunca sobrescreve sem histórico. */
  async corrigir(id: string, dto: CorrigirLesaoDto, context: LesaoRequestContext): Promise<Lesao> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);
    const atual = await this.obterOuFalhar(clinicaId, id);
    const nova = this.identificacao(dto);
    const anterior: IdentificacaoLesao = {
      localizacaoAnatomica: atual.localizacaoAnatomica,
      lado: atual.lado,
      etiologia: atual.etiologia,
      ...(atual.subtipoUmidade ? { subtipoUmidade: atual.subtipoUmidade } : {}),
      ...(atual.etiologiaOutra ? { etiologiaOutra: atual.etiologiaOutra } : {}),
    };
    const campos = (Object.keys({ ...anterior, ...nova }) as Array<keyof IdentificacaoLesao>).filter((k) => anterior[k] !== nova[k]);
    if (campos.length === 0) throw new BadRequestException('Nada mudou na identificacao da lesao.');
    if (dto.versao !== atual.versao) throw new ConflictException('A lesao foi corrigida por outra pessoa. Recarregue e tente de novo.');

    const corrigida = await this.repo.corrigir(clinicaId, id, dto.versao, nova, {
      em: new Date(),
      por: context.user.sub,
      motivo: dto.motivo.trim(),
      anterior,
    });
    if (!corrigida) throw new ConflictException('A lesao foi corrigida por outra pessoa. Recarregue e tente de novo.');
    await this.audit(AuditEvent.LESAO_CORRIGIDA, context, { clinicaId, lesaoId: id, pacienteId: atual.pacienteId, campos, versao: corrigida.versao });
    return corrigida;
  }

  // ---------------- leitura ----------------

  async listar(query: PacienteQueryDto, context: LesaoRequestContext): Promise<Lesao[]> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, query.clinicaId);
    await this.assertPacienteDaClinica(clinicaId, query.pacienteId);
    const lesoes = ordenarLesoes(await this.repo.listByPaciente(clinicaId, query.pacienteId));
    await this.audit(AuditEvent.LESAO_LISTED, context, {
      clinicaId,
      pacienteId: query.pacienteId,
      quantidade: lesoes.length,
      deOutrosEnfermeiros: lesoes.filter((l) => l.criadaPor !== context.user.sub).length,
    });
    return lesoes;
  }

  async obter(id: string, clinicaIdQuery: string | undefined, context: LesaoRequestContext): Promise<Lesao> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, clinicaIdQuery);
    const lesao = await this.obterOuFalhar(clinicaId, id);
    if (lesao.criadaPor !== context.user.sub) {
      await this.audit(AuditEvent.LESAO_VIEWED, context, { clinicaId, lesaoId: id, pacienteId: lesao.pacienteId, autor: false });
    }
    return lesao;
  }

  /**
   * Histórico (somente leitura): lesões do paciente (abertas primeiro) com a linha do tempo das avaliações feitas em
   * consultas ASSINADAS (rascunho não entra) e as medidas de cada uma com o método.
   */
  async historico(query: PacienteQueryDto, context: LesaoRequestContext): Promise<HistoricoLesao[]> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, query.clinicaId);
    await this.assertPacienteDaClinica(clinicaId, query.pacienteId);
    const lesoes = ordenarLesoes(await this.repo.listByPaciente(clinicaId, query.pacienteId));
    const assinadas = (await this.consultas.listByPaciente(clinicaId, query.pacienteId)).filter((c) => c.status === StatusConsulta.ASSINADA);

    const porLesao = new Map<string, EntradaHistoricoLesao[]>(lesoes.map((l) => [l.id, []]));
    for (const c of assinadas) {
      const modulo = c.avaliacao.modulos.find((m) => m.area === AreaModuloAvaliacao.FERIDA);
      for (const av of (modulo?.dados as ModuloFerida | undefined)?.avaliacoes ?? []) {
        porLesao.get(av.lesaoId)?.push({
          consultaId: c.id,
          assinadaEm: c.assinatura?.dataAssinatura ?? c.atualizadoEm,
          enfermeiroId: c.enfermeiroId,
          avaliacao: av,
          medidas: pontosMedida(av),
        });
      }
    }
    const resultado = lesoes.map((lesao) => ({
      lesao,
      avaliacoes: (porLesao.get(lesao.id) ?? []).sort((a, b) => new Date(a.assinadaEm).getTime() - new Date(b.assinadaEm).getTime()),
    }));
    await this.audit(AuditEvent.LESAO_HISTORICO_VIEWED, context, {
      clinicaId,
      pacienteId: query.pacienteId,
      lesoes: lesoes.length,
      consultasAssinadas: assinadas.length,
    });
    return resultado;
  }

  // ---------------- módulo FERIDA da consulta ----------------

  /**
   * Regras do módulo que dependem das lesões (a estrutura já foi validada pelo registro):
   *  - cada lesão avaliada existe, é DESTE paciente e está ABERTA;
   *  - etiologia: LPP exige categoria; adesivo médico exige as duas observações;
   *  - materiais do catálogo existem;
   *  - medidas por foto RECALCULADAS a partir dos pontos (o número do cliente é ignorado).
   */
  async validarModuloDaConsulta(clinicaId: string, pacienteId: string, dados: ModuloFerida): Promise<ModuloFerida> {
    const lesoes = await this.lesoesAvaliadas(clinicaId, pacienteId, dados);
    const erros: string[] = [];
    (dados.avaliacoes ?? []).forEach((av, i) => {
      erros.push(...validarAvaliacaoContraLesao(av, lesoes.get(av.lesaoId)!.etiologia, `avaliacoes[${i}]`));
    });
    if (erros.length > 0) throw new BadRequestException(`Dados invalidos no modulo FERIDA (${erros.join('; ')}).`);

    const codigos = new Set((dados.avaliacoes ?? []).flatMap((av) => (av.materiais ?? []).map((m) => m.produtoCodigo).filter((c): c is number => typeof c === 'number')));
    for (const codigo of codigos) {
      if (!(await this.produtosService.buscarPorCodigo(codigo))) throw new BadRequestException('Produto do catalogo nao encontrado em materiais.');
    }
    try {
      return normalizarModuloFerida(dados);
    } catch (erro) {
      throw new BadRequestException(`Medicao por foto invalida: ${(erro as Error).message}`);
    }
  }

  /** Na assinatura: as lesões avaliadas continuam abertas? (outra consulta pode ter encerrado alguma no meio). */
  async assertLesoesAbertasParaAssinar(consulta: ConsultaEnfermagem): Promise<void> {
    const dados = this.moduloFerida(consulta);
    if (!dados) return;
    try {
      await this.lesoesAvaliadas(consulta.clinicaId, consulta.pacienteId, dados);
    } catch (erro) {
      if (erro instanceof BadRequestException) throw new ConflictException(`${erro.message} Revise o modulo Ferida antes de assinar.`);
      throw erro;
    }
  }

  /**
   * Depois da ASSINATURA: aplica EXATAMENTE o desfecho gravado em cada avaliação na lesão (CICATRIZADA / ENCERRADA com
   * motivo), com o consultaId gravado. EM_ACOMPANHAMENTO não muda nada. Rascunho nunca chega aqui. Idempotente: lesão já
   * fechada POR ESTA consulta = já aplicado (nada muda); fechada por OUTRA consulta = conflito (não sobrescreve, auditado).
   * Sem transação (mesma decisão da cobrança): falha de escrita -> `falhas` (a consulta fica PENDENTE_APLICACAO).
   */
  async aplicarDesfechos(consulta: ConsultaEnfermagem, context: LesaoRequestContext): Promise<ResultadoDesfechos> {
    const resultado: ResultadoDesfechos = { aSerAplicadas: 0, aplicadas: [], jaAplicadas: [], conflitos: [], falhas: [] };
    const dados = this.moduloFerida(consulta);
    for (const av of dados?.avaliacoes ?? []) {
      const situacao = av.desfecho?.situacao;
      if (situacao !== 'CICATRIZADA' && situacao !== 'ENCERRADA') continue;
      resultado.aSerAplicadas += 1;
      const meta = { clinicaId: consulta.clinicaId, consultaId: consulta.id, lesaoId: av.lesaoId, pacienteId: consulta.pacienteId, para: situacao };
      try {
        const alterada = await this.repo.alterarStatus(consulta.clinicaId, av.lesaoId, {
          status: situacao,
          ...(situacao === 'ENCERRADA' ? { motivoEncerramento: av.desfecho?.motivo?.trim() } : {}),
          consultaId: consulta.id,
          por: context.user.sub,
          em: consulta.assinatura?.dataAssinatura ?? new Date(),
        });
        if (alterada) {
          resultado.aplicadas.push(av.lesaoId);
          await this.audit(AuditEvent.LESAO_STATUS_ALTERADO, context, { ...meta, de: 'ABERTA' });
          continue;
        }
        // Não estava ABERTA: já aplicado por esta consulta (idempotência) ou fechada por outra (conflito).
        const atual = await this.repo.findById(consulta.clinicaId, av.lesaoId);
        if (atual && atual.statusConsultaId === consulta.id) {
          resultado.jaAplicadas.push(av.lesaoId);
        } else {
          resultado.conflitos.push(av.lesaoId);
          await this.audit(AuditEvent.LESAO_DESFECHO_CONFLITO, context, {
            ...meta,
            statusAtual: atual?.status ?? null,
            fechadaPorConsultaId: atual?.statusConsultaId ?? null,
          });
        }
      } catch (erro) {
        this.logger.warn(`Desfecho da lesao ${av.lesaoId} (consulta ${consulta.id}) nao aplicado: ${(erro as Error).message}`);
        resultado.falhas.push(av.lesaoId);
        await this.audit(AuditEvent.LESAO_STATUS_NAO_APLICADO, context, meta);
      }
    }
    return resultado;
  }

  /** A lesão é deste paciente na clínica? (fotos da consulta são vinculadas a uma lesão) */
  async lesaoDoPaciente(clinicaId: string, pacienteId: string, lesaoId: string): Promise<Lesao> {
    const lesao = await this.repo.findById(clinicaId, lesaoId);
    if (!lesao || lesao.pacienteId !== pacienteId) throw new BadRequestException('Lesao nao encontrada para este paciente.');
    return lesao;
  }

  // ---------------- consentimento de imagem ----------------

  async consentimentos(query: PacienteQueryDto, context: LesaoRequestContext): Promise<{ vigente: ConsentimentoImagem | null; historico: ConsentimentoImagem[] }> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, query.clinicaId);
    await this.assertPacienteDaClinica(clinicaId, query.pacienteId);
    const historico = await this.repo.listConsentimentos(clinicaId, query.pacienteId);
    return { vigente: historico.find((c) => c.revogadoEm == null) ?? null, historico };
  }

  async registrarConsentimento(dto: RegistrarConsentimentoImagemDto, context: LesaoRequestContext): Promise<ConsentimentoImagem> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, dto.clinicaId);
    await this.assertPacienteDaClinica(clinicaId, dto.pacienteId);
    const obtidoEm = new Date(dto.obtidoEm);
    if (Number.isNaN(obtidoEm.getTime()) || obtidoEm.getTime() > Date.now() + 60_000) {
      throw new BadRequestException('obtidoEm invalido (no futuro).');
    }
    if (await this.repo.consentimentoVigente(clinicaId, dto.pacienteId)) {
      throw new ConflictException('Ja existe consentimento de imagem vigente para este paciente.');
    }
    try {
      const c = await this.repo.createConsentimento({ clinicaId, pacienteId: dto.pacienteId, obtidoEm, registradoPor: context.user.sub });
      await this.audit(AuditEvent.CONSENTIMENTO_IMAGEM_REGISTRADO, context, { clinicaId, pacienteId: dto.pacienteId, consentimentoId: c.id });
      return c;
    } catch (erro) {
      if ((erro as { code?: number }).code === 11000) throw new ConflictException('Ja existe consentimento de imagem vigente para este paciente.');
      throw erro;
    }
  }

  /** Revogar bloqueia fotos NOVAS; as existentes continuam legíveis (nada é apagado). */
  async revogarConsentimento(id: string, clinicaIdQuery: string | undefined, context: LesaoRequestContext): Promise<ConsentimentoImagem> {
    this.assertEnfermeiro(context.user);
    const clinicaId = resolveTenantClinicaId(context.user, clinicaIdQuery);
    const revogado = await this.repo.revogarConsentimento(clinicaId, id, context.user.sub, new Date());
    if (!revogado) throw new NotFoundException('Consentimento vigente nao encontrado.');
    await this.audit(AuditEvent.CONSENTIMENTO_IMAGEM_REVOGADO, context, { clinicaId, pacienteId: revogado.pacienteId, consentimentoId: id });
    return revogado;
  }

  /** Foto nova de ferida exige consentimento vigente. Recusa auditada (sem dado clínico). */
  async assertConsentimentoVigente(clinicaId: string, pacienteId: string, context: LesaoRequestContext, meta: Record<string, unknown>): Promise<void> {
    if (await this.repo.consentimentoVigente(clinicaId, pacienteId)) return;
    await this.audit(AuditEvent.CONSULTA_FOTO_RECUSADA_SEM_CONSENTIMENTO, context, { clinicaId, pacienteId, ...meta });
    throw new UnprocessableEntityException('Sem consentimento de imagem vigente para este paciente: registre o consentimento antes de enviar fotos.');
  }

  // ---------------- internos ----------------

  private moduloFerida(consulta: ConsultaEnfermagem): ModuloFerida | undefined {
    return consulta.avaliacao.modulos.find((m) => m.area === AreaModuloAvaliacao.FERIDA)?.dados as ModuloFerida | undefined;
  }

  private async lesoesAvaliadas(clinicaId: string, pacienteId: string, dados: ModuloFerida): Promise<Map<string, Lesao>> {
    const mapa = new Map<string, Lesao>();
    for (const av of dados.avaliacoes ?? []) {
      const lesao = await this.repo.findById(clinicaId, av.lesaoId);
      if (!lesao || lesao.pacienteId !== pacienteId) throw new BadRequestException('Lesao avaliada nao encontrada para este paciente.');
      if (lesao.status !== 'ABERTA') throw new BadRequestException(`A lesao ${lesao.numero} nao esta aberta.`);
      mapa.set(av.lesaoId, lesao);
    }
    return mapa;
  }

  private identificacao(dto: IdentificacaoLesaoDto): IdentificacaoLesao {
    const id: IdentificacaoLesao = {
      localizacaoAnatomica: dto.localizacaoAnatomica?.trim(),
      lado: dto.lado,
      etiologia: dto.etiologia,
      ...(dto.subtipoUmidade !== undefined ? { subtipoUmidade: dto.subtipoUmidade } : {}),
      ...(dto.etiologiaOutra !== undefined ? { etiologiaOutra: dto.etiologiaOutra.trim() } : {}),
    };
    const erros = validarIdentificacaoLesao(id);
    if (erros.length > 0) throw new BadRequestException(`Dados invalidos da lesao (${erros.join('; ')}).`);
    return id;
  }

  private async assertPacienteDaClinica(clinicaId: string, pacienteId: string): Promise<void> {
    if ((await this.pacientesService.classificacoesDoPaciente(clinicaId, pacienteId)) === null) {
      throw new NotFoundException('Paciente nao encontrado.');
    }
  }

  /** Cadastrar lesão: paciente da clínica E com classificação FA (feridas), a mesma que libera o módulo. */
  private async assertPacienteComFeridas(clinicaId: string, pacienteId: string): Promise<void> {
    const classificacoes = await this.pacientesService.classificacoesDoPaciente(clinicaId, pacienteId);
    if (classificacoes === null) throw new NotFoundException('Paciente nao encontrado.');
    if (!classificacoes.includes(ClassificacaoArea.FA)) {
      throw new BadRequestException('Lesoes so podem ser cadastradas para paciente com classificacao FA (feridas).');
    }
  }

  private async obterOuFalhar(clinicaId: string, id: string): Promise<Lesao> {
    const lesao = await this.repo.findById(clinicaId, id);
    if (!lesao) throw new NotFoundException('Lesao nao encontrada.');
    return lesao;
  }

  /** Conteúdo clínico: só ENFERMEIRO (SUPER_ADMIN passa no RolesGuard, mas não lê conteúdo clínico). */
  private assertEnfermeiro(user: AuthTokenPayload): void {
    if (user.papel !== Papel.ENFERMEIRO) throw new ForbiddenException('Somente enfermeiros acessam as lesoes do paciente.');
  }

  private async audit(event: AuditEvent, context: LesaoRequestContext, metadata: Record<string, unknown>): Promise<void> {
    await this.auditLogs.create({ event, userId: context.user.sub, email: context.user.email, ip: context.ip, userAgent: context.userAgent, metadata });
  }
}

/** Abertas primeiro; dentro de cada grupo, pelo número. */
function ordenarLesoes(lesoes: Lesao[]): Lesao[] {
  return [...lesoes].sort((a, b) => Number(a.status !== 'ABERTA') - Number(b.status !== 'ABERTA') || a.numero - b.numero);
}

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}
