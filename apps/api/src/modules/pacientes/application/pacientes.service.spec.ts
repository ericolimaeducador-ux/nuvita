import { BadRequestException, ConflictException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { PacienteRepository } from './ports/paciente.repository';
import { PacientesService, RequestAuditContext } from './pacientes.service';
import { Paciente } from '../domain/paciente.entity';

const context: RequestAuditContext = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: {
    sub: 'secretaria-1',
    email: 'secretaria@nuvita.test',
    papel: Papel.SECRETARIA,
    clinicaId: 'clinica-1',
    jti: 'jti',
    typ: 'access',
  },
};

const basePaciente: Paciente = {
  id: 'paciente-1',
  clinicaId: 'clinica-1',
  nome: 'Maria',
  ativo: true,
  criadoEm: new Date('2026-01-01T00:00:00.000Z'),
  atualizadoEm: new Date('2026-01-01T00:00:00.000Z'),
};

function serviceWith(pacientes: Record<string, jest.Mock>) {
  return new PacientesService(
    pacientes as unknown as PacienteRepository,
    { create: jest.fn() } as unknown as AuditLogRepository,
  );
}

describe('PacientesService', () => {
  it('create() repassa representante para o repositório', async () => {
    const create = jest.fn().mockResolvedValue(basePaciente);
    const service = serviceWith({ create });

    await service.create(
      { clinicaId: 'clinica-1', nome: 'Maria', representante: 'João Comercial' } as never,
      context,
    );

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ representante: 'João Comercial' }));
  });

  it('list() repassa o filtro de representante para list() e searchByName()', async () => {
    const list = jest.fn().mockResolvedValue({ items: [], hasMore: false });
    const searchByName = jest.fn().mockResolvedValue({ items: [], hasMore: false });
    const service = serviceWith({ list, searchByName });

    await service.list({ representante: 'João Comercial' } as never, context);
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ representante: 'João Comercial' }));

    await service.list({ nome: 'Maria', representante: 'João Comercial' } as never, context);
    expect(searchByName).toHaveBeenCalledWith(expect.objectContaining({ representante: 'João Comercial' }));
  });

  it('listarRepresentantes() delega ao repositório com o tenant do usuário', async () => {
    const listarRepresentantesDistintos = jest.fn().mockResolvedValue(['Ana', 'João']);
    const service = serviceWith({ listarRepresentantesDistintos });

    const resultado = await service.listarRepresentantes(undefined, context.user);

    expect(listarRepresentantesDistintos).toHaveBeenCalledWith('clinica-1');
    expect(resultado).toEqual(['Ana', 'João']);
  });
  describe('CPF duplicado (índice único {clinicaId, cpfHash})', () => {
    const erroCpf = Object.assign(new Error('E11000 duplicate key ... clinicaId_1_cpfHash_1'), {
      code: 11000,
      keyPattern: { clinicaId: 1, cpfHash: 1 },
    });

    it('create() converte E11000 do CPF em 409 com mensagem clara', async () => {
      const create = jest.fn().mockRejectedValue(erroCpf);
      const service = serviceWith({ create });

      const chamada = service.create({ clinicaId: 'clinica-1', nome: 'Maria', cpf: '52998224725' } as never, context);

      await expect(chamada).rejects.toBeInstanceOf(ConflictException);
      await expect(chamada).rejects.toThrow('Já existe um paciente com este CPF nesta clínica.');
    });

    it('não engole erros diferentes: E11000 de outro índice e falhas genéricas seguem como estão', async () => {
      const outroIndice = Object.assign(new Error('dup'), { code: 11000, keyPattern: { clinicaId: 1, outro: 1 } });
      const generico = new Error('conexão perdida');

      await expect(serviceWith({ create: jest.fn().mockRejectedValue(outroIndice) }).create({ clinicaId: 'clinica-1', nome: 'M' } as never, context)).rejects.toBe(outroIndice);
      await expect(serviceWith({ create: jest.fn().mockRejectedValue(generico) }).create({ clinicaId: 'clinica-1', nome: 'M' } as never, context)).rejects.toBe(generico);
    });
  });

  describe('responsável legal para paciente menor de idade (Fase 2)', () => {
    // Datas relativas a "hoje" (não hardcoded para um ano fixo): claramente menor
    // e claramente maior, longe de qualquer fronteira de aniversário.
    const anoAtual = new Date().getFullYear();
    const dataNascimentoMenor = `${anoAtual - 10}-06-15`;
    const dataNascimentoMaior = `${anoAtual - 40}-06-15`;

    it('create() com paciente menor SEM responsável legal → bloqueia com 400 e mensagem clara, sem tocar no repositório', async () => {
      const create = jest.fn();
      const service = serviceWith({ create });

      const chamada = service.create(
        { clinicaId: 'clinica-1', nome: 'Criança', dataNascimento: dataNascimentoMenor } as never,
        context,
      );

      await expect(chamada).rejects.toBeInstanceOf(BadRequestException);
      await expect(chamada).rejects.toThrow(/responsável legal/i);
      expect(create).not.toHaveBeenCalled();
    });

    it('create() com paciente menor, responsável legal completo e autorização confirmada → cadastra com registradaPor/registradaEm e audita PATIENT_GUARDIAN_AUTHORIZATION_SET sem vazar dado do responsável', async () => {
      const create = jest.fn().mockResolvedValue({ ...basePaciente, dataNascimento: new Date(dataNascimentoMenor) });
      const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
      const service = new PacientesService(
        { create } as unknown as PacienteRepository,
        auditLogs as unknown as AuditLogRepository,
      );

      await service.create(
        {
          clinicaId: 'clinica-1',
          nome: 'Criança',
          dataNascimento: dataNascimentoMenor,
          responsavelLegal: { nome: 'Mãe da Criança', cpf: '52998224725', telefone: '11999998888' },
          autorizacaoResponsavel: { confirmado: true },
        } as never,
        context,
      );

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          responsavelLegal: expect.objectContaining({ nome: 'Mãe da Criança' }),
          autorizacaoResponsavel: {
            confirmado: true,
            registradaPor: context.user.sub,
            registradaEm: expect.any(Date),
          },
        }),
      );

      const chamadaAudit = auditLogs.create.mock.calls.find(
        (c) => c[0].event === 'PATIENT_GUARDIAN_AUTHORIZATION_SET',
      );
      expect(chamadaAudit).toBeDefined();
      expect(chamadaAudit![0].metadata).toEqual(expect.objectContaining({ confirmado: true }));
      // A auditoria registra QUE foi confirmada, nunca os dados do responsável.
      expect(JSON.stringify(chamadaAudit![0].metadata)).not.toContain('Mãe da Criança');
    });

    it('create() de paciente maior (ou sem data de nascimento) NÃO exige responsável legal — cadastro segue normal', async () => {
      const create = jest.fn().mockResolvedValue(basePaciente);
      const service = serviceWith({ create });

      await expect(
        service.create({ clinicaId: 'clinica-1', nome: 'Adulto', dataNascimento: dataNascimentoMaior } as never, context),
      ).resolves.toBeDefined();
      await expect(
        service.create({ clinicaId: 'clinica-1', nome: 'Sem data de nascimento' } as never, context),
      ).resolves.toBeDefined();
      expect(create).toHaveBeenCalledTimes(2);
    });

    it('update() de paciente menor já com responsável cadastrado, editando só o telefone → não reexige os campos já preenchidos e preserva a autorização histórica', async () => {
      const pacienteMenorComResponsavel: Paciente = {
        ...basePaciente,
        dataNascimento: new Date(dataNascimentoMenor),
        responsavelLegal: { nome: 'Mãe', cpf: '52998224725', telefone: '11999998888' },
        autorizacaoResponsavel: { confirmado: true, registradaPor: 'user-antigo', registradaEm: new Date('2026-01-01') },
      };
      const update = jest.fn().mockResolvedValue(pacienteMenorComResponsavel);
      const service = serviceWith({
        findById: jest.fn().mockResolvedValue(pacienteMenorComResponsavel),
        update,
      });

      await service.update('paciente-1', { telefone: '11888887777' } as never, undefined, context);

      // autorizacaoResponsavel não foi tocada neste PATCH: repositório recebe undefined
      // (padrão `if (input.X !== undefined)`), preservando registradaPor/registradaEm antigos.
      expect(update).toHaveBeenCalledWith(
        'clinica-1',
        'paciente-1',
        expect.objectContaining({ telefone: '11888887777', autorizacaoResponsavel: undefined }),
      );
    });
  });

  describe('resumoPorIds() — contato efetivo (responsável legal x paciente)', () => {
    const anoAtual = new Date().getFullYear();
    const dataNascimentoMenor = `${anoAtual - 10}-06-15`;
    const dataNascimentoMaior = `${anoAtual - 40}-06-15`;

    it('paciente menor com responsável legal com e-mail → contato/nome do responsável, ehResponsavel=true', async () => {
      const pacienteMenor: Paciente = {
        ...basePaciente,
        nome: 'Joaquinzinho',
        email: 'crianca@teste.com',
        dataNascimento: new Date(dataNascimentoMenor),
        responsavelLegal: { nome: 'Mãe da Criança', email: 'mae@teste.com' },
      };
      const service = serviceWith({ findManyByIds: jest.fn().mockResolvedValue([pacienteMenor]) });

      const resumo = await service.resumoPorIds('clinica-1', ['paciente-1']);

      expect(resumo.get('paciente-1')).toEqual({
        nome: 'Joaquinzinho',
        cpf: undefined,
        email: 'mae@teste.com',
        nomeDestinatario: 'Mãe da Criança',
        ehResponsavel: true,
      });
    });

    it('paciente menor SEM e-mail do responsável cadastrado → cai no contato do próprio paciente, ehResponsavel=false', async () => {
      const pacienteMenorSemEmailDoResponsavel: Paciente = {
        ...basePaciente,
        nome: 'Joaquinzinho',
        email: 'crianca@teste.com',
        dataNascimento: new Date(dataNascimentoMenor),
        responsavelLegal: { nome: 'Mãe da Criança' }, // sem email
      };
      const service = serviceWith({ findManyByIds: jest.fn().mockResolvedValue([pacienteMenorSemEmailDoResponsavel]) });

      const resumo = await service.resumoPorIds('clinica-1', ['paciente-1']);

      expect(resumo.get('paciente-1')).toEqual({
        nome: 'Joaquinzinho',
        cpf: undefined,
        email: 'crianca@teste.com',
        nomeDestinatario: 'Joaquinzinho',
        ehResponsavel: false,
      });
    });

    it('paciente maior com responsavelLegal preenchido mesmo assim → usa o contato do próprio paciente (só "menor" ativa o responsável)', async () => {
      const pacienteMaior: Paciente = {
        ...basePaciente,
        nome: 'Adulto',
        email: 'adulto@teste.com',
        dataNascimento: new Date(dataNascimentoMaior),
        responsavelLegal: { nome: 'Alguém', email: 'alguem@teste.com' },
      };
      const service = serviceWith({ findManyByIds: jest.fn().mockResolvedValue([pacienteMaior]) });

      const resumo = await service.resumoPorIds('clinica-1', ['paciente-1']);

      expect(resumo.get('paciente-1')).toEqual(
        expect.objectContaining({ email: 'adulto@teste.com', nomeDestinatario: 'Adulto', ehResponsavel: false }),
      );
    });
  });
});
