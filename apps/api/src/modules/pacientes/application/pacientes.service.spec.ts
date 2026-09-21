import { ConflictException } from '@nestjs/common';
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

    it('update() converte E11000 do CPF em 409 com mensagem de atualização', async () => {
      const service = serviceWith({
        findById: jest.fn().mockResolvedValue(basePaciente),
        update: jest.fn().mockRejectedValue(erroCpf),
      });

      const chamada = service.update('paciente-1', { cpf: '52998224725' } as never, undefined, context);

      await expect(chamada).rejects.toBeInstanceOf(ConflictException);
      await expect(chamada).rejects.toThrow('Não é possível atualizar: já existe outro paciente com este CPF nesta clínica.');
    });

    it('não engole erros diferentes: E11000 de outro índice e falhas genéricas seguem como estão', async () => {
      const outroIndice = Object.assign(new Error('dup'), { code: 11000, keyPattern: { clinicaId: 1, outro: 1 } });
      const generico = new Error('conexão perdida');

      await expect(serviceWith({ create: jest.fn().mockRejectedValue(outroIndice) }).create({ clinicaId: 'clinica-1', nome: 'M' } as never, context)).rejects.toBe(outroIndice);
      await expect(serviceWith({ create: jest.fn().mockRejectedValue(generico) }).create({ clinicaId: 'clinica-1', nome: 'M' } as never, context)).rejects.toBe(generico);
    });
  });
});
