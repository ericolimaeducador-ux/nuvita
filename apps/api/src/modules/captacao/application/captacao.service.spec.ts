import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { readFileSync } from 'fs';
import { Logger } from '@nestjs/common';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { PacienteRepository } from '../../pacientes/application/ports/paciente.repository';
import { ClassificacaoArea, Paciente } from '../../pacientes/domain/paciente.entity';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AppConfigService } from '../../../common/security/config.service';
import { PacienteCryptoService } from '../../pacientes/infrastructure/crypto/paciente-crypto.service';
import { RequestAuditContext } from '../../pacientes/application/pacientes.service';
import { CapitacaoPacienteSchema } from '../infrastructure/mongo/capitacao-paciente.schema';
import { UpdateCaptacaoDto } from './dto/update-captacao.dto';
import { CreateCaptacaoDto } from './dto/create-captacao.dto';
import { CaptacaoService } from './captacao.service';

const crypto = new PacienteCryptoService({
  getConfig: () => ({
    patientDataEncryptionKey: Buffer.from('0123456789abcdef0123456789abcdef').toString('base64'),
    patientDataHashKey: Buffer.from('abcdef0123456789abcdef0123456789').toString('base64'),
  }),
} as unknown as AppConfigService);

const context: RequestAuditContext = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: {
    sub: 'sec-1',
    email: 'sec@nuvita.test',
    papel: Papel.SECRETARIA,
    clinicaId: '65f000000000000000000d01',
    jti: 'jti',
    typ: 'access',
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- documento Mongo em memória, formato livre
type Doc = Record<string, any>;

/** Model em memória com findOneAndUpdate atômico (filtro + $set no mesmo tick síncrono), como no Mongo. */
function fakeModel(initial: Doc[] = []) {
  const docs: Doc[] = initial.map((d) => ({ ...d }));
  const get = (id: string) => docs.find((d) => d._id === id);
  const exec = <T>(fn: () => T) => ({ exec: () => Promise.resolve(fn()) });
  const model = {
    docs,
    create: jest.fn(async (data: Doc) => {
      const doc = { _id: `c${docs.length + 1}`, ...data };
      docs.push(doc);
      return doc;
    }),
    findById: jest.fn((id: string) => exec(() => get(id) ?? null)),
    findOneAndUpdate: jest.fn((q: Doc, update: Doc) =>
      exec(() => {
        const d = get(q._id);
        const lockOk = !q.$or || !d?.exportandoEm || d.exportandoEm < q.$or[2].exportandoEm.$lt;
        if (!d || d.status !== q.status || !lockOk) return null;
        Object.assign(d, update.$set);
        return d;
      }),
    ),
    updateOne: jest.fn((q: Doc, update: Doc) =>
      exec(() => {
        const d = get(q._id);
        if (!d) return;
        Object.assign(d, update.$set ?? {});
        for (const k of Object.keys(update.$unset ?? {})) delete d[k];
      }),
    ),
  };
  return model;
}

function pendente(extra: Doc = {}): Doc {
  return {
    _id: '65f000000000000000000c01',
    nome: 'Maria',
    cpf: crypto.encryptString('52998224725'),
    cpfHash: crypto.cpfHash('52998224725'),
    telefone: crypto.encryptString('11999990000'),
    email: crypto.encryptString('maria@x.com'),
    endereco: crypto.encryptString('Rua A, 1'),
    codigoEnfermeiro: 'ENF-00326',
    dataNascimento: new Date('1980-05-10T00:00:00Z'),
    status: 'pendente',
    criadoEm: new Date('2026-10-19T12:00:00Z'),
    ...extra,
  };
}

function setup(initial: Doc[], pacientesOverrides: Record<string, jest.Mock> = {}) {
  const model = fakeModel(initial);
  const pacientes = {
    create: jest.fn(async () => {
      await new Promise((r) => setImmediate(r)); // cede o event loop: simula I/O
      return { id: 'pac-1' };
    }),
    updateObservacoes: jest.fn(async () => ({ id: 'pac-1' })),
    ...pacientesOverrides,
  };
  const auditCreate = jest.fn().mockResolvedValue(undefined);
  const service = new CaptacaoService(model as never, crypto, pacientes as never, { create: auditCreate } as never);
  return { model, pacientes, service, auditCreate };
}

describe('CaptacaoService.exportar', () => {
  it('cadastra o paciente com representante = código do enfermeiro e observação de origem', async () => {
    const { service, pacientes, model } = setup([pendente()]);

    const r = await service.exportar('65f000000000000000000c01', context);

    expect(r.pacienteId).toBe('pac-1');
    expect(pacientes.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicaId: '65f000000000000000000d01',
        classificacoes: [ClassificacaoArea.IU],
        nome: 'Maria',
        cpf: '52998224725',
        telefone: '11999990000',
        representante: 'ENF-00326',
      }),
      context,
    );
    expect(pacientes.updateObservacoes).toHaveBeenCalledWith(
      'pac-1',
      { observacoes: 'Origem: Captação Externa. Enfermeiro captador: ENF-00326.' },
      '65f000000000000000000d01',
      context,
    );
    expect(model.docs[0]).toMatchObject({ status: 'exportado', pacienteId: 'pac-1', clinicaId: '65f000000000000000000d01' });
    expect(model.docs[0].exportandoEm).toBeUndefined();
  });

  it('não cria prontuário vazio: o serviço só depende de model, crypto, PacientesService e auditoria', () => {
    expect(CaptacaoService.length).toBe(4); // model, crypto, PacientesService e auditoria
    const src = readFileSync(require.resolve('./captacao.service'), 'utf8');
    expect(src).not.toMatch(/[Pp]rontuarios?Service|ProntuarioMongo/);
  });

  it('duplo-clique concorrente no MESMO id cria o paciente uma única vez', async () => {
    const { service, pacientes } = setup([pendente()]);

    const resultados = await Promise.allSettled([
      service.exportar('65f000000000000000000c01', context),
      service.exportar('65f000000000000000000c01', context),
    ]);

    expect(pacientes.create).toHaveBeenCalledTimes(1);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejeitada = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejeitada.reason.status).toBe(409);
  });

  it('re-exportar um já exportado é recusado sem criar outro paciente', async () => {
    const { service, pacientes } = setup([pendente({ status: 'exportado' })]);
    await expect(service.exportar('65f000000000000000000c01', context)).rejects.toMatchObject({ status: 400 });
    expect(pacientes.create).not.toHaveBeenCalled();
  });

  it('lock expirado (>2 min) pode ser retomado; lock fresco bloqueia', async () => {
    const velho = pendente({ exportandoEm: new Date(Date.now() - 3 * 60 * 1000) });
    const fresco = pendente({ exportandoEm: new Date(Date.now() - 10 * 1000) });

    await expect(setup([velho]).service.exportar('65f000000000000000000c01', context)).resolves.toMatchObject({ success: true });
    await expect(setup([fresco]).service.exportar('65f000000000000000000c01', context)).rejects.toMatchObject({ status: 409 });
  });

  it('falha ao criar o paciente libera o lock e mantém a captação pendente', async () => {
    const { service, model } = setup([pendente()], {
      create: jest.fn().mockRejectedValue(new Error('boom')),
    });

    await expect(service.exportar('65f000000000000000000c01', context)).rejects.toThrow('boom');

    expect(model.docs[0].status).toBe('pendente');
    expect(model.docs[0].exportandoEm).toBeUndefined();
  });

  it('falha só na observação não aborta a exportação e o aviso não vaza PII', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const { service, model } = setup([pendente()], {
      updateObservacoes: jest.fn().mockRejectedValue(new Error('Paciente nao encontrado.')),
    });

    await service.exportar('65f000000000000000000c01', context);

    expect(model.docs[0].status).toBe('exportado');
    const log = warn.mock.calls.map((c) => String(c[0])).join('\n');
    expect(log).toContain('pac-1');
    for (const pii of ['52998224725', '11999990000', 'maria@x.com', 'Rua A', 'Maria']) {
      expect(log).not.toContain(pii);
    }
    warn.mockRestore();
  });

  it('exige clínica no contexto', async () => {
    const { service } = setup([pendente()]);
    const semClinica = { ...context, user: { ...context.user, clinicaId: undefined } };
    await expect(service.exportar('65f000000000000000000c01', semClinica as never)).rejects.toMatchObject({ status: 400 });
  });

  it('id inexistente → 404', async () => {
    await expect(setup([]).service.exportar('nada', context)).rejects.toMatchObject({ status: 404 });
  });
});

