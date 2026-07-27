import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { PacienteRepository } from './ports/paciente.repository';
import { PacientesService, RequestAuditContext } from './pacientes.service';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
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
  etapaFluxo: EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO,
  etapaFluxoDesde: new Date('2026-01-01T00:00:00.000Z'),
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
});
