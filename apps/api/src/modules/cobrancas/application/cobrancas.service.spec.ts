import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { NotificacoesService } from '../../notificacoes/application/notificacoes.service';
import { CanalNotificacao, TipoNotificacao } from '../../notificacoes/domain/notificacao.entity';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import {
  Cobranca,
  FormaPagamentoCobranca,
  StatusCobranca,
  TipoCobranca,
  somaItens,
  statusEfetivo,
} from '../domain/cobranca.entity';
import { VALOR_CONSULTA_AVALIACAO_PADRAO_CENTAVOS } from '../domain/financeiro-config.entity';
import { CobrancaAuditContext, CobrancasService, formatarData, formatarReais } from './cobrancas.service';
import { CobrancaRepository } from './ports/cobranca.repository';
import { FinanceiroConfigRepository } from './ports/financeiro-config.repository';
import { CreateCobrancaDto } from './dto/create-cobranca.dto';
import { CanalAviso, CancelarCobrancaDto, ResumoQueryDto, SalvarConfigFinanceiroDto } from './dto/outros.dto';

const PACIENTE_ID = '65f000000000000000000001';

const contexto: CobrancaAuditContext = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'sec-1', email: 'sec@nuvita.test', papel: Papel.SECRETARIA, clinicaId: 'clinica-1', jti: 'jti', typ: 'access' as const },
};

function cobranca(over: Partial<Cobranca> = {}): Cobranca {
  return {
    id: 'c1', clinicaId: 'clinica-1', pacienteId: PACIENTE_ID, tipo: TipoCobranca.OUTRO, descricao: 'desc', valorCentavos: 10000,
    itens: [], vencimento: new Date('2099-01-10T00:00:00Z'), status: StatusCobranca.PENDENTE, criadoPor: 'sec-1',
    criadoEm: new Date(), atualizadoEm: new Date(), ...over,
  };
}

function montar(
  repo: Partial<Record<keyof CobrancaRepository, jest.Mock>> = {},
  opts: { existe?: boolean; config?: unknown; contato?: Record<string, unknown>; notificar?: jest.Mock } = {},
) {
  const auditCreate = jest.fn().mockResolvedValue(undefined);
  const notificarCreate = opts.notificar ?? jest.fn().mockResolvedValue({ id: 'n1' });
  const contato = { nome: 'Maria', nomeDestinatario: 'Maria', ehResponsavel: false, email: 'm@x.com', telefone: '11999990000', ...opts.contato };
  const pacientes = {
    resumoPorIds: jest.fn().mockResolvedValue(opts.existe === false ? new Map() : new Map([[PACIENTE_ID, contato]])),
  };
  const configRepo = {
    findByClinica: jest.fn().mockResolvedValue(opts.config ?? null),
    upsert: jest.fn().mockImplementation((clinicaId, valor) => Promise.resolve({ clinicaId, valorConsultaAvaliacaoCentavos: valor })),
  };
  const service = new CobrancasService(
    repo as unknown as CobrancaRepository,
    configRepo as unknown as FinanceiroConfigRepository,
    { create: auditCreate } as unknown as AuditLogRepository,
    pacientes as unknown as PacientesService,
    { create: notificarCreate } as unknown as NotificacoesService,
  );
  return { service, auditCreate, notificarCreate, pacientes, configRepo };
}

const criarRepo = () => jest.fn().mockImplementation((d) => Promise.resolve(cobranca({ ...d, id: 'c1' })));