describe('CaptacaoService.create (cadastro parcial)', () => {
  it('aceita só telefone + código do enfermeiro; sem CPF não grava cpf/cpfHash', async () => {
    const { service, model } = setup([]);

    await service.create({ telefone: ' 11988887777 ', codigoEnfermeiro: 'ENF-00126' }, { ip: '127.0.0.1', userAgent: 'jest' });

    const salvo = model.docs[0];
    expect(salvo).not.toHaveProperty('cpf');
    expect(salvo).not.toHaveProperty('cpfHash');
    expect(salvo).not.toHaveProperty('nome');
    expect(salvo.status).toBe('pendente');
    expect(crypto.decryptString(salvo.telefone)).toBe('11988887777');
  });

  it('criptografa CPF, telefone, e-mail e endereço (nada em claro no documento)', async () => {
    const { service, model } = setup([]);
    await service.create({
      nome: 'Ana',
      cpf: '529.982.247-25',
      telefone: '11988887777',
      email: 'Ana@X.com',
      endereco: 'Rua B, 2',
      codigoEnfermeiro: 'ENF-00126',
    }, { ip: '127.0.0.1', userAgent: 'jest' });
    const raw = JSON.stringify(model.docs[0]);
    for (const claro of ['52998224725', '11988887777', 'ana@x.com', 'Rua B']) expect(raw).not.toContain(claro);
    expect(model.docs[0].cpfHash).toBe(crypto.cpfHash('52998224725'));
  });

  it('CPF duplicado pendente (E11000) vira 409', async () => {
    const { service, model } = setup([]);
    model.create.mockRejectedValueOnce({ code: 11000 });
    await expect(
      service.create({ cpf: '52998224725', telefone: '1', codigoEnfermeiro: 'ENF-00126' }, { ip: '127.0.0.1', userAgent: 'jest' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('sem nome, a exportação cadastra "Interessado sem nome (telefone)"', async () => {
    const { service, pacientes } = setup([
      pendente({ nome: undefined, cpf: undefined, cpfHash: undefined, email: undefined, endereco: undefined }),
    ]);

    await service.exportar('65f000000000000000000c01', context);

    expect(pacientes.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Interessado sem nome (11999990000)',
        cpf: undefined,
        endereco: undefined,
      }),
      context,
    );
  });
});


describe('CaptacaoService — exportação de lead para paciente do fluxo de IU (etapa 4a)', () => {
  it('o paciente criado nasce com classificacoes=[IU] e etapaFluxo=AGUARDANDO_ATENDIMENTO (PacientesService real)', async () => {
    const criado: Paciente = {
      id: 'pac-1', clinicaId: '65f000000000000000000d01', nome: 'Maria', ativo: true, criadoEm: new Date(), atualizadoEm: new Date(),
      classificacoes: [ClassificacaoArea.IU], etapaFluxo: EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO,
    };
    const repoCreate = jest.fn().mockResolvedValue(criado);
    const pacienteRepo = {
      create: repoCreate,
      findById: jest.fn().mockResolvedValue(criado),
      update: jest.fn().mockResolvedValue(criado),
    } as unknown as PacienteRepository;
    const pacientesReal = new PacientesService(pacienteRepo, { create: jest.fn().mockResolvedValue(undefined) } as never);
    const model = fakeModel([pendente()]);
    const service = new CaptacaoService(model as never, crypto, pacientesReal, { create: jest.fn().mockResolvedValue(undefined) } as never);

    const r = await service.exportar('65f000000000000000000c01', context);

    expect(r.pacienteId).toBe('pac-1');
    expect(repoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicaId: '65f000000000000000000d01',
        classificacoes: [ClassificacaoArea.IU],
        etapaFluxo: EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO,
      }),
    );
    expect(model.docs[0]).toMatchObject({ status: 'exportado', pacienteId: 'pac-1' });
  });

  it('lead sem data de nascimento NÃO é exportado: 400 listando só o NOME do campo, lead segue pendente e destravado', async () => {
    const { service, pacientes, model } = setup([pendente({ dataNascimento: undefined })]);

    await expect(service.exportar('65f000000000000000000c01', context)).rejects.toMatchObject({ status: 400 });
    await expect(service.exportar('65f000000000000000000c01', context)).rejects.toThrow(/dataNascimento/);

    expect(pacientes.create).not.toHaveBeenCalled();
    expect(model.docs[0].status).toBe('pendente');
    expect(model.docs[0].exportandoEm).toBeUndefined();
  });

  it('lead com CPF inválido não é exportado (validação do cadastro de paciente)', async () => {
    const { service, pacientes } = setup([pendente({ cpf: crypto.encryptString('11111111111') })]);

    await expect(service.exportar('65f000000000000000000c01', context)).rejects.toThrow(/cpf/);
    expect(pacientes.create).not.toHaveBeenCalled();
  });

  it('id que não é ObjectId → 404 sem tocar no banco', async () => {
    const { service, model } = setup([]);
    await expect(service.exportar('../x', context)).rejects.toMatchObject({ status: 404 });
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('audita CAPTACAO_EXPORTED só com ids; a criação pública audita CAPTACAO_CREATED sem dado pessoal', async () => {
    const exp = setup([pendente()]);
    await exp.service.exportar('65f000000000000000000c01', context);
    const chamada = exp.auditCreate.mock.calls[0][0];
    expect(chamada.event).toBe(AuditEvent.CAPTACAO_EXPORTED);
    expect(chamada.metadata).toEqual({ clinicaId: '65f000000000000000000d01', captacaoId: '65f000000000000000000c01', pacienteId: 'pac-1' });

    const pub = setup([]);
    await pub.service.create({ nome: 'Ana', cpf: '52998224725', telefone: '11988887777', codigoEnfermeiro: 'ENF-00126' }, { ip: '9.9.9.9', userAgent: 'ua' });
    const c2 = pub.auditCreate.mock.calls[0][0];
    expect(c2).toMatchObject({ event: AuditEvent.CAPTACAO_CREATED, ip: '9.9.9.9', userAgent: 'ua' });
    expect(JSON.stringify(c2)).not.toMatch(/Ana|52998224725|11988887777/);
  });
});

describe('CaptacaoService.atualizar — completar o lead antes de exportar (etapa 4a)', () => {
  const ID = '65f000000000000000000c01';

  it('completar a data de nascimento de um lead travado permite exportar (salvar NÃO exporta)', async () => {
    const { service, pacientes, model } = setup([pendente({ dataNascimento: undefined })]);

    await expect(service.exportar(ID, context)).rejects.toMatchObject({ status: 400 });
    expect(pacientes.create).not.toHaveBeenCalled();

    const r = await service.atualizar(ID, { dataNascimento: '1985-02-20' }, context);

    expect(r.data.dataNascimento).toBe('1985-02-20T00:00:00.000Z');
    expect(model.docs[0].status).toBe('pendente'); // só salvou
    expect(pacientes.create).not.toHaveBeenCalled();

    await expect(service.exportar(ID, context)).resolves.toMatchObject({ success: true, pacienteId: 'pac-1' });
    expect(pacientes.create).toHaveBeenCalledTimes(1);
  });

  it('criptografa CPF, endereço, e-mail e responsável legal (nada em claro no documento)', async () => {
    const { service, model } = setup([pendente()]);

    await service.atualizar(
      ID,
      {
        cpf: '529.982.247-25',
        email: 'Mae@X.com',
        endereco: 'Rua Z, 9',
        responsavelLegal: { nome: 'Mae Silva', cpf: '39053344705', telefone: '11977776666' },
        autorizacaoResponsavel: { confirmado: true },
      },
      context,
    );

    const raw = JSON.stringify(model.docs[0]);
    for (const claro of ['52998224725', 'mae@x.com', 'Rua Z', 'Mae Silva', '39053344705', '11977776666']) {
      expect(raw).not.toContain(claro);
    }
    expect(model.docs[0].cpfHash).toBe(crypto.cpfHash('52998224725'));
    expect(model.docs[0].autorizacaoResponsavelConfirmada).toBe(true);
  });

  it('audita CAPTACAO_UPDATED só com o id e os NOMES dos campos', async () => {
    const { service, auditCreate } = setup([pendente()]);

    await service.atualizar(ID, { nome: 'Nome Novo Sigiloso', dataNascimento: '1985-02-20' }, context);

    const chamada = auditCreate.mock.calls[0][0];
    expect(chamada.event).toBe(AuditEvent.CAPTACAO_UPDATED);
    expect(chamada.metadata).toEqual({ captacaoId: ID, campos: ['nome', 'dataNascimento'] });
    expect(JSON.stringify(chamada)).not.toMatch(/Sigiloso|1985/);
  });

  it('lead já exportado → 400; inexistente → 404; id inválido → 404; payload vazio → 400; CPF duplicado → 409', async () => {
    await expect(setup([pendente({ status: 'exportado' })]).service.atualizar(ID, { nome: 'x' }, context)).rejects.toMatchObject({ status: 400 });
    await expect(setup([]).service.atualizar(ID, { nome: 'x' }, context)).rejects.toMatchObject({ status: 404 });
    await expect(setup([]).service.atualizar('../x', { nome: 'x' }, context)).rejects.toMatchObject({ status: 404 });
    await expect(setup([pendente()]).service.atualizar(ID, {}, context)).rejects.toMatchObject({ status: 400 });

    const dup = setup([pendente()]);
    dup.model.findOneAndUpdate.mockImplementationOnce(() => ({ exec: () => Promise.reject({ code: 11000 }) }));
    await expect(dup.service.atualizar(ID, { cpf: '52998224725' }, context)).rejects.toMatchObject({ status: 409 });
  });

  describe('menor de idade (PacientesService real)', () => {
    function comPacienteReal() {
      const criado: Paciente = {
        id: 'pac-1', clinicaId: '65f000000000000000000d01', nome: 'Crianca', ativo: true, criadoEm: new Date(), atualizadoEm: new Date(),
        classificacoes: [ClassificacaoArea.IU], etapaFluxo: EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO,
      };
      const repoCreate = jest.fn().mockResolvedValue(criado);
      const pacienteRepo = {
        create: repoCreate,
        findById: jest.fn().mockResolvedValue(criado),
        update: jest.fn().mockResolvedValue(criado),
      } as unknown as PacienteRepository;
      const real = new PacientesService(pacienteRepo, { create: jest.fn().mockResolvedValue(undefined) } as never);
      const model = fakeModel([pendente({ dataNascimento: undefined })]);
      const service = new CaptacaoService(model as never, crypto, real, { create: jest.fn().mockResolvedValue(undefined) } as never);
      return { service, model, repoCreate };
    }
    const nascimentoMenor = new Date(Date.now() - 8 * 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    it('menor SEM responsável legal continua recusado na exportação; o lead segue pendente e destravado', async () => {
      const { service, model, repoCreate } = comPacienteReal();
      await service.atualizar(ID, { dataNascimento: nascimentoMenor }, context);

      await expect(service.exportar(ID, context)).rejects.toMatchObject({ status: 400 });

      expect(repoCreate).not.toHaveBeenCalled();
      expect(model.docs[0].status).toBe('pendente');
      expect(model.docs[0].exportandoEm).toBeUndefined();
    });

    it('menor COM responsável legal e autorização completados no lead é exportado, com o responsável no cadastro', async () => {
      const { service, repoCreate } = comPacienteReal();
      await service.atualizar(
        ID,
        {
          dataNascimento: nascimentoMenor,
          responsavelLegal: { nome: 'Mae Silva', cpf: '39053344705', telefone: '11977776666' },
          autorizacaoResponsavel: { confirmado: true },
        },
        context,
      );

      await expect(service.exportar(ID, context)).resolves.toMatchObject({ success: true });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({ responsavelLegal: expect.objectContaining({ nome: 'Mae Silva' }) }),
      );
    });
  });
});

describe('UpdateCaptacaoDto', () => {
  const erros = async (obj: object) =>
    (await validate(plainToInstance(UpdateCaptacaoDto, obj), { whitelist: true, forbidNonWhitelisted: true })).map((e) => e.property);

  it('todos os campos são opcionais; aceita os válidos', async () => {
    expect(await erros({})).toEqual([]);
    expect(await erros({ dataNascimento: '1985-02-20', cpf: '529.982.247-25', nome: 'Ana' })).toEqual([]);
  });

  it('mesmas regras do cadastro de paciente: CPF com dígitos inválidos e data futura são recusados', async () => {
    expect(await erros({ cpf: '11111111111' })).toContain('cpf');
    expect(await erros({ dataNascimento: '2999-01-01' })).toContain('dataNascimento');
    expect(await erros({ dataNascimento: 'ontem' })).toContain('dataNascimento');
    expect(await erros({ responsavelLegal: { cpf: '123' } })).toContain('responsavelLegal');
  });

  it('telefone, código do captador e status NÃO são editáveis por esta rota', async () => {
    const e = await erros({ telefone: '1', codigoEnfermeiro: 'ENF-00126', status: 'exportado' });
    expect(e).toEqual(expect.arrayContaining(['telefone', 'codigoEnfermeiro', 'status']));
  });
});

describe('CreateCaptacaoDto', () => {
  const erros = async (obj: object) =>
    (await validate(plainToInstance(CreateCaptacaoDto, obj))).map((e) => e.property);

  it('só telefone + código do enfermeiro são obrigatórios', async () => {
    expect(await erros({ telefone: '11999990000', codigoEnfermeiro: 'ENF-00126' })).toEqual([]);
    expect(await erros({ codigoEnfermeiro: 'ENF-00126' })).toEqual(['telefone']);
    expect(await erros({ telefone: '11999990000' })).toEqual(['codigoEnfermeiro']);
  });

  it('rejeita código de enfermeiro fora da lista e CPF malformado', async () => {
    expect(await erros({ telefone: '1', codigoEnfermeiro: 'ENF-99999' })).toEqual(['codigoEnfermeiro']);
    expect(await erros({ telefone: '1', codigoEnfermeiro: 'ENF-00126', cpf: '123' })).toEqual(['cpf']);
  });
});

describe('Schema capitacao_paciente — índice único de CPF e ausência de delete físico', () => {
  const idx = CapitacaoPacienteSchema.indexes().find(([campos]) => 'cpfHash' in campos);

  it('é único e parcial: só captações pendentes COM cpfHash string entram no índice', () => {
    expect(idx).toBeDefined();
    const [, opts] = idx!;
    expect(opts.unique).toBe(true);
    expect(opts.partialFilterExpression).toEqual({ status: 'pendente', cpfHash: { $type: 'string' } });
  });

  it('o filtro parcial exclui exportadas e sem CPF (avaliado sobre documentos de exemplo)', () => {
    const f = idx![1].partialFilterExpression as { status: string; cpfHash: { $type: string } };
    const entra = (d: Doc) => d.status === f.status && typeof d.cpfHash === f.cpfHash.$type;
    expect(entra({ status: 'pendente', cpfHash: 'abc' })).toBe(true);
    expect(entra({ status: 'pendente' })).toBe(false); // sem CPF: vários permitidos
    expect(entra({ status: 'exportado', cpfHash: 'abc' })).toBe(false); // exportada: CPF reutilizável
  });

  it('o serviço não faz delete físico', () => {
    const src = readFileSync(require.resolve('./captacao.service'), 'utf8');
    expect(src).not.toMatch(/deleteOne|deleteMany|findByIdAndDelete|findOneAndDelete|\.remove\(/);
  });
});
