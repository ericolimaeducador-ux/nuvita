import 'reflect-metadata';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';
import { validate } from 'class-validator';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { AppConfigService } from '../../../common/security/config.service';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { UserRepository } from '../../auth/application/ports/user.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CobrancasService } from '../../cobrancas/application/cobrancas.service';
import { CobrancaRepository } from '../../cobrancas/application/ports/cobranca.repository';
import { FinanceiroConfigRepository } from '../../cobrancas/application/ports/financeiro-config.repository';
import { Cobranca } from '../../cobrancas/domain/cobranca.entity';
import { NotificacoesService } from '../../notificacoes/application/notificacoes.service';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import {
  AdendoConsulta,
  AnexoConsulta,
  AreaModuloAvaliacao,
  ConsultaEnfermagem,
  OrigemDiagnostico,
  PadraoImplementacao,
  StatusCobrancaConsulta,
  StatusConsulta,
  StatusDesfechoLesoes,
} from '../domain/consulta-enfermagem.entity';
import { ModulosAvaliacaoRegistry } from '../domain/modulos-avaliacao.registry';
import {
  VALIDADORES_MODULO,
  alertasModuloIU,
  alertasModuloIncontinenciaAnal,
  modulosDisponiveis,
  validarModuloIU,
  validarModuloIncontinenciaAnal,
} from '../../../../../../packages/shared/src/consulta';
import { ClassificacaoArea } from '../../../../../../packages/shared/src/paciente';
import { MAX_DOCUMENT_SIZE_BYTES } from '../../documentos/documentos.constants';
import { ConsultaMongoRepository } from '../infrastructure/mongo/consulta-mongo.repository';
import { ConsultasController } from '../presentation/consultas.controller';
import { ConsultaRequestContext, ConsultasService } from './consultas.service';
import { ConsultaRepository } from './ports/consulta.repository';
import { LesaoRepository } from './ports/lesao.repository';
import { LesoesService } from './lesoes.service';
import { CorrigirLesaoDto, CreateLesaoDto } from './dto/lesao.dto';
import { ConsentimentosImagemController, LesoesController } from '../presentation/lesoes.controller';
import { LesaoMongoRepository } from '../infrastructure/mongo/lesao-mongo.repository';
import { ConsentimentoImagem, Lesao } from '../domain/lesao.entity';
import { ProdutosService } from '../../produtos/application/produtos.service';
import { AssinarConsultaDto, CreateAdendoConsultaDto, CreateConsultaDto, DiagnosticoDto, PresignAnexoConsultaDto, UpdateConsultaDto } from './dto/consulta.dto';

const PACIENTE = '65f000000000000000000001';
const CLINICA = 'clinica-1';

function usuario(papel: Papel, sub = 'enf-autor', clinicaId: string = CLINICA): AuthTokenPayload {
  return { sub, email: `${sub}@nuvita.test`, papel, clinicaId, jti: 'jti', typ: 'access' as const };
}
const ctx = (user: AuthTokenPayload): ConsultaRequestContext => ({ ip: '127.0.0.1', userAgent: 'jest', user });
const AUTOR = ctx(usuario(Papel.ENFERMEIRO));
const COLEGA = ctx(usuario(Papel.ENFERMEIRO, 'enf-colega'));

/** Repositório de consultas em memória com as MESMAS condições dos updates do Mongo (trava pós-assinatura). */
function consultasEmMemoria() {
  const consultas: ConsultaEnfermagem[] = [];
  const adendos: AdendoConsulta[] = [];
  const anexos: AnexoConsulta[] = [];
  let seq = 0;
  const repo: ConsultaRepository & { forcarCorridaAdendo?: number; aoAssinar?: () => Promise<void> } = {
    async create(data) {
      const c = { ...data, id: `c${++seq}`, versao: 1, criadoEm: new Date(), atualizadoEm: new Date() } as ConsultaEnfermagem;
      consultas.push(c);
      return { ...c };
    },
    async findById(clinicaId, id) {
      const c = consultas.find((x) => x.id === id && x.clinicaId === clinicaId);
      return c ? { ...c } : null;
    },
    async listByPaciente(clinicaId, pacienteId) {
      return consultas.filter((c) => c.clinicaId === clinicaId && c.pacienteId === pacienteId).map((c) => ({ ...c }));
    },
    async updateRascunho(clinicaId, id, autorId, versao, conteudo) {
      const c = consultas.find((x) => x.id === id && x.clinicaId === clinicaId && x.enfermeiroId === autorId && x.status === StatusConsulta.RASCUNHO && x.versao === versao);
      if (!c) return null;
      Object.assign(c, conteudo, { versao: versao + 1 });
      return { ...c };
    },
    async marcarAuditoriaAssinatura(clinicaId, id, pendente) {
      const c = consultas.find((x) => x.id === id && x.clinicaId === clinicaId && x.status === StatusConsulta.ASSINADA);
      if (!c) return;
      if (pendente) c.auditoriaAssinaturaPendente = true;
      else delete c.auditoriaAssinaturaPendente;
    },
    async assinar(clinicaId, id, autorId, versao, assinatura, cobranca, identificacoesLesoes) {
      // R1: simula outra tela salvando ENTRE a leitura e a gravação condicional da assinatura.
      if (repo.aoAssinar) { const f = repo.aoAssinar; repo.aoAssinar = undefined; await f(); }
      const c = consultas.find((x) => x.id === id && x.clinicaId === clinicaId && x.enfermeiroId === autorId && x.status === StatusConsulta.RASCUNHO && x.versao === versao);
      if (!c) return null;
      Object.assign(c, { status: StatusConsulta.ASSINADA, assinatura, cobranca, ...(identificacoesLesoes ? { identificacoesLesoes } : {}) });
      return { ...c };
    },
    async atualizarCobranca(clinicaId, id, cobranca) {
      const c = consultas.find((x) => x.id === id && x.clinicaId === clinicaId && x.status === StatusConsulta.ASSINADA);
      if (!c) return null;
      c.cobranca = cobranca;
      return { ...c };
    },
    async atualizarDesfechoLesoes(clinicaId, id, status) {
      const c = consultas.find((x) => x.id === id && x.clinicaId === clinicaId && x.status === StatusConsulta.ASSINADA);
      if (!c) return null;
      c.desfechoLesoesStatus = status;
      return { ...c };
    },
    async listAdendos(clinicaId, consultaId) {
      return adendos.filter((a) => a.clinicaId === clinicaId && a.consultaId === consultaId).sort((a, b) => a.numero - b.numero);
    },
    async ultimoNumeroAdendo(clinicaId, consultaId) {
      // Simula uma leitura "atrasada" (corrida): devolve um número já usado nas primeiras N chamadas.
      if (repo.forcarCorridaAdendo && repo.forcarCorridaAdendo-- > 0) return 0;
      return Math.max(0, ...adendos.filter((a) => a.clinicaId === clinicaId && a.consultaId === consultaId).map((a) => a.numero));
    },
    async createAnexo(data) {
      const a = { ...data, id: `65f0000000000000000a${String(anexos.length + 1).padStart(4, '0')}`, criadoEm: new Date() } as AnexoConsulta;
      anexos.push(a);
      return { ...a };
    },
    async findAnexo(clinicaId, consultaId, anexoId) {
      const a = anexos.find((x) => x.id === anexoId && x.clinicaId === clinicaId && x.consultaId === consultaId);
      return a ? { ...a } : null;
    },
    async listAnexos(clinicaId, consultaId) {
      return anexos.filter((x) => x.clinicaId === clinicaId && x.consultaId === consultaId).map((x) => ({ ...x }));
    },
    async confirmarAnexo(clinicaId, consultaId, anexoId, confirmadoEm) {
      const a = anexos.find((x) => x.id === anexoId && x.clinicaId === clinicaId && x.consultaId === consultaId);
      if (!a) return null;
      a.confirmadoEm = confirmadoEm;
      return { ...a };
    },
    async createAdendo(data) {
      if (adendos.some((a) => a.consultaId === data.consultaId && a.numero === data.numero)) throw Object.assign(new Error('dup'), { code: 11000 });
      const a = { ...data, id: `a${adendos.length + 1}`, criadoEm: new Date() };
      adendos.push(a);
      return a;
    },
  };
  return { repo, consultas, adendos, anexos };
}

/** Lesões e consentimentos em memória com as MESMAS condições do Mongo (status só de ABERTA; versão; índice único). */
function lesoesEmMemoria() {
  const lesoes: Lesao[] = [];
  const consentimentos: ConsentimentoImagem[] = [];
  let seq = 0;
  const repo: LesaoRepository & { forcarCorridaNumero?: number; falharAlterarStatus?: number } = {
    async create(data) {
      if (lesoes.some((l) => l.pacienteId === data.pacienteId && l.numero === data.numero)) throw Object.assign(new Error('dup'), { code: 11000 });
      const l = { ...data, id: `65f00000000000000000b${String(++seq).padStart(3, '0')}`, status: 'ABERTA', correcoes: [], versao: 1, criadaEm: new Date(), atualizadaEm: new Date() } as Lesao;
      lesoes.push(l);
      return { ...l };
    },
    async ultimoNumero(clinicaId, pacienteId) {
      if (repo.forcarCorridaNumero && repo.forcarCorridaNumero-- > 0) return 0;
      return Math.max(0, ...lesoes.filter((l) => l.clinicaId === clinicaId && l.pacienteId === pacienteId).map((l) => l.numero));
    },
    async findById(clinicaId, id) {
      const l = lesoes.find((x) => x.id === id && x.clinicaId === clinicaId);
      return l ? { ...l } : null;
    },
    async listByPaciente(clinicaId, pacienteId) {
      return lesoes.filter((l) => l.clinicaId === clinicaId && l.pacienteId === pacienteId).map((l) => ({ ...l }));
    },
    async corrigir(clinicaId, id, versao, identificacao, correcao) {
      const l = lesoes.find((x) => x.id === id && x.clinicaId === clinicaId && x.versao === versao);
      if (!l) return null;
      delete l.subtipoUmidade;
      delete l.etiologiaOutra;
      Object.assign(l, identificacao, { versao: l.versao + 1, correcoes: [...l.correcoes, correcao] });
      return { ...l };
    },
    async alterarStatus(clinicaId, id, m) {
      if (repo.falharAlterarStatus && repo.falharAlterarStatus-- > 0) throw new Error('mongo indisponivel');
      const l = lesoes.find((x) => x.id === id && x.clinicaId === clinicaId && x.status === 'ABERTA');
      if (!l) return null;
      Object.assign(l, { status: m.status, motivoEncerramento: m.motivoEncerramento, statusConsultaId: m.consultaId, statusAlteradoPor: m.por, statusAlteradoEm: m.em });
      return { ...l };
    },
    async createConsentimento(data) {
      if (consentimentos.some((c) => c.pacienteId === data.pacienteId && c.revogadoEm == null)) throw Object.assign(new Error('dup'), { code: 11000 });
      const c = { ...data, id: `65f0000000000000000c${String(consentimentos.length + 1).padStart(4, '0')}`, revogadoEm: null, revogadoPor: null, criadoEm: new Date() };
      consentimentos.push(c);
      return { ...c };
    },
    async consentimentoVigente(clinicaId, pacienteId) {
      return consentimentos.find((c) => c.clinicaId === clinicaId && c.pacienteId === pacienteId && c.revogadoEm == null) ?? null;
    },
    async listConsentimentos(clinicaId, pacienteId) {
      return consentimentos.filter((c) => c.clinicaId === clinicaId && c.pacienteId === pacienteId).reverse();
    },
    async revogarConsentimento(clinicaId, id, por, em) {
      const c = consentimentos.find((x) => x.id === id && x.clinicaId === clinicaId && x.revogadoEm == null);
      if (!c) return null;
      Object.assign(c, { revogadoEm: em, revogadoPor: por });
      return { ...c };
    },
  };
  return { repo, lesoes, consentimentos };
}