describe('CobrancasService — criação', () => {
  it('cria PENDENTE com o valor aberto, a clínica do token e quem criou; audita só ids', async () => {
    const create = criarRepo();
    const { service, auditCreate } = montar({ create });

    const c = await service.criar(
      { pacienteId: PACIENTE_ID, tipo: TipoCobranca.PACOTE_MENSAL, descricao: 'Pacote sigiloso', valorCentavos: 35000, vencimento: '2099-02-01' },
      contexto,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ clinicaId: 'clinica-1', status: StatusCobranca.PENDENTE, valorCentavos: 35000, itens: [], criadoPor: 'sec-1' }),
    );
    expect(c.id).toBe('c1');
    const chamada = auditCreate.mock.calls[0][0];
    expect(chamada.event).toBe(AuditEvent.LANCAMENTO_FINANCEIRO_CREATED);
    expect(chamada.metadata).toEqual({ clinicaId: 'clinica-1', cobrancaId: 'c1', pacienteId: PACIENTE_ID, tipo: 'pacote_mensal' });
    expect(JSON.stringify(chamada)).not.toMatch(/sigiloso|35000/);
  });

  it('paciente de outra clínica → 404 e nada é gravado', async () => {
    const create = jest.fn();
    const { service } = montar({ create }, { existe: false });
    await expect(
      service.criar({ pacienteId: PACIENTE_ID, tipo: TipoCobranca.OUTRO, descricao: 'x', valorCentavos: 1, vencimento: '2099-01-01' }, contexto),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(create).not.toHaveBeenCalled();
  });

  describe('itens (futuro checklist -> valor)', () => {
    it('sem valor, o valor é a SOMA dos itens', async () => {
      const create = criarRepo();
      const { service } = montar({ create });
      await service.criar(
        { pacienteId: PACIENTE_ID, tipo: TipoCobranca.OUTRO, descricao: 'x', vencimento: '2099-01-01',
          itens: [{ descricao: 'a', valorCentavos: 1000 }, { descricao: 'b', valorCentavos: 2500 }] },
        contexto,
      );
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ valorCentavos: 3500, itens: [{ descricao: 'a', valorCentavos: 1000 }, { descricao: 'b', valorCentavos: 2500 }] }));
    });

    it('valor e itens que não batem → 400; sem valor e sem itens → 400', async () => {
      const { service } = montar({ create: criarRepo() });
      const base = { pacienteId: PACIENTE_ID, tipo: TipoCobranca.OUTRO, descricao: 'x', vencimento: '2099-01-01' };
      await expect(
        service.criar({ ...base, valorCentavos: 999, itens: [{ descricao: 'a', valorCentavos: 1000 }] }, contexto),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.criar(base, contexto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('somaItens', () => {
      expect(somaItens([])).toBe(0);
      expect(somaItens(undefined)).toBe(0);
      expect(somaItens([{ descricao: 'a', valorCentavos: 5 }, { descricao: 'b', valorCentavos: 7 }])).toBe(12);
    });
  });

  describe('atalho consulta de avaliação', () => {
    it('traz o valor da CONFIGURAÇÃO da clínica (nada fixo no fluxo)', async () => {
      const create = criarRepo();
      const { service } = montar({ create }, { config: { clinicaId: 'clinica-1', valorConsultaAvaliacaoCentavos: 31000 } });

      await service.criarConsultaAvaliacao({ pacienteId: PACIENTE_ID, vencimento: '2099-03-01' }, contexto);

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: TipoCobranca.CONSULTA_AVALIACAO, valorCentavos: 31000, status: StatusCobranca.PENDENTE }),
      );
    });

    it('sem configuração gravada, usa o padrão (R$ 220,00 = 22000) e vencimento hoje por omissão', async () => {
      const create = criarRepo();
      const { service } = montar({ create });

      await service.criarConsultaAvaliacao({ pacienteId: PACIENTE_ID }, contexto);

      expect(VALOR_CONSULTA_AVALIACAO_PADRAO_CENTAVOS).toBe(22000);
      const gravado = create.mock.calls[0][0];
      expect(gravado.valorCentavos).toBe(22000);
      expect(gravado.vencimento.toISOString().slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
    });
  });
});

