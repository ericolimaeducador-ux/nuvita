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
import { CreateAdendoConsultaDto, CreateConsultaDto, DiagnosticoDto, PresignAnexoConsultaDto } from './dto/consulta.dto';

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
  const repo: ConsultaRepository & { forcarCorridaAdendo?: number } = {
    async create(data) {
      const c = { ...data, id: `c${++seq}`, criadoEm: new Date(), atualizadoEm: new Date() } as ConsultaEnfermagem;
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
    async updateRascunho(clinicaId, id, autorId, conteudo) {
      const c = consultas.find((x) => x.id === id && x.clinicaId === clinicaId && x.enfermeiroId === autorId && x.status === StatusConsulta.RASCUNHO);
      if (!c) return null;
      Object.assign(c, conteudo);
      return { ...c };
    },
    async assinar(clinicaId, id, autorId, assinatura, cobranca) {
      const c = consultas.find((x) => x.id === id && x.clinicaId === clinicaId && x.enfermeiroId === autorId && x.status === StatusConsulta.RASCUNHO);
      if (!c) return null;
      Object.assign(c, { status: StatusConsulta.ASSINADA, assinatura, cobranca });
      return { ...c };
    },
    async atualizarCobranca(clinicaId, id, cobranca) {
      const c = consultas.find((x) => x.id === id && x.clinicaId === clinicaId && x.status === StatusConsulta.ASSINADA);
      if (!c) return null;
      c.cobranca = cobranca;
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
  const service = new ConsultasService(
    c.repo,
    { create: auditCreate } as unknown as AuditLogRepository,
    users as unknown as UserRepository,
    { getConfig: () => ({ prontuarioSignatureSecret: 'segredo-de-teste' }) } as unknown as AppConfigService,
    pacientes as unknown as PacientesService,
    cobrancasService,
    opts.modulos ?? new ModulosAvaliacaoRegistry([]),
    (opts.storage ?? storageFake()) as never,
  );
  const eventos = () => auditCreate.mock.calls.map((x) => x[0].event);
  return { service, c, cob, auditCreate, eventos };
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
  const assinada = await m.service.assinar(consulta.id, { cobranca }, undefined, AUTOR);
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
    const r = await m.service.atualizarRascunho(
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

    await expect(m.service.atualizarRascunho(consulta.id, { evolucao: { texto: 'mudou' } }, AUTOR)).rejects.toBeInstanceOf(ConflictException);
    expect(m.c.consultas[0].evolucao.texto).toBe('');
    expect(m.c.consultas[0].assinatura?.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('assinatura exige COREN no perfil (422) e é do autor; assinar 2x dá 409', async () => {
    const semCoren = montar({ coren: null });
    const c1 = await semCoren.service.criar(dtoBase(), AUTOR);
    await expect(semCoren.service.assinar(c1.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR)).rejects.toBeInstanceOf(UnprocessableEntityException);

    const m = montar();
    const { consulta } = await criarEAssinar(m, { incluidaEmPacote: true });
    await expect(m.service.assinar(consulta.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR)).rejects.toBeInstanceOf(ConflictException);
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
    await m.service.assinar(rascunho.id, { cobranca: { incluidaEmPacote: false } }, undefined, AUTOR);
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

    await m.service.assinar(rascunho.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR);
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

    await expect(m.service.atualizarRascunho(c.id, { evolucao: { texto: 'x' } }, COLEGA)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(m.service.assinar(c.id, { cobranca: { incluidaEmPacote: true } }, undefined, COLEGA)).rejects.toBeInstanceOf(ForbiddenException);

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
  it('a tela oferece IU e incontinência anal só para paciente com IU; ferida/ostomia ainda sem módulo', () => {
    expect(modulosDisponiveis([ClassificacaoArea.IU])).toEqual(['IU', 'INCONTINENCIA_ANAL']);
    expect(modulosDisponiveis([ClassificacaoArea.FA, ClassificacaoArea.OT])).toEqual([]);
    expect(modulosDisponiveis([ClassificacaoArea.IU, ClassificacaoArea.FA])).toEqual(['IU', 'INCONTINENCIA_ANAL']);
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
    await m.service.assinar(c.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR);

    await expect(
      m.service.atualizarRascunho(c.id, { avaliacao: { modulos: [{ area: AreaModuloAvaliacao.IU, dados: {} }] } }, AUTOR),
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
    await m.service.assinar(c.id, { cobranca: { incluidaEmPacote: true } }, undefined, AUTOR);
    await expect(m.service.criarUploadAnexo(c.id, presign, undefined, AUTOR)).rejects.toBeInstanceOf(ConflictException);
  });

  it('diário só pode citar anexo CONFIRMADO desta consulta; na criação não há anexos', async () => {
    const m = montar({ modulos: new ModulosAvaliacaoRegistry([{ area: AreaModuloAvaliacao.IU, validar: validarModuloIU }]) });
    const { c, anexoId } = await rascunhoComAnexo(m);

    const comAnexo = (ids: string[]) => ({ avaliacao: { modulos: [{ area: AreaModuloAvaliacao.IU, dados: { diarioMiccional: { anexos: ids } } }] } });
    await expect(m.service.atualizarRascunho(c.id, comAnexo([anexoId]), AUTOR)).resolves.toBeDefined();
    await expect(m.service.atualizarRascunho(c.id, comAnexo(['65f00000000000000000ffff']), AUTOR)).rejects.toThrow(/nao pertence a esta consulta/);
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