/** Cobranças em memória com o índice único parcial de consultaId. */
function cobrancasEmMemoria() {
  const cobrancas: Cobranca[] = [];
  const repo = {
    falharCreate: 0,
    async create(data: Omit<Cobranca, 'id' | 'criadoEm' | 'atualizadoEm'>) {
      if (repo.falharCreate > 0) { repo.falharCreate -= 1; throw new Error('mongo indisponivel'); }
      if (data.consultaId && cobrancas.some((c) => c.consultaId === data.consultaId)) throw Object.assign(new Error('dup'), { code: 11000 });
      const c = { ...data, id: `cob${cobrancas.length + 1}`, criadoEm: new Date(), atualizadoEm: new Date() } as Cobranca;
      cobrancas.push(c);
      return c;
    },
    async findByConsultaId(clinicaId: string, consultaId: string) {
      return cobrancas.find((c) => c.clinicaId === clinicaId && c.consultaId === consultaId) ?? null;
    },
  };
  return { repo, cobrancas };
}

function montar(opts: { coren?: string | null; valorPadrao?: number; modulos?: ModulosAvaliacaoRegistry; pacienteExiste?: boolean; classificacoes?: string[]; storage?: Record<string, jest.Mock> } = {}) {
  const c = consultasEmMemoria();
  const cob = cobrancasEmMemoria();
  const auditCreate = jest.fn().mockResolvedValue(undefined);
  const pacientes = {
    resumoPorIds: jest.fn().mockImplementation((clinicaId: string, ids: string[]) =>
      Promise.resolve(opts.pacienteExiste === false || clinicaId !== CLINICA ? new Map() : new Map(ids.map((id) => [id, { nome: 'Maria' }])))),
    classificacoesDoPaciente: jest.fn().mockImplementation((clinicaId: string) => Promise.resolve(clinicaId === CLINICA ? opts.classificacoes ?? ['IU'] : null)),
  };
  const configRepo = {
    findByClinica: jest.fn().mockResolvedValue(opts.valorPadrao !== undefined ? { clinicaId: CLINICA, valorConsultaCentavos: opts.valorPadrao } : null),
  };
  const cobrancasService = new CobrancasService(
    cob.repo as unknown as CobrancaRepository,
    configRepo as unknown as FinanceiroConfigRepository,
    { create: auditCreate } as unknown as AuditLogRepository,
    pacientes as unknown as PacientesService,
    {} as NotificacoesService,
  );
  const users = { findById: jest.fn().mockResolvedValue(opts.coren === null ? { coren: '' } : { coren: opts.coren ?? 'COREN-SP 123' }) };
  const les = lesoesEmMemoria();
  const produtos = { buscarPorCodigo: jest.fn().mockImplementation((codigo: number) => Promise.resolve(codigo === 101 ? { codigo: 101 } : null)) };
  const lesoesService = new LesoesService(
    les.repo,
    c.repo,
    { create: auditCreate } as unknown as AuditLogRepository,
    pacientes as unknown as PacientesService,
    produtos as unknown as ProdutosService,
  );
  const service = new ConsultasService(
    c.repo,
    { create: auditCreate } as unknown as AuditLogRepository,
    users as unknown as UserRepository,
    { getConfig: () => ({ prontuarioSignatureSecret: 'segredo-de-teste' }) } as unknown as AppConfigService,
    pacientes as unknown as PacientesService,
    cobrancasService,
    opts.modulos ?? new ModulosAvaliacaoRegistry([]),
    (opts.storage ?? storageFake()) as never,
    lesoesService,
  );
  const eventos = () => auditCreate.mock.calls.map((x) => x[0].event);
  return { service, lesoesService, les, c, cob, auditCreate, eventos };
}

/** Salva/assina com a versão GRAVADA (o que a tela faria depois de ler a consulta). */
type Montado = { service: ConsultasService; c: { consultas: ConsultaEnfermagem[] } };
const versaoDe = (m: Montado, id: string) => m.c.consultas.find((x) => x.id === id)?.versao ?? 1;
function salvarAtual(m: Montado, id: string, dto: object, quem: ConsultaRequestContext) {
  return m.service.atualizarRascunho(id, { ...dto, versao: versaoDe(m, id) } as UpdateConsultaDto, quem);
}
function assinarAtual(m: Montado, id: string, dto: Pick<AssinarConsultaDto, 'cobranca'>, clinicaId: string | undefined, quem: ConsultaRequestContext) {
  return m.service.assinar(id, { ...dto, versao: versaoDe(m, id) } as AssinarConsultaDto, clinicaId, quem);
}

function storageFake() {
  return {
    createUploadUrl: jest.fn().mockImplementation(({ key }: { key: string }) => Promise.resolve({ uploadUrl: `https://r2/put/${key}`, privateUrl: `s3://bucket/${key}`, expiresInSeconds: 600 })),
    headObject: jest.fn().mockResolvedValue({ tamanho: 1234, mimeType: 'image/png' }),
    createReadUrl: jest.fn().mockResolvedValue('https://r2/get/assinada'),
  };
}

const dtoBase = (over: Partial<CreateConsultaDto> = {}): CreateConsultaDto => ({
  pacienteId: PACIENTE,
  avaliacao: { dadosSubjetivos: 'relato sigiloso do paciente', dadosObjetivos: 'exame' },
  diagnosticos: [{ texto: 'texto livre do enfermeiro', origem: OrigemDiagnostico.MANUAL }],
  ...over,
});

async function criarEAssinar(m: ReturnType<typeof montar>, cobranca: { incluidaEmPacote: boolean; valorCentavos?: number }) {
  const consulta = await m.service.criar(dtoBase(), AUTOR);
  const assinada = await assinarAtual(m, consulta.id, { cobranca }, undefined, AUTOR);
  return { consulta, assinada };
}