describe('CobrancasService — configuração do valor', () => {
  it('salva por clínica e audita só o NOME do campo', async () => {
    const { service, configRepo, auditCreate } = montar();
    const adm = { ...contexto, user: { ...contexto.user, papel: Papel.ADMIN } };

    const r = await service.salvarConfig({ valorConsultaAvaliacaoCentavos: 25000 }, adm);

    expect(configRepo.upsert).toHaveBeenCalledWith('clinica-1', 25000, 'sec-1');
    expect(r.valorConsultaAvaliacaoCentavos).toBe(25000);
    const chamada = auditCreate.mock.calls[0][0];
    expect(chamada.event).toBe(AuditEvent.FINANCEIRO_CONFIG_UPDATED);
    expect(JSON.stringify(chamada.metadata)).not.toMatch(/25000/);
  });

  it('obterConfig devolve o padrão quando a clínica não gravou', async () => {
    const { service } = montar();
    await expect(service.obterConfig(undefined, contexto.user)).resolves.toEqual({
      clinicaId: 'clinica-1',
      valorConsultaAvaliacaoCentavos: 22000,
    });
  });
});

describe('CobrancasService — marcar paga e cancelar (soft)', () => {
  it('marcar paga registra quem e quando, vai a PAGA e audita', async () => {
    const update = jest.fn().mockImplementation((_c, _i, _s, data) => Promise.resolve(cobranca({ ...data })));
    const { service, auditCreate } = montar({ update });

    const c = await service.marcarPaga('c1', { formaPagamento: FormaPagamentoCobranca.PIX }, undefined, contexto);

    expect(update).toHaveBeenCalledWith('clinica-1', 'c1', [StatusCobranca.PENDENTE, StatusCobranca.ENVIADA],
      expect.objectContaining({ status: StatusCobranca.PAGA, pagoPor: 'sec-1', formaPagamento: 'pix' }));
    expect(update.mock.calls[0][3].pagaEm).toBeInstanceOf(Date);
    expect(c.status).toBe(StatusCobranca.PAGA);
    expect(auditCreate.mock.calls[0][0].event).toBe(AuditEvent.LANCAMENTO_FINANCEIRO_PAGO);
  });

  it('cancelar é lógico: status + motivo + quem/quando; nunca há exclusão física; o motivo não vai para o log', async () => {
    const update = jest.fn().mockImplementation((_c, _i, _s, data) => Promise.resolve(cobranca({ ...data })));
    const { service, auditCreate } = montar({ update });

    const c = await service.cancelar('c1', { motivo: '  Paciente desistiu, fone 11999  ' }, undefined, contexto);

    expect(update).toHaveBeenCalledWith('clinica-1', 'c1', [StatusCobranca.PENDENTE, StatusCobranca.ENVIADA],
      expect.objectContaining({ status: StatusCobranca.CANCELADA, canceladoPor: 'sec-1', motivoCancelamento: 'Paciente desistiu, fone 11999' }));
    expect(c.status).toBe(StatusCobranca.CANCELADA);
    const chamada = auditCreate.mock.calls[0][0];
    expect(chamada.event).toBe(AuditEvent.LANCAMENTO_FINANCEIRO_CANCELADO);
    expect(JSON.stringify(chamada)).not.toMatch(/desistiu|11999/);
  });

  it('o serviço e o repositório não têm exclusão física', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    const fontes = [
      require.resolve('./cobrancas.service'),
      require.resolve('../infrastructure/mongo/cobranca-mongo.repository'),
    ].map((p) => fs.readFileSync(p, 'utf8')).join('\n');
    expect(fontes).not.toMatch(/deleteOne|deleteMany|findOneAndDelete|findByIdAndDelete|\.remove\(/);
  });

  it.each([
    ['já paga/cancelada → 409', StatusCobranca.PAGA, ConflictException],
    ['inexistente → 404', undefined, NotFoundException],
  ])('pagar e cancelar: %s', async (_nome, statusAtual, erro) => {
    const update = jest.fn().mockResolvedValue(null);
    const findById = jest.fn().mockResolvedValue(statusAtual ? cobranca({ status: statusAtual }) : null);
    const { service } = montar({ update, findById });

    await expect(service.marcarPaga('c1', {}, undefined, contexto)).rejects.toBeInstanceOf(erro);
    await expect(service.cancelar('c1', { motivo: 'x' }, undefined, contexto)).rejects.toBeInstanceOf(erro);
  });
});

describe('CobrancasService — edição', () => {
  it('só edita cobrança em aberto; audita os NOMES dos campos', async () => {
    const update = jest.fn().mockResolvedValue(cobranca());
    const { service, auditCreate } = montar({ findById: jest.fn().mockResolvedValue(cobranca()), update });

    await service.atualizar('c1', { descricao: 'novo texto', parcelas: 3 }, contexto);

    expect(update).toHaveBeenCalledWith('clinica-1', 'c1', [StatusCobranca.PENDENTE, StatusCobranca.ENVIADA], { descricao: 'novo texto', parcelas: 3 });
    const meta = auditCreate.mock.calls[0][0].metadata;
    expect(meta.campos).toEqual(['descricao', 'parcelas']);
    expect(JSON.stringify(meta)).not.toMatch(/novo texto/);
  });

  it('cobrança paga não é editável (409); payload vazio → 400; itens sem valor recalculam o valor', async () => {
    const paga = cobranca({ status: StatusCobranca.PAGA });
    const s1 = montar({ findById: jest.fn().mockResolvedValue(paga), update: jest.fn().mockResolvedValue(null) });
    await expect(s1.service.atualizar('c1', { descricao: 'x' }, contexto)).rejects.toBeInstanceOf(ConflictException);

    const s2 = montar({ findById: jest.fn().mockResolvedValue(cobranca()) });
    await expect(s2.service.atualizar('c1', {}, contexto)).rejects.toBeInstanceOf(BadRequestException);

    const update = jest.fn().mockResolvedValue(cobranca());
    const s3 = montar({ findById: jest.fn().mockResolvedValue(cobranca()), update });
    await s3.service.atualizar('c1', { itens: [{ descricao: 'a', valorCentavos: 400 }, { descricao: 'b', valorCentavos: 600 }] }, contexto);
    expect(update.mock.calls[0][3]).toMatchObject({ valorCentavos: 1000 });
  });
});