describe('ConsultasService — criação, rascunho e trava pós-assinatura', () => {
  it('cria RASCUNHO com a clínica do token, o autor e as etapas vazias completadas; audita sem conteúdo clínico', async () => {
    const m = montar();
    const c = await m.service.criar(dtoBase(), AUTOR);

    expect(c).toMatchObject({ clinicaId: CLINICA, enfermeiroId: 'enf-autor', status: StatusConsulta.RASCUNHO });
    expect(c.avaliacao.modulos).toEqual([]);
    expect(c.planejamento.prescricaoEnfermagem).toEqual([]);
    expect(c.implementacao.registros).toEqual([]);
    const chamada = m.auditCreate.mock.calls[0][0];
    expect(chamada.event).toBe(AuditEvent.CONSULTA_ENFERMAGEM_CREATED);
    expect(JSON.stringify(chamada)).not.toMatch(/sigiloso|texto livre/);
  });

  it('editar rascunho substitui só as etapas enviadas; registros de implementação levam o autor', async () => {
    const m = montar();
    const c = await m.service.criar(dtoBase(), AUTOR);
    const r = await salvarAtual(m, 
      c.id,
      { evolucao: { texto: 'melhora' }, implementacao: { registros: [{ padrao: PadraoImplementacao.AUTONOMO, descricao: 'curativo' }] } },
      AUTOR,
    );
    expect(r.evolucao.texto).toBe('melhora');
    expect(r.avaliacao.dadosSubjetivos).toBe('relato sigiloso do paciente');
    expect(r.implementacao.registros[0]).toMatchObject({ padrao: 'AUTONOMO', registradoPor: 'enf-autor' });
    expect(r.implementacao.registros[0].registradoEm).toBeInstanceOf(Date);
  });

  it('TRAVA: depois de assinada, editar dá 409 e o conteúdo não muda', async () => {
    const m = montar();
    const { consulta } = await criarEAssinar(m, { incluidaEmPacote: true });

    await expect(salvarAtual(m, consulta.id, { evolucao: { texto: 'mudou' } }, AUTOR)).rejects.toBeInstanceOf(ConflictException);
    expect(m.c.consultas[0].evolucao.texto).toBe('');
    expect(m.c.consultas[0].assinatura?.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('assinatura exige COREN no perfil (422) e é do autor; assinar 2x dá 409', async () => {
    const semCoren = montar({ coren: null });
    const c1 = await semCoren.service.criar(dtoBase(), AUTOR);
    await expect(assinarAtual(semCoren, c1.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR)).rejects.toBeInstanceOf(UnprocessableEntityException);

    const m = montar();
    const { consulta } = await criarEAssinar(m, { incluidaEmPacote: true });
    await expect(assinarAtual(m, consulta.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ConsultasService — cobrança na assinatura ("assina primeiro, cobra depois")', () => {
  it('sem pacote: cria a cobrança com o valor PADRÃO da clínica e vincula consultaId -> GERADA', async () => {
    const m = montar({ valorPadrao: 31000 });
    const { assinada, consulta } = await criarEAssinar(m, { incluidaEmPacote: false });

    expect(m.cob.cobrancas).toHaveLength(1);
    expect(m.cob.cobrancas[0]).toMatchObject({ consultaId: consulta.id, valorCentavos: 31000, pacienteId: PACIENTE, clinicaId: CLINICA, tipo: 'consulta_enfermagem', descricao: 'Consulta de enfermagem' });
    expect(assinada.cobranca).toMatchObject({ incluidaEmPacote: false, valorCentavos: 31000, status: StatusCobrancaConsulta.GERADA, cobrancaId: 'cob1' });
    expect(m.eventos()).toEqual(expect.arrayContaining([AuditEvent.CONSULTA_ENFERMAGEM_SIGNED, AuditEvent.CONSULTA_COBRANCA_GERADA]));
  });

  it('sem configuração gravada usa o padrão do sistema (R$ 220,00 = 22000)', async () => {
    const m = montar();
    await criarEAssinar(m, { incluidaEmPacote: false });
    expect(m.cob.cobrancas[0].valorCentavos).toBe(22000);
  });

  it('valor custom (centavos) enviado na assinatura é o usado', async () => {
    const m = montar({ valorPadrao: 31000 });
    const { assinada } = await criarEAssinar(m, { incluidaEmPacote: false, valorCentavos: 15050 });
    expect(m.cob.cobrancas[0].valorCentavos).toBe(15050);
    expect(assinada.cobranca?.valorCentavos).toBe(15050);
  });

  it('incluída em pacote: NÃO cria cobrança e audita o evento', async () => {
    const m = montar();
    const { assinada } = await criarEAssinar(m, { incluidaEmPacote: true });
    expect(m.cob.cobrancas).toHaveLength(0);
    expect(assinada.cobranca).toEqual({ incluidaEmPacote: true, status: StatusCobrancaConsulta.INCLUIDA_EM_PACOTE });
    expect(m.eventos()).toContain(AuditEvent.CONSULTA_COBRANCA_INCLUIDA_EM_PACOTE);
  });

  it('FALHA simulada da cobrança: a consulta continua ASSINADA com PENDENTE_GERACAO (auditado); gerar depois -> GERADA com o MESMO valor', async () => {
    const m = montar();
    m.cob.repo.falharCreate = 1;
    const { assinada, consulta } = await criarEAssinar(m, { incluidaEmPacote: false, valorCentavos: 18000 });

    expect(assinada.status).toBe(StatusConsulta.ASSINADA);
    expect(assinada.cobranca).toMatchObject({ status: StatusCobrancaConsulta.PENDENTE_GERACAO, valorCentavos: 18000 });
    expect(m.cob.cobrancas).toHaveLength(0);
    expect(m.eventos()).toContain(AuditEvent.CONSULTA_COBRANCA_PENDENTE);

    const r = await m.service.gerarCobrancaPendente(consulta.id, undefined, AUTOR);
    expect(r.cobranca).toMatchObject({ status: StatusCobrancaConsulta.GERADA, valorCentavos: 18000, cobrancaId: 'cob1' });
    expect(m.cob.cobrancas).toHaveLength(1);
    expect(m.cob.cobrancas[0].valorCentavos).toBe(18000);
  });

  it('IDEMPOTÊNCIA: gerar 2x (e gerar depois de já gerada) não duplica; ADMIN também pode gerar', async () => {
    const m = montar();
    m.cob.repo.falharCreate = 1;
    const { consulta } = await criarEAssinar(m, { incluidaEmPacote: false });

    await m.service.gerarCobrancaPendente(consulta.id, undefined, ctx(usuario(Papel.ADMIN, 'adm')));
    await m.service.gerarCobrancaPendente(consulta.id, undefined, AUTOR);
    expect(m.cob.cobrancas).toHaveLength(1);
  });

  it('IDEMPOTÊNCIA no módulo de cobranças: corrida que bate no índice único devolve a existente', async () => {
    const m = montar();
    const { consulta } = await criarEAssinar(m, { incluidaEmPacote: false });
    // Simula a consulta voltar a PENDENTE_GERACAO (ex.: falha ao gravar o status depois de criar a cobrança).
    m.c.consultas[0].cobranca = { incluidaEmPacote: false, valorCentavos: 22000, status: StatusCobrancaConsulta.PENDENTE_GERACAO };

    const r = await m.service.gerarCobrancaPendente(consulta.id, undefined, AUTOR);
    expect(m.cob.cobrancas).toHaveLength(1);
    expect(r.cobranca.cobrancaId).toBe('cob1');
  });

  it('gerar: enfermeiro NÃO autor, SECRETARIA e consulta em rascunho são recusados', async () => {
    const m = montar();
    const rascunho = await m.service.criar(dtoBase(), AUTOR);
    await expect(m.service.gerarCobrancaPendente(rascunho.id, undefined, AUTOR)).rejects.toBeInstanceOf(ConflictException);

    m.cob.repo.falharCreate = 1;
    await assinarAtual(m, rascunho.id, { cobranca: { incluidaEmPacote: false } }, undefined, AUTOR);
    await expect(m.service.gerarCobrancaPendente(rascunho.id, undefined, COLEGA)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(m.service.gerarCobrancaPendente(rascunho.id, undefined, ctx(usuario(Papel.SECRETARIA, 'sec')))).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('ConsultasService — adendos (número sequencial + motivo)', () => {
  it('só depois de assinada; numeração 1, 2, 3 por consulta; só o autor', async () => {
    const m = montar();
    const rascunho = await m.service.criar(dtoBase(), AUTOR);
    const dto = { motivo: 'Correção da dose anotada', texto: 'Onde se lê X, leia-se Y.' };
    await expect(m.service.criarAdendo(rascunho.id, dto, undefined, AUTOR)).rejects.toBeInstanceOf(ConflictException);

    await assinarAtual(m, rascunho.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR);
    const nums = [];
    for (let i = 0; i < 3; i += 1) nums.push((await m.service.criarAdendo(rascunho.id, dto, undefined, AUTOR)).numero);
    expect(nums).toEqual([1, 2, 3]);
    await expect(m.service.criarAdendo(rascunho.id, dto, undefined, COLEGA)).rejects.toBeInstanceOf(ForbiddenException);
    const chamada = m.auditCreate.mock.calls.find((x) => x[0].event === AuditEvent.CONSULTA_ENFERMAGEM_ADENDO_CREATED)![0];
    expect(JSON.stringify(chamada)).not.toMatch(/dose|leia-se/);
  });

  it('corrida no número (E11000 no índice único) tenta o próximo, sem buraco nem duplicata', async () => {
    const m = montar();
    const { consulta } = await criarEAssinar(m, { incluidaEmPacote: true });
    const dto = { motivo: 'Motivo suficiente aqui', texto: 'texto' };
    await m.service.criarAdendo(consulta.id, dto, undefined, AUTOR);
    m.c.repo.forcarCorridaAdendo = 1; // a próxima leitura devolve 0 (como se o adendo 1 ainda não existisse)

    const a = await m.service.criarAdendo(consulta.id, dto, undefined, AUTOR);
    expect(a.numero).toBe(2);
    expect(m.c.adendos.map((x) => x.numero)).toEqual([1, 2]);
  });

  it('motivo obrigatório com mínimo de 10 caracteres (DTO)', async () => {
    const erros = async (d: object) => (await validate(plainToInstance(CreateAdendoConsultaDto, d))).map((e) => e.property);
    expect(await erros({ motivo: 'curto', texto: 't' })).toContain('motivo');
    expect(await erros({ texto: 't' })).toContain('motivo');
    expect(await erros({ motivo: 'Motivo bem explicado', texto: 't' })).toEqual([]);
  });
});

describe('ConsultasService — permissão por papel e isolamento entre clínicas', () => {
  it('ENFERMEIRO não autor da mesma clínica LÊ (auditado), mas não edita nem assina', async () => {
    const m = montar();
    const c = await m.service.criar(dtoBase(), AUTOR);

    const lida = await m.service.obter(c.id, undefined, COLEGA);
    expect(lida.id).toBe(c.id);
    const evento = m.auditCreate.mock.calls.find((x) => x[0].event === AuditEvent.CONSULTA_ENFERMAGEM_VIEWED)![0];
    expect(evento.metadata).toEqual({ clinicaId: CLINICA, consultaId: c.id, pacienteId: PACIENTE, autor: false });

    await expect(salvarAtual(m, c.id, { evolucao: { texto: 'x' } }, COLEGA)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(assinarAtual(m, c.id, { cobranca: { incluidaEmPacote: true } }, undefined, COLEGA)).rejects.toBeInstanceOf(ForbiddenException);

    const lista = await m.service.listarPorPaciente({ pacienteId: PACIENTE }, COLEGA);
    expect(lista).toHaveLength(1);
  });

  it('o autor lendo a própria consulta não gera evento de leitura por terceiro', async () => {
    const m = montar();
    const c = await m.service.criar(dtoBase(), AUTOR);
    await m.service.obter(c.id, undefined, AUTOR);
    expect(m.eventos()).not.toContain(AuditEvent.CONSULTA_ENFERMAGEM_VIEWED);
  });

  it.each([Papel.SECRETARIA, Papel.ADMIN, Papel.SUPER_ADMIN, Papel.PACIENTE])('%s não lê, não lista e não cria conteúdo clínico', async (papel) => {
    const m = montar();
    const c = await m.service.criar(dtoBase(), AUTOR);
    const outro = ctx(usuario(papel, 'outro'));
    await expect(m.service.obter(c.id, undefined, outro)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(m.service.listarPorPaciente({ pacienteId: PACIENTE }, outro)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(m.service.criar(dtoBase(), outro)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('paciente de outra clínica -> 404 ao criar; consulta de outra clínica -> 404 ao ler', async () => {
    const m = montar();
    const c = await m.service.criar(dtoBase(), AUTOR);
    const deOutraClinica = ctx(usuario(Papel.ENFERMEIRO, 'enf-x', 'clinica-2'));

    await expect(m.service.criar(dtoBase(), deOutraClinica)).rejects.toBeInstanceOf(NotFoundException);
    await expect(m.service.obter(c.id, undefined, deOutraClinica)).rejects.toBeInstanceOf(NotFoundException);
    await expect(m.service.listarPorPaciente({ pacienteId: PACIENTE }, deOutraClinica)).resolves.toEqual([]);
    await expect(m.service.obter(c.id, 'clinica-2', AUTOR)).rejects.toThrow(); // clinicaId da query diferente do token
  });
});

describe('Slot de módulos da Avaliação', () => {
  class ModuloFakeDto {
    @IsString() campoTexto!: string;
    @IsInt() @Min(0) campoNumero!: number;
  }

  it('sem definição registrada (estado desta etapa), qualquer módulo é recusado', async () => {
    const m = montar();
    await expect(
      m.service.criar(dtoBase({ avaliacao: { modulos: [{ area: AreaModuloAvaliacao.FERIDA, dados: {} }] } }), AUTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('com um módulo FAKE registrado: aceita dados válidos e recusa inválidos/extras/repetidos', async () => {
    const registry = new ModulosAvaliacaoRegistry([{ area: AreaModuloAvaliacao.FERIDA, dto: ModuloFakeDto }]);
    const m = montar({ modulos: registry, classificacoes: ['FA'] });

    const ok = await m.service.criar(
      dtoBase({ avaliacao: { modulos: [{ area: AreaModuloAvaliacao.FERIDA, dados: { campoTexto: 'a', campoNumero: 2 } }] } }),
      AUTOR,
    );
    expect(ok.avaliacao.modulos).toEqual([{ area: 'FERIDA', dados: { campoTexto: 'a', campoNumero: 2 } }]);

    const invalido = { avaliacao: { modulos: [{ area: AreaModuloAvaliacao.FERIDA, dados: { campoTexto: 'a', campoNumero: -1 } }] } };
    await expect(m.service.criar(dtoBase(invalido), AUTOR)).rejects.toThrow(/campoNumero/);
    const extra = { avaliacao: { modulos: [{ area: AreaModuloAvaliacao.FERIDA, dados: { campoTexto: 'a', campoNumero: 1, intruso: 1 } }] } };
    await expect(m.service.criar(dtoBase(extra), AUTOR)).rejects.toThrow(/intruso/);
    const dados = { campoTexto: 'a', campoNumero: 1 };
    const repetido = { avaliacao: { modulos: [{ area: AreaModuloAvaliacao.FERIDA, dados }, { area: AreaModuloAvaliacao.FERIDA, dados }] } };
    await expect(m.service.criar(dtoBase(repetido), AUTOR)).rejects.toThrow(/repetido/);
    const outraArea = { avaliacao: { modulos: [{ area: AreaModuloAvaliacao.OSTOMIA, dados }] } };
    await expect(m.service.criar(dtoBase(outraArea), AUTOR)).rejects.toThrow(/nao disponivel/);
  });
});

describe('DTOs da consulta', () => {
  it('diagnóstico: só origem MANUAL é gravável nesta etapa (IA fica para a 5f)', async () => {
    const erros = async (d: object) => (await validate(plainToInstance(DiagnosticoDto, d))).map((e) => e.property);
    expect(await erros({ texto: 'x', origem: 'MANUAL' })).toEqual([]);
    expect(await erros({ texto: 'x', origem: 'IA_ACEITA' })).toContain('origem');
    expect(await erros({ texto: 'x', origem: 'IA_EDITADA' })).toContain('origem');
    expect(await erros({ texto: '', origem: 'MANUAL' })).toContain('texto');
  });

  it('criar exige pacienteId ObjectId e recusa campos de servidor (status, enfermeiroId, assinatura)', async () => {
    const op = { whitelist: true, forbidNonWhitelisted: true };
    const erros = async (d: object) => (await validate(plainToInstance(CreateConsultaDto, d), op)).map((e) => e.property);
    expect(await erros({ pacienteId: PACIENTE })).toEqual([]);
    expect(await erros({ pacienteId: 'abc' })).toContain('pacienteId');
    expect(await erros({ pacienteId: PACIENTE, status: 'ASSINADA', enfermeiroId: 'x', assinatura: {} })).toEqual(
      expect.arrayContaining(['status', 'enfermeiroId', 'assinatura']),
    );
  });

  it('o serviço não tem exclusão física', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    const fontes = [require.resolve('./consultas.service'), require.resolve('../infrastructure/mongo/consulta-mongo.repository')]
      .map((p) => fs.readFileSync(p, 'utf8'))
      .join('\n');
    expect(fontes).not.toMatch(/deleteOne|deleteMany|findOneAndDelete|findByIdAndDelete|\.remove\(/);
  });
});

// ============================== ETAPA 5b: módulos IU e incontinência anal + anexos ==============================

const MODULO_IU_VALIDO = {
  anamnese: { sintomas: 's', comorbidades: 'c', fatoresPredisponentesPrecipitantes: 'f' },
  classificacaoInicial: { tipo: 'MISTA', predominante: 'URGENCIA' },
  exameFisico: { abdominal: { realizado: true, achado: 'sem alteracoes' }, testeEsforcoTosse: { realizado: false } },
  residuoPosMiccional: { realizado: true, volumeMl: 80, metodo: 'ULTRASSOM' },
  testeAbsorvente: { realizado: false },
  urinaliseFita: { sangue: 'NEGATIVO', glicose: 'NAO_REALIZADO', nitritos: 'POSITIVO' },
  urodinamica: { encaminhamentoIndicado: false },
  diarioMiccional: { dataInicio: '2026-11-01', dataFim: '2026-11-03', anexos: [], resumo: 'resumo' },
};
const MODULO_ANAL_VALIDO = {
  historia: { causa: 'c', fatoresRisco: 'f', duracao: 'd', gravidade: 'g' },
  tipoPerda: ['LIQUIDAS', 'GASES'],
  subtipo: ['URGENCIA'],
  consistenciaFezes: { consistencia: 'PASTOSA', origemInformacao: 'PACIENTE' },
  exameFisico: { inspecaoPerianal: { realizado: true }, retalDigital: { realizado: false } },
  sinaisAlarme: [],
  diarioIntestinal: { dataInicio: '2026-11-01', dataFim: '2026-11-01', anexos: [], resumo: 'r' },
};

describe('5b — validação compartilhada do módulo IU', () => {
  it('payload completo e válido não tem erros; vaginal/retal nunca são obrigatórios', () => {
    expect(validarModuloIU(MODULO_IU_VALIDO)).toEqual([]);
    expect(validarModuloIU({})).toEqual([]);
  });

  it('MISTA sem predominante -> erro; predominante sem MISTA -> erro', () => {
    expect(validarModuloIU({ classificacaoInicial: { tipo: 'MISTA' } }).join()).toMatch(/classificacaoInicial\.predominante: obrigatorio/);
    expect(validarModuloIU({ classificacaoInicial: { tipo: 'ESFORCO', predominante: 'URGENCIA' } }).join()).toMatch(/classificacaoInicial\.predominante/);
    expect(validarModuloIU({ classificacaoInicial: { tipo: 'MISTA', predominante: 'ESFORCO' } })).toEqual([]);
  });

  it.each([
    ['tipo inválido', { classificacaoInicial: { tipo: 'NOCTURIA' } }, 'classificacaoInicial.tipo'],
    ['método de RPM inválido', { residuoPosMiccional: { realizado: true, metodo: 'OLHOMETRO' } }, 'residuoPosMiccional.metodo'],
    ['resultado da fita inválido', { urinaliseFita: { sangue: 'TRACOS' } }, 'urinaliseFita.sangue'],
    ['item da fita desconhecido', { urinaliseFita: { cetonas: 'NEGATIVO' } }, 'urinaliseFita.cetonas'],
    ['volume negativo', { residuoPosMiccional: { realizado: true, volumeMl: -5 } }, 'residuoPosMiccional.volumeMl'],
    ['item de exame sem "realizado"', { exameFisico: { abdominal: { achado: 'x' } } }, 'exameFisico.abdominal.realizado'],
    ['campo inventado no módulo', { escalaQualquer: 3 }, 'IU.escalaQualquer'],
    ['urodinâmica sem encaminhamentoIndicado', { urodinamica: { motivo: 'x' } }, 'urodinamica.encaminhamentoIndicado'],
    ['data inválida no diário', { diarioMiccional: { dataInicio: '01/11/2026' } }, 'diarioMiccional.dataInicio'],
    ['fim antes do início', { diarioMiccional: { dataInicio: '2026-11-05', dataFim: '2026-11-01' } }, 'diarioMiccional.dataFim'],
    ['anexo com id inválido', { diarioMiccional: { anexos: ['nao-e-id'] } }, 'diarioMiccional.anexos[0]'],
  ])('%s -> erro', (_n, dados, campo) => {
    expect(validarModuloIU(dados).join()).toContain(campo);
  });

  it('os erros trazem só o NOME do campo, nunca o valor digitado', () => {
    expect(validarModuloIU({ classificacaoInicial: { tipo: 'VALOR-SIGILOSO' } }).join()).not.toMatch(/SIGILOSO/);
  });

  it('alerta (não bloqueia) com diário miccional de menos de 3 dias', () => {
    const doisDias = { diarioMiccional: { dataInicio: '2026-11-01', dataFim: '2026-11-02' } };
    expect(validarModuloIU(doisDias)).toEqual([]);
    expect(alertasModuloIU(doisDias as never)).toEqual(['O diário miccional deve cobrir no mínimo 3 dias.']);
    expect(alertasModuloIU({ diarioMiccional: { dataInicio: '2026-11-01', dataFim: '2026-11-03' } })).toEqual([]);
    expect(alertasModuloIU({ diarioMiccional: { dataInicio: '2026-11-01' } })).toEqual([]);
  });
});

describe('5b — validação compartilhada do módulo de incontinência anal', () => {
  it('payload válido não tem erros', () => {
    expect(validarModuloIncontinenciaAnal(MODULO_ANAL_VALIDO)).toEqual([]);
  });

  it('consistência sem origem da informação -> erro', () => {
    expect(validarModuloIncontinenciaAnal({ consistenciaFezes: { consistencia: 'SOLIDA' } }).join()).toMatch(/consistenciaFezes\.origemInformacao: obrigatorio/);
    expect(validarModuloIncontinenciaAnal({ consistenciaFezes: {} })).toEqual([]);
  });

  it.each([
    ['tipo de perda inválido', { tipoPerda: ['MUCO'] }, 'tipoPerda[0]'],
    ['tipo de perda repetido', { tipoPerda: ['GASES', 'GASES'] }, 'tipoPerda'],
    ['subtipo inválido', { subtipo: ['NOTURNA'] }, 'subtipo[0]'],
    ['consistência inválida (nada de escala de 7 tipos)', { consistenciaFezes: { consistencia: 'TIPO_4', origemInformacao: 'PACIENTE' } }, 'consistenciaFezes.consistencia'],
    ['origem inválida', { consistenciaFezes: { consistencia: 'SOLIDA', origemInformacao: 'FAMILIA' } }, 'consistenciaFezes.origemInformacao'],
    ['sinal de alarme inválido', { sinaisAlarme: ['FEBRE'] }, 'sinaisAlarme[0]'],
    ['campo de escala não permitido', { bristol: 4 }, 'INCONTINENCIA_ANAL.bristol'],
    ['exame físico com item desconhecido', { exameFisico: { anuscopia: { realizado: true } } }, 'exameFisico.anuscopia'],
  ])('%s -> erro', (_n, dados, campo) => {
    expect(validarModuloIncontinenciaAnal(dados).join()).toContain(campo);
  });

  it('sinal de alarme gera aviso (sem decisão automática); diário intestinal NÃO tem alerta de período', () => {
    expect(alertasModuloIncontinenciaAnal({ sinaisAlarme: ['SANGRAMENTO'] })).toEqual(['Sinal de alarme registrado — avalie encaminhamento.']);
    expect(alertasModuloIncontinenciaAnal({ diarioIntestinal: { dataInicio: '2026-11-01', dataFim: '2026-11-01' } })).toEqual([]);
  });
});

describe('5b — disponibilidade por classificação do paciente (IU = incontinência urinária e anal)', () => {
  it('a tela oferece IU e incontinência anal só para paciente com IU; ferida só para FA; ostomia ainda sem módulo', () => {
    expect(modulosDisponiveis([ClassificacaoArea.IU])).toEqual(['IU', 'INCONTINENCIA_ANAL']);
    expect(modulosDisponiveis([ClassificacaoArea.FA, ClassificacaoArea.OT])).toEqual(['FERIDA']);
    expect(modulosDisponiveis([ClassificacaoArea.OT])).toEqual([]);
    expect(modulosDisponiveis([ClassificacaoArea.IU, ClassificacaoArea.FA])).toEqual(['IU', 'INCONTINENCIA_ANAL', 'FERIDA']);
  });

  const registroReal = () =>
    new ModulosAvaliacaoRegistry(
      (Object.entries(VALIDADORES_MODULO) as Array<[AreaModuloAvaliacao, (d: unknown) => string[]]>).map(([area, validar]) => ({ area, validar })),
    );

  it('API aceita os dois módulos para paciente [IU] e recusa para [FA]/[OT] (classificação errada)', async () => {
    const ok = montar({ modulos: registroReal(), classificacoes: ['IU'] });
    const c = await ok.service.criar(
      dtoBase({ avaliacao: { modulos: [{ area: AreaModuloAvaliacao.IU, dados: MODULO_IU_VALIDO }, { area: AreaModuloAvaliacao.INCONTINENCIA_ANAL, dados: MODULO_ANAL_VALIDO }] } }),
      AUTOR,
    );
    expect(c.avaliacao.modulos.map((m) => m.area)).toEqual(['IU', 'INCONTINENCIA_ANAL']);
    const evento = ok.auditCreate.mock.calls.find((x) => x[0].event === AuditEvent.CONSULTA_ENFERMAGEM_CREATED)![0];
    expect(evento.metadata.modulos).toEqual(['IU', 'INCONTINENCIA_ANAL']);
    expect(JSON.stringify(evento.metadata)).not.toMatch(/URGENCIA|PASTOSA|sem alteracoes/);

    for (const cls of [['FA'], ['OT']]) {
      const errado = montar({ modulos: registroReal(), classificacoes: cls });
      await expect(
        errado.service.criar(dtoBase({ avaliacao: { modulos: [{ area: AreaModuloAvaliacao.IU, dados: {} }] } }), AUTOR),
      ).rejects.toThrow(/nao disponivel para a classificacao/);
      await expect(
        errado.service.criar(dtoBase({ avaliacao: { modulos: [{ area: AreaModuloAvaliacao.INCONTINENCIA_ANAL, dados: {} }] } }), AUTOR),
      ).rejects.toThrow(/nao disponivel para a classificacao/);
    }
  });

  it('dados inválidos do módulo -> 400 com o NOME do campo', async () => {
    const m = montar({ modulos: registroReal() });
    await expect(
      m.service.criar(dtoBase({ avaliacao: { modulos: [{ area: AreaModuloAvaliacao.IU, dados: { classificacaoInicial: { tipo: 'MISTA' } } }] } }), AUTOR),
    ).rejects.toThrow(/classificacaoInicial\.predominante/);
  });

  it('o CONTEÚDO DOS MÓDULOS é coberto pela assinatura: alterar depois de assinar -> 409; o hash muda se o módulo muda', async () => {
    const m = montar({ modulos: registroReal() });
    const c = await m.service.criar(dtoBase({ avaliacao: { modulos: [{ area: AreaModuloAvaliacao.IU, dados: MODULO_IU_VALIDO }] } }), AUTOR);
    await assinarAtual(m, c.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR);

    await expect(
      salvarAtual(m, c.id, { avaliacao: { modulos: [{ area: AreaModuloAvaliacao.IU, dados: {} }] } }, AUTOR),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(m.c.consultas[0].avaliacao.modulos[0].dados).toEqual(MODULO_IU_VALIDO);

    const data = new Date('2026-11-05T12:00:00Z');
    const base = m.c.consultas[0];
    const outra = { ...base, avaliacao: { ...base.avaliacao, modulos: [{ area: AreaModuloAvaliacao.IU, dados: { ...MODULO_IU_VALIDO, urodinamica: { encaminhamentoIndicado: true } } }] } };
    expect(m.service.hashAssinatura(base, 'COREN', data)).not.toBe(m.service.hashAssinatura(outra, 'COREN', data));
  });
});

describe('5b — anexos da consulta (diário em papel)', () => {
  const presign = { mimeType: 'image/png' as const, tamanho: 1234, hash: 'a'.repeat(64) };

  async function rascunhoComAnexo(m: ReturnType<typeof montar>) {
    const c = await m.service.criar(dtoBase(), AUTOR);
    const up = await m.service.criarUploadAnexo(c.id, presign, undefined, AUTOR);
    await m.service.confirmarUploadAnexo(c.id, up.anexo.id, undefined, AUTOR);
    return { c, anexoId: up.anexo.id, up };
  }

  it('autor envia em rascunho: chave sem dado pessoal, headers assinados, URL privada não volta ao cliente; auditado sem valor', async () => {
    const storage = storageFake();
    const m = montar({ storage });
    const { c, up } = await rascunhoComAnexo(m);

    const key = storage.createUploadUrl.mock.calls[0][0].key as string;
    expect(key).toMatch(new RegExp(`^${CLINICA}/consultas/${c.id}/[0-9a-f-]{36}\\.png$`));
    expect(up.requiredHeaders).toEqual({ 'Content-Type': 'image/png', 'x-amz-meta-sha256': 'a'.repeat(64) });
    expect(up.anexo).not.toHaveProperty('url');
    expect(storage.headObject).toHaveBeenCalled();
    expect(m.eventos()).toEqual(expect.arrayContaining([AuditEvent.CONSULTA_ANEXO_UPLOAD_URL_CREATED, AuditEvent.CONSULTA_ANEXO_CONFIRMED]));
  });

  it('só PDF/JPG/PNG (DICOM recusado pelo DTO) e no limite de tamanho do módulo de documentos', async () => {
    const erros = async (d: object) => (await validate(plainToInstance(PresignAnexoConsultaDto, d))).map((e) => e.property);
    expect(await erros(presign)).toEqual([]);
    expect(await erros({ ...presign, mimeType: 'application/dicom' })).toContain('mimeType');
    expect(await erros({ ...presign, mimeType: 'video/mp4' })).toContain('mimeType');

    const m = montar();
    const c = await m.service.criar(dtoBase(), AUTOR);
    await expect(m.service.criarUploadAnexo(c.id, { ...presign, tamanho: MAX_DOCUMENT_SIZE_BYTES + 1 }, undefined, AUTOR)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirmação exige o objeto no storage com o tamanho declarado', async () => {
    const storage = storageFake();
    storage.headObject.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ tamanho: 1 });
    const m = montar({ storage });
    const c = await m.service.criar(dtoBase(), AUTOR);
    const up = await m.service.criarUploadAnexo(c.id, presign, undefined, AUTOR);
    await expect(m.service.confirmarUploadAnexo(c.id, up.anexo.id, undefined, AUTOR)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(m.service.confirmarUploadAnexo(c.id, up.anexo.id, undefined, AUTOR)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(await m.service.listarAnexos(c.id, undefined, AUTOR)).toEqual([]); // não confirmado não aparece
  });

  it('enviar: não autor 403; depois de assinada 409 (sem anexo novo)', async () => {
    const m = montar();
    const c = await m.service.criar(dtoBase(), AUTOR);
    await expect(m.service.criarUploadAnexo(c.id, presign, undefined, COLEGA)).rejects.toBeInstanceOf(ForbiddenException);
    await assinarAtual(m, c.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR);
    await expect(m.service.criarUploadAnexo(c.id, presign, undefined, AUTOR)).rejects.toBeInstanceOf(ConflictException);
  });

  it('diário só pode citar anexo CONFIRMADO desta consulta; na criação não há anexos', async () => {
    const m = montar({ modulos: new ModulosAvaliacaoRegistry([{ area: AreaModuloAvaliacao.IU, validar: validarModuloIU }]) });
    const { c, anexoId } = await rascunhoComAnexo(m);

    const comAnexo = (ids: string[]) => ({ avaliacao: { modulos: [{ area: AreaModuloAvaliacao.IU, dados: { diarioMiccional: { anexos: ids } } }] } });
    await expect(salvarAtual(m, c.id, comAnexo([anexoId]), AUTOR)).resolves.toBeDefined();
    await expect(salvarAtual(m, c.id, comAnexo(['65f00000000000000000ffff']), AUTOR)).rejects.toThrow(/nao pertence a esta consulta/);
    await expect(m.service.criar(dtoBase(comAnexo([anexoId])), AUTOR)).rejects.toThrow(/nao pertence a esta consulta/);
  });

  it('LER o anexo: enfermeiro da clínica sim (auditado, marca não autor); SECRETARIA/ADMIN/SUPER_ADMIN não; outra clínica 404', async () => {
    const m = montar();
    const { c, anexoId } = await rascunhoComAnexo(m);

    const r = await m.service.urlAcessoAnexo(c.id, anexoId, undefined, COLEGA);
    expect(r.accessUrl).toBe('https://r2/get/assinada');
    const evento = m.auditCreate.mock.calls.find((x) => x[0].event === AuditEvent.CONSULTA_ANEXO_VIEW_URL_CREATED)![0];
    expect(evento.metadata).toEqual({ clinicaId: CLINICA, consultaId: c.id, anexoId, autor: false });
    expect(await m.service.listarAnexos(c.id, undefined, COLEGA)).toHaveLength(1);

    for (const papel of [Papel.SECRETARIA, Papel.ADMIN, Papel.SUPER_ADMIN]) {
      const outro = ctx(usuario(papel, 'x'));
      await expect(m.service.urlAcessoAnexo(c.id, anexoId, undefined, outro)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(m.service.listarAnexos(c.id, undefined, outro)).rejects.toBeInstanceOf(ForbiddenException);
    }
    const deOutraClinica = ctx(usuario(Papel.ENFERMEIRO, 'enf-x', 'clinica-2'));
    await expect(m.service.urlAcessoAnexo(c.id, anexoId, undefined, deOutraClinica)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('anexo nunca é apagado: não há rota nem método de exclusão de anexo', () => {
    const metodos = Object.getOwnPropertyNames(ConsultasController.prototype).join(',');
    expect(metodos).not.toMatch(/excluir|delete|remover/i);
    const repoMetodos = Object.getOwnPropertyNames(ConsultaMongoRepository.prototype).join(',');
    expect(repoMetodos).not.toMatch(/delete|remove|excluir/i);
  });
});

// ======================================================================================================================
// Etapa 5c — FERIDAS: lesões, módulo FERIDA, desfecho na assinatura, consentimento e medição por foto.
// ======================================================================================================================

const OUTRO_PACIENTE = '65f000000000000000000002';
const SECRETARIA = ctx(usuario(Papel.SECRETARIA, 'sec'));
const ADMIN = ctx(usuario(Papel.ADMIN, 'adm'));
const SUPER = ctx(usuario(Papel.SUPER_ADMIN, 'root'));
const DE_OUTRA_CLINICA = ctx(usuario(Papel.ENFERMEIRO, 'enf-x', 'clinica-2'));

const registroComFerida = () =>
  new ModulosAvaliacaoRegistry(
    (Object.entries(VALIDADORES_MODULO) as Array<[AreaModuloAvaliacao, (d: unknown) => string[]]>).map(([area, validar]) => ({ area, validar })),
  );

const lesaoDto = (over: Record<string, unknown> = {}) =>
  ({
    pacienteId: PACIENTE,
    localizacaoAnatomica: 'região sacral',
    lado: 'CENTRAL',
    etiologia: 'ULCERA_VENOSA',
    dataIdentificacao: '2026-11-01',
    ...over,
  }) as CreateLesaoDto;

const montarFerida = (opts: Parameters<typeof montar>[0] = {}) => montar({ modulos: registroComFerida(), classificacoes: ['FA'], ...opts });

const moduloFerida = (avaliacoes: unknown[], itb?: unknown[]) => ({
  avaliacao: { modulos: [{ area: AreaModuloAvaliacao.FERIDA, dados: { avaliacoes, ...(itb ? { itb } : {}) } as Record<string, unknown> }] },
});
const avaliacao = (lesaoId: string, over: Record<string, unknown> = {}) => ({ lesaoId, desfecho: { situacao: 'EM_ACOMPANHAMENTO' }, ...over });

describe('5c — cadastro de lesões', () => {
  it('ENFERMEIRO cadastra com número sequencial por paciente (1, 2…), status ABERTA; auditado sem conteúdo clínico', async () => {
    const m = montarFerida();
    const l1 = await m.lesoesService.criar(lesaoDto(), AUTOR);
    const l2 = await m.lesoesService.criar(lesaoDto({ etiologia: 'LESAO_UMIDADE', subtipoUmidade: 'PERIESTOMAL' }), COLEGA);
    expect([l1.numero, l2.numero]).toEqual([1, 2]);
    expect(l1).toMatchObject({ status: 'ABERTA', clinicaId: CLINICA, criadaPor: 'enf-autor', versao: 1, correcoes: [] });
    const ev = m.auditCreate.mock.calls.find((x) => x[0].event === AuditEvent.LESAO_CREATED)![0];
    expect(JSON.stringify(ev.metadata)).not.toMatch(/sacral|VENOSA/);
  });

  it('número sem corrida: leitura atrasada bate no índice único e o serviço tenta o próximo', async () => {
    const m = montarFerida();
    await m.lesoesService.criar(lesaoDto(), AUTOR);
    m.les.repo.forcarCorridaNumero = 1;
    const l = await m.lesoesService.criar(lesaoDto(), AUTOR);
    expect(l.numero).toBe(2);
  });

  it.each([
    ['OUTRA sem texto', { etiologia: 'OUTRA' }, /etiologiaOutra: obrigatorio/],
    ['umidade sem subtipo', { etiologia: 'LESAO_UMIDADE' }, /subtipoUmidade: obrigatorio/],
    ['subtipo fora de umidade', { subtipoUmidade: 'PERIESTOMAL' }, /subtipoUmidade/],
    ['localização vazia', { localizacaoAnatomica: '  ' }, /localizacaoAnatomica: obrigatorio/],
  ])('%s -> 400', async (_n, over, erro) => {
    const m = montarFerida();
    await expect(m.lesoesService.criar(lesaoDto(over), AUTOR)).rejects.toThrow(erro);
  });

  it('OUTRA com texto é aceita; paciente sem FA -> 400; outra clínica -> 404; SECRETARIA/ADMIN/SUPER_ADMIN -> 403', async () => {
    const m = montarFerida();
    await expect(m.lesoesService.criar(lesaoDto({ etiologia: 'OUTRA', etiologiaOutra: 'queimadura' }), AUTOR)).resolves.toMatchObject({ etiologiaOutra: 'queimadura' });
    await expect(montarFerida({ classificacoes: ['IU'] }).lesoesService.criar(lesaoDto(), AUTOR)).rejects.toThrow(/classificacao FA/);
    await expect(m.lesoesService.criar(lesaoDto(), DE_OUTRA_CLINICA)).rejects.toBeInstanceOf(NotFoundException);
    for (const quem of [SECRETARIA, ADMIN, SUPER]) await expect(m.lesoesService.criar(lesaoDto(), quem)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('correção de etiologia/localização é VERSIONADA (autor, data, motivo, valores anteriores); versão velha -> 409', async () => {
    const m = montarFerida();
    const l = await m.lesoesService.criar(lesaoDto(), AUTOR);
    const corr = { localizacaoAnatomica: 'calcâneo', lado: 'DIREITO', etiologia: 'LESAO_POR_PRESSAO', motivo: 'erro de cadastro na triagem', versao: 1 } as CorrigirLesaoDto;
    const c = await m.lesoesService.corrigir(l.id, corr, COLEGA);
    expect(c).toMatchObject({ etiologia: 'LESAO_POR_PRESSAO', localizacaoAnatomica: 'calcâneo', versao: 2 });
    expect(c.correcoes).toHaveLength(1);
    expect(c.correcoes[0]).toMatchObject({
      por: 'enf-colega',
      motivo: 'erro de cadastro na triagem',
      anterior: { etiologia: 'ULCERA_VENOSA', localizacaoAnatomica: 'região sacral', lado: 'CENTRAL' },
    });
    expect(c.correcoes[0].em).toBeInstanceOf(Date);
    const ev = m.auditCreate.mock.calls.find((x) => x[0].event === AuditEvent.LESAO_CORRIGIDA)![0];
    expect(ev.metadata.campos).toEqual(expect.arrayContaining(['etiologia', 'localizacaoAnatomica', 'lado']));
    expect(JSON.stringify(ev.metadata)).not.toMatch(/calcâneo|triagem/);

    await expect(m.lesoesService.corrigir(l.id, { ...lesaoDto(), motivo: 'outra correção qualquer', versao: 1 } as CorrigirLesaoDto, AUTOR)).rejects.toBeInstanceOf(ConflictException);
    await expect(m.lesoesService.corrigir(l.id, { ...corr, motivo: 'nada mudou aqui', versao: 2 }, AUTOR)).rejects.toThrow(/Nada mudou/);
  });

  it('LER: enfermeiro da clínica lê (não autor auditado); SECRETARIA/ADMIN/SUPER_ADMIN 403; outra clínica 404', async () => {
    const m = montarFerida();
    const l = await m.lesoesService.criar(lesaoDto(), AUTOR);
    await expect(m.lesoesService.obter(l.id, undefined, COLEGA)).resolves.toMatchObject({ id: l.id });
    expect(m.auditCreate.mock.calls.find((x) => x[0].event === AuditEvent.LESAO_VIEWED)![0].metadata).toMatchObject({ lesaoId: l.id, autor: false });
    expect(await m.lesoesService.listar({ pacienteId: PACIENTE }, COLEGA)).toHaveLength(1);
    for (const quem of [SECRETARIA, ADMIN, SUPER]) {
      await expect(m.lesoesService.obter(l.id, undefined, quem)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(m.lesoesService.listar({ pacienteId: PACIENTE }, quem)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(m.lesoesService.historico({ pacienteId: PACIENTE }, quem)).rejects.toBeInstanceOf(ForbiddenException);
    }
    await expect(m.lesoesService.obter(l.id, undefined, DE_OUTRA_CLINICA)).rejects.toBeInstanceOf(NotFoundException);
    await expect(m.lesoesService.listar({ pacienteId: PACIENTE }, DE_OUTRA_CLINICA)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('não há método de status nem de exclusão de lesão no serviço nem nos controllers', () => {
    const nomes = [LesoesService.prototype, LesoesController.prototype, ConsentimentosImagemController.prototype, LesaoMongoRepository.prototype]
      .flatMap((p) => Object.getOwnPropertyNames(p))
      .join(',');
    expect(nomes).not.toMatch(/excluir|delete|remover|remove/i);
    expect(Object.getOwnPropertyNames(LesoesController.prototype).join(',')).not.toMatch(/status/i);
  });
});

describe('5c — módulo FERIDA na consulta', () => {
  it('disponível só para FA: paciente [IU] recebe 400', async () => {
    const m = montarFerida({ classificacoes: ['IU'] });
    await expect(m.service.criar(dtoBase(moduloFerida([])), AUTOR)).rejects.toThrow(/nao disponivel para a classificacao/);
  });

  it('LPP sem categoria -> 400; com categoria aceita; lpp em lesão que não é LPP -> 400', async () => {
    const m = montarFerida();
    const lpp = await m.lesoesService.criar(lesaoDto({ etiologia: 'LESAO_POR_PRESSAO' }), AUTOR);
    const venosa = await m.lesoesService.criar(lesaoDto(), AUTOR);
    await expect(m.service.criar(dtoBase(moduloFerida([avaliacao(lpp.id)])), AUTOR)).rejects.toThrow(/lpp\.categoria: obrigatorio/);
    await expect(m.service.criar(dtoBase(moduloFerida([avaliacao(lpp.id, { lpp: { categoria: 'MUCOSA' } })])), AUTOR)).resolves.toBeDefined();
    await expect(m.service.criar(dtoBase(moduloFerida([avaliacao(venosa.id, { lpp: { categoria: 'II' } })])), AUTOR)).rejects.toThrow(/so se aplica a lesao por pressao/);
  });

  it('adesivo médico: obrigatório; segunda observação com menos de 30 min -> erro com o texto especificado', async () => {
    const m = montarFerida();
    const ad = await m.lesoesService.criar(lesaoDto({ etiologia: 'LESAO_ADESIVO_MEDICO' }), AUTOR);
    const obs = (min: number) => ({
      observacaoRemocao: { em: '2026-11-06T10:00:00.000Z', achado: 'a' },
      observacao30min: { em: new Date(Date.parse('2026-11-06T10:00:00.000Z') + min * 60000).toISOString(), achado: 'b' },
    });
    await expect(m.service.criar(dtoBase(moduloFerida([avaliacao(ad.id)])), AUTOR)).rejects.toThrow(/observacaoRemocao: obrigatorio/);
    await expect(m.service.criar(dtoBase(moduloFerida([avaliacao(ad.id, { lesaoAdesivo: obs(29) })])), AUTOR)).rejects.toThrow(
      /Registre a segunda observação 30 minutos ou mais após a remoção do adesivo\./,
    );
    await expect(m.service.criar(dtoBase(moduloFerida([avaliacao(ad.id, { lesaoAdesivo: obs(30) })])), AUTOR)).resolves.toBeDefined();
  });

  it('lesão de outro paciente, lesão inexistente ou produto do catálogo inexistente -> 400', async () => {
    const m = montarFerida();
    const minha = await m.lesoesService.criar(lesaoDto(), AUTOR);
    const deOutro = await m.lesoesService.criar(lesaoDto({ pacienteId: OUTRO_PACIENTE }), AUTOR);
    await expect(m.service.criar(dtoBase(moduloFerida([avaliacao(deOutro.id)])), AUTOR)).rejects.toThrow(/nao encontrada para este paciente/);
    await expect(m.service.criar(dtoBase(moduloFerida([avaliacao('65f0000000000000000000ff')])), AUTOR)).rejects.toThrow(/nao encontrada/);
    await expect(m.service.criar(dtoBase(moduloFerida([avaliacao(minha.id, { materiais: [{ produtoCodigo: 999 }] })])), AUTOR)).rejects.toThrow(/Produto do catalogo/);
    await expect(
      m.service.criar(dtoBase(moduloFerida([avaliacao(minha.id, { materiais: [{ produtoCodigo: 101 }, { descricao: 'gaze' }] })])), AUTOR),
    ).resolves.toBeDefined();
  });
});

describe('5c — desfecho aplicado na ASSINATURA', () => {
  it('rascunho NÃO muda a lesão; assinar aplica CICATRIZADA com consultaId (auditado); alterar o módulo depois -> 409', async () => {
    const m = montarFerida();
    const l = await m.lesoesService.criar(lesaoDto(), AUTOR);
    const c = await m.service.criar(dtoBase(moduloFerida([avaliacao(l.id, { desfecho: { situacao: 'CICATRIZADA' } })])), AUTOR);
    expect(m.les.lesoes[0].status).toBe('ABERTA');

    await assinarAtual(m, c.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR);
    expect(m.les.lesoes[0]).toMatchObject({ status: 'CICATRIZADA', statusConsultaId: c.id, statusAlteradoPor: 'enf-autor' });
    const ev = m.auditCreate.mock.calls.find((x) => x[0].event === AuditEvent.LESAO_STATUS_ALTERADO)![0];
    expect(ev.metadata).toMatchObject({ lesaoId: l.id, consultaId: c.id, de: 'ABERTA', para: 'CICATRIZADA' });

    await expect(salvarAtual(m, c.id, moduloFerida([]), AUTOR)).rejects.toBeInstanceOf(ConflictException);
  });

  it('ENCERRADA exige motivo e grava o motivo na lesão; EM_ACOMPANHAMENTO mantém ABERTA', async () => {
    const m = montarFerida();
    const a = await m.lesoesService.criar(lesaoDto(), AUTOR);
    const b = await m.lesoesService.criar(lesaoDto(), AUTOR);
    await expect(m.service.criar(dtoBase(moduloFerida([avaliacao(a.id, { desfecho: { situacao: 'ENCERRADA' } })])), AUTOR)).rejects.toThrow(/desfecho\.motivo: obrigatorio/);
    const c = await m.service.criar(
      dtoBase(moduloFerida([avaliacao(a.id, { desfecho: { situacao: 'ENCERRADA', motivo: 'transferido de serviço' } }), avaliacao(b.id)])),
      AUTOR,
    );
    await assinarAtual(m, c.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR);
    expect(m.les.lesoes.map((l) => [l.status, l.motivoEncerramento])).toEqual([['ENCERRADA', 'transferido de serviço'], ['ABERTA', undefined]]);
  });

  it('lesão encerrada por OUTRA consulta antes da assinatura -> 409 ao assinar (nada é assinado)', async () => {
    const m = montarFerida();
    const l = await m.lesoesService.criar(lesaoDto(), AUTOR);
    const rascunho = await m.service.criar(dtoBase(moduloFerida([avaliacao(l.id)])), AUTOR);
    const outra = await m.service.criar(dtoBase(moduloFerida([avaliacao(l.id, { desfecho: { situacao: 'CICATRIZADA' } })])), COLEGA);
    await assinarAtual(m, outra.id, { cobranca: { incluidaEmPacote: true } }, undefined, COLEGA);

    await expect(assinarAtual(m, rascunho.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR)).rejects.toBeInstanceOf(ConflictException);
    expect(m.c.consultas.find((x) => x.id === rascunho.id)!.status).toBe(StatusConsulta.RASCUNHO);
  });

  it('histórico: só consultas ASSINADAS, abertas primeiro, medidas com o método', async () => {
    const m = montarFerida();
    const a = await m.lesoesService.criar(lesaoDto(), AUTOR);
    const b = await m.lesoesService.criar(lesaoDto(), AUTOR);
    const assinada = await m.service.criar(
      dtoBase(moduloFerida([avaliacao(a.id, { desfecho: { situacao: 'CICATRIZADA' } }), avaliacao(b.id, { medidas: { manual: { comprimentoCm: 3, larguraCm: 2 } } })])),
      AUTOR,
    );
    await assinarAtual(m, assinada.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR);
    await m.service.criar(dtoBase(moduloFerida([avaliacao(b.id)])), AUTOR); // rascunho: fora do histórico

    const h = await m.lesoesService.historico({ pacienteId: PACIENTE }, COLEGA);
    expect(h.map((x) => [x.lesao.numero, x.lesao.status])).toEqual([[2, 'ABERTA'], [1, 'CICATRIZADA']]);
    expect(h[0].avaliacoes).toHaveLength(1);
    expect(h[0].avaliacoes[0].medidas).toEqual([{ metodo: 'MANUAL', comprimentoCm: 3, larguraCm: 2, profundidadeCm: undefined }]);
    expect(m.eventos()).toContain(AuditEvent.LESAO_HISTORICO_VIEWED);
  });
});

describe('5c — consentimento de imagem e fotos da ferida', () => {
  const foto = { mimeType: 'image/png' as const, tamanho: 1234, hash: 'b'.repeat(64) };
  const consentir = { pacienteId: PACIENTE, obtidoEm: '2026-11-06T09:00:00.000Z' };

  async function cenario() {
    const m = montarFerida();
    const l = await m.lesoesService.criar(lesaoDto(), AUTOR);
    const c = await m.service.criar(dtoBase(), AUTOR);
    return { m, l, c };
  }

  it('sem consentimento: upload de foto recusado (422, auditado); diário sem lesão segue sem consentimento', async () => {
    const { m, l, c } = await cenario();
    await expect(m.service.criarUploadAnexo(c.id, { ...foto, lesaoId: l.id }, undefined, AUTOR)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(m.eventos()).toContain(AuditEvent.CONSULTA_FOTO_RECUSADA_SEM_CONSENTIMENTO);
    await expect(m.service.criarUploadAnexo(c.id, foto, undefined, AUTOR)).resolves.toBeDefined();
  });

  it('com consentimento: foto aceita (só JPG/PNG, lesão do paciente); revogado: recusado; fotos antigas continuam legíveis', async () => {
    const { m, l, c } = await cenario();
    const cons = await m.lesoesService.registrarConsentimento(consentir, AUTOR);
    await expect(m.lesoesService.registrarConsentimento(consentir, AUTOR)).rejects.toBeInstanceOf(ConflictException);
    await expect(m.service.criarUploadAnexo(c.id, { ...foto, mimeType: 'application/pdf', lesaoId: l.id }, undefined, AUTOR)).rejects.toThrow(/JPG ou PNG/);
    const deOutro = await m.lesoesService.criar(lesaoDto({ pacienteId: OUTRO_PACIENTE }), AUTOR);
    await expect(m.service.criarUploadAnexo(c.id, { ...foto, lesaoId: deOutro.id }, undefined, AUTOR)).rejects.toThrow(/nao encontrada para este paciente/);

    const up = await m.service.criarUploadAnexo(c.id, { ...foto, lesaoId: l.id }, undefined, AUTOR);
    expect(up.anexo).toMatchObject({ lesaoId: l.id });
    await m.service.confirmarUploadAnexo(c.id, up.anexo.id, undefined, AUTOR);

    await m.lesoesService.revogarConsentimento(cons.id, undefined, AUTOR);
    await expect(m.service.criarUploadAnexo(c.id, { ...foto, lesaoId: l.id }, undefined, AUTOR)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(m.service.urlAcessoAnexo(c.id, up.anexo.id, undefined, COLEGA)).resolves.toMatchObject({ accessUrl: 'https://r2/get/assinada' });
    const r = await m.lesoesService.consentimentos({ pacienteId: PACIENTE }, COLEGA);
    expect(r.vigente).toBeNull();
    expect(r.historico[0]).toMatchObject({ revogadoPor: 'enf-autor' });
    expect(m.eventos()).toEqual(expect.arrayContaining([AuditEvent.CONSENTIMENTO_IMAGEM_REGISTRADO, AuditEvent.CONSENTIMENTO_IMAGEM_REVOGADO]));
  });

  it('consentimento revogado entre o presign e a confirmação: a foto NÃO é confirmada', async () => {
    const { m, l, c } = await cenario();
    const cons = await m.lesoesService.registrarConsentimento(consentir, AUTOR);
    const up = await m.service.criarUploadAnexo(c.id, { ...foto, lesaoId: l.id }, undefined, AUTOR);
    await m.lesoesService.revogarConsentimento(cons.id, undefined, AUTOR);
    await expect(m.service.confirmarUploadAnexo(c.id, up.anexo.id, undefined, AUTOR)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('consentimento: SECRETARIA/ADMIN não; outra clínica 404; obtidoEm no futuro -> 400', async () => {
    const m = montarFerida();
    for (const quem of [SECRETARIA, ADMIN]) {
      await expect(m.lesoesService.registrarConsentimento(consentir, quem)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(m.lesoesService.consentimentos({ pacienteId: PACIENTE }, quem)).rejects.toBeInstanceOf(ForbiddenException);
    }
    await expect(m.lesoesService.consentimentos({ pacienteId: PACIENTE }, DE_OUTRA_CLINICA)).rejects.toBeInstanceOf(NotFoundException);
    await expect(m.lesoesService.registrarConsentimento({ pacienteId: PACIENTE, obtidoEm: '2999-01-01T00:00:00.000Z' }, AUTOR)).rejects.toThrow(/futuro/);
  });

  it('fotos da lesão: SECRETARIA/ADMIN não leem; outra clínica 404', async () => {
    const { m, l, c } = await cenario();
    await m.lesoesService.registrarConsentimento(consentir, AUTOR);
    const up = await m.service.criarUploadAnexo(c.id, { ...foto, lesaoId: l.id }, undefined, AUTOR);
    await m.service.confirmarUploadAnexo(c.id, up.anexo.id, undefined, AUTOR);
    for (const quem of [SECRETARIA, ADMIN]) await expect(m.service.urlAcessoAnexo(c.id, up.anexo.id, undefined, quem)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(m.service.urlAcessoAnexo(c.id, up.anexo.id, undefined, DE_OUTRA_CLINICA)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('MEDIÇÃO: a API RECALCULA a partir dos pontos e ignora o número do cliente; foto de outra lesão / contorno cruzado -> 400', async () => {
    const { m, l, c } = await cenario();
    const outraLesao = await m.lesoesService.criar(lesaoDto(), AUTOR);
    await m.lesoesService.registrarConsentimento(consentir, AUTOR);
    const up = await m.service.criarUploadAnexo(c.id, { ...foto, lesaoId: l.id }, undefined, AUTOR);
    await m.service.confirmarUploadAnexo(c.id, up.anexo.id, undefined, AUTOR);

    const medida = {
      anexoId: up.anexo.id,
      // 100 px da régua = 2 cm -> 0,02 cm/px; quadrado de 100 px de lado = 2 cm x 2 cm.
      calibracao: { p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 }, distanciaCm: 2 },
      contorno: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
      resultado: { areaCm2: 999, comprimentoCm: 999, larguraCm: 999 },
    };
    const r = await salvarAtual(m, c.id, moduloFerida([avaliacao(l.id, { medidas: { fotos: [medida] } })]), AUTOR);
    const dados = r.avaliacao.modulos[0].dados as { avaliacoes: Array<{ medidas: { fotos: Array<{ resultado: unknown }> } }> };
    expect(dados.avaliacoes[0].medidas.fotos[0].resultado).toEqual({ areaCm2: 4, comprimentoCm: 2.83, larguraCm: 2.83 });

    await expect(salvarAtual(m, c.id, moduloFerida([avaliacao(outraLesao.id, { medidas: { fotos: [medida] } })]), AUTOR)).rejects.toThrow(/mesma lesao/);
    const cruzado = { ...medida, contorno: [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 100, y: 0 }, { x: 0, y: 100 }] };
    await expect(salvarAtual(m, c.id, moduloFerida([avaliacao(l.id, { medidas: { fotos: [cruzado] } })]), AUTOR)).rejects.toThrow(/se cruza/);
  });
});

describe('5c — desfecho PENDENTE_APLICACAO e reaplicação (mesmo padrão da cobrança)', () => {
  const assinarComDesfecho = async (m: ReturnType<typeof montarFerida>, lesaoId: string, quem = AUTOR) => {
    const c = await m.service.criar(dtoBase(moduloFerida([avaliacao(lesaoId, { desfecho: { situacao: 'CICATRIZADA' } })])), quem);
    return assinarAtual(m, c.id, { cobranca: { incluidaEmPacote: true } }, undefined, quem);
  };

  it('sucesso na assinatura -> APLICADO; consulta sem desfecho que fecha lesão não ganha o campo', async () => {
    const m = montarFerida();
    const l = await m.lesoesService.criar(lesaoDto(), AUTOR);
    const ok = await assinarComDesfecho(m, l.id);
    expect(ok.desfechoLesoesStatus).toBe(StatusDesfechoLesoes.APLICADO);
    const { assinada } = await criarEAssinar(m, { incluidaEmPacote: true });
    expect(assinada.desfechoLesoesStatus).toBeUndefined();
  });

  it('FALHA simulada: consulta ASSINADA com PENDENTE_APLICACAO (auditado), lesão continua ABERTA', async () => {
    const m = montarFerida();
    const l = await m.lesoesService.criar(lesaoDto(), AUTOR);
    m.les.repo.falharAlterarStatus = 1;
    const assinada = await assinarComDesfecho(m, l.id);
    expect(assinada.status).toBe(StatusConsulta.ASSINADA);
    expect(assinada.desfechoLesoesStatus).toBe(StatusDesfechoLesoes.PENDENTE_APLICACAO);
    expect(m.c.consultas[0].desfechoLesoesStatus).toBe(StatusDesfechoLesoes.PENDENTE_APLICACAO);
    expect(m.les.lesoes[0].status).toBe('ABERTA');
    expect(m.eventos()).toEqual(expect.arrayContaining([AuditEvent.LESAO_STATUS_NAO_APLICADO, AuditEvent.CONSULTA_DESFECHO_LESOES_PENDENTE]));
  });

  it('reaplicar -> APLICADO com o desfecho GRAVADO; reaplicar 2x não tem efeito duplicado', async () => {
    const m = montarFerida();
    const l = await m.lesoesService.criar(lesaoDto(), AUTOR);
    m.les.repo.falharAlterarStatus = 1;
    const assinada = await assinarComDesfecho(m, l.id);

    const r1 = await m.service.aplicarDesfechoLesoes(assinada.id, undefined, COLEGA);
    expect(r1).toMatchObject({ desfechoLesoesStatus: 'APLICADO', aplicadas: [l.id], jaAplicadas: [], conflitos: [], falhas: [] });
    expect(m.les.lesoes[0]).toMatchObject({ status: 'CICATRIZADA', statusConsultaId: assinada.id });
    const alteracoes = () => m.eventos().filter((e) => e === AuditEvent.LESAO_STATUS_ALTERADO).length;
    expect(alteracoes()).toBe(1);

    const r2 = await m.service.aplicarDesfechoLesoes(assinada.id, undefined, AUTOR);
    expect(r2).toMatchObject({ desfechoLesoesStatus: 'APLICADO', aplicadas: [], jaAplicadas: [l.id], conflitos: [] });
    expect(alteracoes()).toBe(1);
    expect(m.les.lesoes[0].statusAlteradoPor).toBe('enf-colega');
    expect(m.eventos()).toContain(AuditEvent.CONSULTA_DESFECHO_LESOES_REAPLICADO);
  });

  it('CONFLITO: lesão já fechada por OUTRA consulta não é sobrescrita; auditado e devolvido', async () => {
    const m = montarFerida();
    const l = await m.lesoesService.criar(lesaoDto(), AUTOR);
    m.les.repo.falharAlterarStatus = 1;
    const pendente = await assinarComDesfecho(m, l.id);
    // Outra consulta encerra a mesma lesão antes da reaplicação.
    const outra = await m.service.criar(dtoBase(moduloFerida([avaliacao(l.id, { desfecho: { situacao: 'ENCERRADA', motivo: 'alta do servico' } })])), COLEGA);
    await assinarAtual(m, outra.id, { cobranca: { incluidaEmPacote: true } }, undefined, COLEGA);

    const r = await m.service.aplicarDesfechoLesoes(pendente.id, undefined, AUTOR);
    expect(r).toMatchObject({ aplicadas: [], conflitos: [l.id], desfechoLesoesStatus: 'APLICADO' });
    expect(m.les.lesoes[0]).toMatchObject({ status: 'ENCERRADA', statusConsultaId: outra.id, motivoEncerramento: 'alta do servico' });
    const ev = m.auditCreate.mock.calls.find((x) => x[0].event === AuditEvent.LESAO_DESFECHO_CONFLITO)![0];
    expect(ev.metadata).toMatchObject({ consultaId: pendente.id, lesaoId: l.id, fechadaPorConsultaId: outra.id, statusAtual: 'ENCERRADA' });
  });

  it('reaplicar: rascunho -> 409; SECRETARIA/ADMIN -> 403; outra clínica -> 404', async () => {
    const m = montarFerida();
    const l = await m.lesoesService.criar(lesaoDto(), AUTOR);
    const rascunho = await m.service.criar(dtoBase(moduloFerida([avaliacao(l.id)])), AUTOR);
    await expect(m.service.aplicarDesfechoLesoes(rascunho.id, undefined, AUTOR)).rejects.toBeInstanceOf(ConflictException);
    for (const quem of [SECRETARIA, ADMIN]) await expect(m.service.aplicarDesfechoLesoes(rascunho.id, undefined, quem)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(m.service.aplicarDesfechoLesoes(rascunho.id, undefined, DE_OUTRA_CLINICA)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('R1.1 — assinatura não pode selar conteúdo diferente do gravado', () => {
  it('assinatura de A + salvamento de B intercalados: um recebe 409 e o conteúdo gravado SEMPRE corresponde ao HMAC', async () => {
    const m = montar();
    const c = await m.service.criar(dtoBase(), AUTOR);
    const lida = await m.service.obter(c.id, undefined, AUTOR);
    const versao = (lida as unknown as { versao?: number }).versao;
    m.c.repo.aoAssinar = async () => {
      await m.service.atualizarRascunho(c.id, { evolucao: { texto: 'conteudo B salvo em outra tela' }, versao } as never, AUTOR);
    };
    const resultado = await m.service
      .assinar(c.id, { cobranca: { incluidaEmPacote: true }, versao } as never, undefined, AUTOR)
      .then(() => 'assinou', (e: unknown) => e);
    const gravada = m.c.consultas[0];
    if (resultado === 'assinou') {
      expect(gravada.status).toBe(StatusConsulta.ASSINADA);
      const recalculado = m.service.hashAssinatura(gravada, gravada.assinatura!.coren, gravada.assinatura!.dataAssinatura);
      expect(recalculado).toBe(gravada.assinatura!.hash);
    } else {
      expect(resultado).toBeInstanceOf(ConflictException);
      expect(gravada.status).toBe(StatusConsulta.RASCUNHO);
    }
  });
});

describe('R1.1 — versão do rascunho, selo de integridade e pendências pós-assinatura', () => {
  it('salvar com versão divergente -> 409 "alterada em outra tela" e NADA é sobrescrito', async () => {
    const m = montar();
    const c = await m.service.criar(dtoBase(), AUTOR);
    await m.service.atualizarRascunho(c.id, { evolucao: { texto: 'tela 1' }, versao: 1 }, AUTOR);
    expect(m.c.consultas[0].versao).toBe(2);
    await expect(m.service.atualizarRascunho(c.id, { evolucao: { texto: 'tela 2 (velha)' }, versao: 1 }, AUTOR)).rejects.toThrow('A consulta foi alterada em outra tela');
    expect(m.c.consultas[0].evolucao.texto).toBe('tela 1');
    await expect(m.service.assinar(c.id, { cobranca: { incluidaEmPacote: true }, versao: 1 }, undefined, AUTOR)).rejects.toThrow('A consulta foi alterada em outra tela');
    expect(m.c.consultas[0].status).toBe(StatusConsulta.RASCUNHO);
  });

  it('ordem inversa: assinatura grava primeiro -> o salvamento da outra tela recebe 409 e o selo confere', async () => {
    const m = montar();
    const c = await m.service.criar(dtoBase(), AUTOR);
    await m.service.assinar(c.id, { cobranca: { incluidaEmPacote: true }, versao: 1 }, undefined, AUTOR);
    await expect(m.service.atualizarRascunho(c.id, { evolucao: { texto: 'B' }, versao: 1 }, AUTOR)).rejects.toBeInstanceOf(ConflictException);
    const lida = await m.service.obter(c.id, undefined, AUTOR);
    expect(lida.integridade).toBe('VALIDA');
  });

  it('selo de integridade: VALIDA na leitura; conteúdo adulterado -> FALHA + auditoria (sem chamar de assinatura digital)', async () => {
    const m = montar();
    const { consulta } = await criarEAssinar(m, { incluidaEmPacote: true });
    expect((await m.service.obter(consulta.id, undefined, COLEGA)).integridade).toBe('VALIDA');
    expect((await m.service.listarPorPaciente({ pacienteId: PACIENTE }, AUTOR))[0].integridade).toBe('VALIDA');

    m.c.consultas[0].evolucao = { texto: 'alterado direto no banco' };
    expect((await m.service.obter(consulta.id, undefined, COLEGA)).integridade).toBe('FALHA');
    const ev = m.auditCreate.mock.calls.find((x) => x[0].event === AuditEvent.CONSULTA_INTEGRIDADE_FALHA)![0];
    expect(ev.metadata).toEqual({ clinicaId: CLINICA, consultaId: consulta.id, pacienteId: PACIENTE });
    // Rascunho não tem selo.
    const rascunho = await m.service.criar(dtoBase(), AUTOR);
    expect((await m.service.obter(rascunho.id, undefined, AUTOR)).integridade).toBeUndefined();
  });

  it('cópia da identificação da lesão gravada na assinatura e coberta pelo selo; corrigir a lesão depois não muda a consulta', async () => {
    const m = montarFerida();
    const l = await m.lesoesService.criar(lesaoDto({ etiologia: 'LESAO_UMIDADE', subtipoUmidade: 'PERIESTOMAL' }), AUTOR);
    const c = await m.service.criar(dtoBase(moduloFerida([avaliacao(l.id)])), AUTOR);
    const assinada = await assinarAtual(m, c.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR);
    expect(assinada.identificacoesLesoes).toEqual([
      { lesaoId: l.id, numero: 1, localizacaoAnatomica: 'região sacral', lado: 'CENTRAL', etiologia: 'LESAO_UMIDADE', subtipoUmidade: 'PERIESTOMAL', versaoCadastro: 1 },
    ]);
    await m.lesoesService.corrigir(l.id, { localizacaoAnatomica: 'calcâneo', lado: 'DIREITO', etiologia: 'ULCERA_VENOSA', motivo: 'erro de cadastro corrigido', versao: 1 } as CorrigirLesaoDto, AUTOR);
    const lida = await m.service.obter(c.id, undefined, AUTOR);
    expect(lida.identificacoesLesoes![0]).toMatchObject({ localizacaoAnatomica: 'região sacral', versaoCadastro: 1 });
    expect(lida.integridade).toBe('VALIDA');
    m.c.consultas[0].identificacoesLesoes![0].localizacaoAnatomica = 'adulterado';
    expect((await m.service.obter(c.id, undefined, AUTOR)).integridade).toBe('FALHA');
  });

  it('falha da AUDITORIA depois de gravar a assinatura -> 200 com pendência persistida; a leitura regrava e limpa', async () => {
    const m = montar();
    m.auditCreate.mockImplementation((e: { event: string }) =>
      e.event === AuditEvent.CONSULTA_ENFERMAGEM_SIGNED && !m.c.consultas[0].auditoriaAssinaturaPendente
        ? Promise.reject(new Error('audit indisponivel'))
        : Promise.resolve(undefined),
    );
    const c = await m.service.criar(dtoBase(), AUTOR);
    const r = await assinarAtual(m, c.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR);
    expect(r.status).toBe(StatusConsulta.ASSINADA);
    expect(r.pendencias).toEqual(['AUDITORIA']);
    expect(m.c.consultas[0].auditoriaAssinaturaPendente).toBe(true);

    await m.service.obter(c.id, undefined, AUTOR);
    expect(m.c.consultas[0].auditoriaAssinaturaPendente).toBeUndefined();
    expect(m.auditCreate.mock.calls.filter((x) => x[0].event === AuditEvent.CONSULTA_ENFERMAGEM_SIGNED).pop()![0].metadata).toMatchObject({ regravado: true });
  });

  it('falha da COBRANÇA (inclusive da auditoria dela) depois de gravar -> 200 com pendência COBRANCA', async () => {
    const m = montar();
    m.cob.repo.falharCreate = 1;
    m.auditCreate.mockImplementation((e: { event: string }) =>
      e.event === AuditEvent.CONSULTA_COBRANCA_PENDENTE ? Promise.reject(new Error('audit indisponivel')) : Promise.resolve(undefined),
    );
    const c = await m.service.criar(dtoBase(), AUTOR);
    const r = await assinarAtual(m, c.id, { cobranca: { incluidaEmPacote: false } }, undefined, AUTOR);
    expect(r.status).toBe(StatusConsulta.ASSINADA);
    expect(r.pendencias).toEqual(['COBRANCA']);
    expect(m.c.consultas[0].cobranca?.status).toBe(StatusCobrancaConsulta.PENDENTE_GERACAO);
  });

  it('falha do DESFECHO das lesões (mesmo com a auditoria do desfecho falhando) -> 200 com pendência DESFECHO_LESOES', async () => {
    const m = montarFerida();
    const l = await m.lesoesService.criar(lesaoDto(), AUTOR);
    const c = await m.service.criar(dtoBase(moduloFerida([avaliacao(l.id, { desfecho: { situacao: 'CICATRIZADA' } })])), AUTOR);
    m.les.repo.falharAlterarStatus = 1;
    m.auditCreate.mockImplementation((e: { event: string }) =>
      e.event === AuditEvent.LESAO_STATUS_NAO_APLICADO ? Promise.reject(new Error('audit indisponivel')) : Promise.resolve(undefined),
    );
    const r = await assinarAtual(m, c.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR);
    expect(r.status).toBe(StatusConsulta.ASSINADA);
    expect(r.pendencias).toEqual(['DESFECHO_LESOES']);
    expect(m.c.consultas[0].desfechoLesoesStatus).toBe(StatusDesfechoLesoes.PENDENTE_APLICACAO);
  });

  it('sem nenhuma falha: pendências vazias', async () => {
    const m = montar();
    const c = await m.service.criar(dtoBase(), AUTOR);
    expect((await assinarAtual(m, c.id, { cobranca: { incluidaEmPacote: false } }, undefined, AUTOR)).pendencias).toEqual([]);
  });

  it('DTOs exigem a versão (salvar e assinar)', async () => {
    const errosDe = async (cls: new () => object, d: object) => (await validate(plainToInstance(cls, d))).map((e) => e.property);
    expect(await errosDe(UpdateConsultaDto, { evolucao: { texto: 'x' } })).toContain('versao');
    expect(await errosDe(AssinarConsultaDto, { cobranca: { incluidaEmPacote: true } })).toContain('versao');
    expect(await errosDe(AssinarConsultaDto, { cobranca: { incluidaEmPacote: true }, versao: 2 })).toEqual([]);
  });
});