describe('CobrancasService — avisos (e-mail e WhatsApp via NotificacoesService)', () => {
  it('e-mail + WhatsApp: cria as duas notificações com o template de cobrança e vai a ENVIADA', async () => {
    const update = jest.fn().mockResolvedValue(cobranca({ status: StatusCobranca.ENVIADA }));
    const { service, notificarCreate, auditCreate } = montar({ findById: jest.fn().mockResolvedValue(cobranca({ valorCentavos: 22000 })), update });

    const r = await service.enviarAviso('c1', { canais: [CanalAviso.EMAIL, CanalAviso.WHATSAPP] }, undefined, contexto);

    expect(notificarCreate).toHaveBeenCalledTimes(2);
    expect(notificarCreate.mock.calls[0][0]).toMatchObject({
      tipo: TipoNotificacao.AVISO_COBRANCA, canal: CanalNotificacao.EMAIL, email: 'm@x.com', nome: 'Maria', vencimento: '10/01/2099',
    });
    expect(notificarCreate.mock.calls[0][0].valor.replace(/\s/g, ' ')).toContain('220,00');
    expect(notificarCreate.mock.calls[1][0]).toMatchObject({ canal: CanalNotificacao.WHATSAPP, telefone: '11999990000' });
    expect(update).toHaveBeenCalledWith('clinica-1', 'c1', expect.any(Array), expect.objectContaining({ status: StatusCobranca.ENVIADA }));
    expect(r.canais.every((c) => c.ok)).toBe(true);
    const chamada = auditCreate.mock.calls[0][0];
    expect(chamada.event).toBe(AuditEvent.LANCAMENTO_FINANCEIRO_ENVIADO);
    expect(chamada.metadata.canais).toEqual(['email', 'whatsapp']);
  });

  it('um canal falha (paciente sem telefone), o outro envia: vai a ENVIADA e o erro volta no resultado', async () => {
    const update = jest.fn().mockResolvedValue(cobranca({ status: StatusCobranca.ENVIADA }));
    const { service, notificarCreate } = montar(
      { findById: jest.fn().mockResolvedValue(cobranca()), update },
      { contato: { telefone: undefined } },
    );

    const r = await service.enviarAviso('c1', { canais: [CanalAviso.EMAIL, CanalAviso.WHATSAPP] }, undefined, contexto);

    expect(notificarCreate).toHaveBeenCalledTimes(1);
    expect(r.canais).toEqual([{ canal: 'email', ok: true }, { canal: 'whatsapp', ok: false, erro: expect.stringMatching(/telefone/) }]);
  });

  it('nenhum canal enviado (opt-out etc.) → 400 e a cobrança NÃO muda de status', async () => {
    const update = jest.fn();
    const notificar = jest.fn().mockRejectedValue(new BadRequestException('Paciente optou por nao receber notificacoes neste canal.'));
    const { service } = montar({ findById: jest.fn().mockResolvedValue(cobranca()), update }, { notificar });

    await expect(service.enviarAviso('c1', { canais: [CanalAviso.EMAIL] }, undefined, contexto)).rejects.toThrow(/optou/);
    expect(update).not.toHaveBeenCalled();
  });

  it('responsável legal: o aviso vai para ele (nomePaciente + paraResponsavel)', async () => {
    const update = jest.fn().mockResolvedValue(cobranca());
    const { service, notificarCreate } = montar(
      { findById: jest.fn().mockResolvedValue(cobranca()), update },
      { contato: { nome: 'Crianca', nomeDestinatario: 'Mae', ehResponsavel: true } },
    );

    await service.enviarAviso('c1', { canais: [CanalAviso.EMAIL] }, undefined, contexto);

    expect(notificarCreate.mock.calls[0][0]).toMatchObject({ nome: 'Mae', nomePaciente: 'Crianca', paraResponsavel: true });
  });

  it('cobrança paga/cancelada não recebe aviso (409); inexistente → 404', async () => {
    const s1 = montar({ findById: jest.fn().mockResolvedValue(cobranca({ status: StatusCobranca.PAGA })) });
    await expect(s1.service.enviarAviso('c1', { canais: [CanalAviso.EMAIL] }, undefined, contexto)).rejects.toBeInstanceOf(ConflictException);
    expect(s1.notificarCreate).not.toHaveBeenCalled();

    const s2 = montar({ findById: jest.fn().mockResolvedValue(null) });
    await expect(s2.service.enviarAviso('c1', { canais: [CanalAviso.EMAIL] }, undefined, contexto)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('status vencida (derivado) e resumo mensal', () => {
  const hoje = new Date('2026-06-15T12:00:00Z');

  it('pendente/enviada com vencimento passado vira vencida; paga/cancelada nunca', () => {
    const passado = new Date('2026-06-10T00:00:00Z');
    expect(statusEfetivo({ status: StatusCobranca.PENDENTE, vencimento: passado }, hoje)).toBe(StatusCobranca.VENCIDA);
    expect(statusEfetivo({ status: StatusCobranca.ENVIADA, vencimento: passado }, hoje)).toBe(StatusCobranca.VENCIDA);
    expect(statusEfetivo({ status: StatusCobranca.PAGA, vencimento: passado }, hoje)).toBe(StatusCobranca.PAGA);
    expect(statusEfetivo({ status: StatusCobranca.CANCELADA, vencimento: passado }, hoje)).toBe(StatusCobranca.CANCELADA);
    expect(statusEfetivo({ status: StatusCobranca.PENDENTE, vencimento: new Date('2026-06-15T00:00:00Z') }, hoje)).toBe(StatusCobranca.PENDENTE);
  });

  it('resumo: a receber, recebido (pela data do pagamento) e vencido na clínica do token', async () => {
    const lista = [
      cobranca({ id: '1', valorCentavos: 1000, vencimento: new Date('2026-06-20T00:00:00Z') }), // a receber
      cobranca({ id: '2', valorCentavos: 2000, status: StatusCobranca.ENVIADA, vencimento: new Date('2026-06-30T00:00:00Z') }), // a receber
      cobranca({ id: '3', valorCentavos: 4000, vencimento: new Date('2026-06-05T00:00:00Z') }), // vencido
      cobranca({ id: '4', valorCentavos: 8000, status: StatusCobranca.PAGA, vencimento: new Date('2026-05-30T00:00:00Z'), pagaEm: new Date('2026-06-03T00:00:00Z') }), // recebido
      cobranca({ id: '5', valorCentavos: 16000, status: StatusCobranca.CANCELADA, vencimento: new Date('2026-06-12T00:00:00Z') }), // fora
      cobranca({ id: '6', valorCentavos: 32000, status: StatusCobranca.PAGA, vencimento: new Date('2026-06-10T00:00:00Z'), pagaEm: new Date('2026-07-02T00:00:00Z') }), // pago em outro mês
    ];
    const listParaResumo = jest.fn().mockResolvedValue(lista);
    const { service } = montar({ listParaResumo });

    const r = await service.resumo({ mes: '2026-06' }, contexto.user, hoje);

    expect(listParaResumo).toHaveBeenCalledWith('clinica-1', new Date('2026-06-01T00:00:00Z'), new Date('2026-07-01T00:00:00Z'));
    expect(r).toEqual({
      mes: '2026-06',
      aReceberCentavos: 3000,
      recebidoCentavos: 8000,
      vencidoCentavos: 4000,
      quantidades: { aReceber: 2, recebido: 1, vencido: 1 },
    });
  });

  it('listagem apresenta o status efetivo (vencida) e exige pacienteId', async () => {
    const lista = [cobranca({ vencimento: new Date('2000-01-01T00:00:00Z') })];
    const { service } = montar({ listByPaciente: jest.fn().mockResolvedValue(lista) });
    const r = await service.listarPorPaciente(PACIENTE_ID, undefined, contexto.user);
    expect(r[0].status).toBe(StatusCobranca.VENCIDA);
    await expect(service.listarPorPaciente('', undefined, contexto.user)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('formatação e DTOs', () => {
  it('formatarReais / formatarData', () => {
    expect(formatarReais(22000).replace(/\s/g, ' ')).toBe('R$ 220,00');
    expect(formatarData(new Date('2099-01-10T00:00:00Z'))).toBe('10/01/2099');
  });

  const opcoes = { whitelist: true, forbidNonWhitelisted: true };
  const erros = async (cls: new () => object, dados: Record<string, unknown>) =>
    (await validate(plainToInstance(cls, dados), opcoes)).map((e) => e.property);

  it('criar: válido aceito; recusa valor negativo/decimal, paciente inválido, tipo/forma fora do enum, campo desconhecido', async () => {
    const base = { pacienteId: PACIENTE_ID, tipo: 'outro', descricao: 'x', valorCentavos: 100, vencimento: '2099-01-01' };
    expect(await erros(CreateCobrancaDto, base)).toEqual([]);
    expect(await erros(CreateCobrancaDto, { ...base, valorCentavos: -1 })).toContain('valorCentavos');
    expect(await erros(CreateCobrancaDto, { ...base, valorCentavos: 10.5 })).toContain('valorCentavos');
    expect(await erros(CreateCobrancaDto, { ...base, pacienteId: 'abc' })).toContain('pacienteId');
    expect(await erros(CreateCobrancaDto, { ...base, tipo: 'x' })).toContain('tipo');
    expect(await erros(CreateCobrancaDto, { ...base, formaPagamento: 'cheque' })).toContain('formaPagamento');
    expect(await erros(CreateCobrancaDto, { ...base, status: 'paga' })).toContain('status'); // status nunca vem do cliente
    expect(await erros(CreateCobrancaDto, { ...base, itens: [{ descricao: 'a', valorCentavos: -5 }] })).toContain('itens');
  });

  it('cancelar exige motivo; resumo exige AAAA-MM; config exige inteiro não negativo', async () => {
    expect(await erros(CancelarCobrancaDto, { motivo: '' })).toContain('motivo');
    expect(await erros(ResumoQueryDto, { mes: '2026-13' })).toContain('mes');
    expect(await erros(ResumoQueryDto, { mes: '2026-06' })).toEqual([]);
    expect(await erros(SalvarConfigFinanceiroDto, { valorConsultaAvaliacaoCentavos: -1 })).toContain('valorConsultaAvaliacaoCentavos');
    expect(await erros(SalvarConfigFinanceiroDto, { valorConsultaAvaliacaoCentavos: 22000 })).toEqual([]);
  });
});
