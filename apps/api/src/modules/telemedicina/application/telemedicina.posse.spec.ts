import { ForbiddenException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { TelemedicinaService } from './telemedicina.service';

// Posse por recurso (D2): psicólogo só vê/encerra a sala em que ele é o profissional.
const sala = (medicoId: string, id = 's1') => ({
  id, clinicaId: 'cli-1', agendamentoId: 'ag-1', pacienteId: 'pac-1', medicoId, status: 'aguardando',
});
const ctxDe = (sub: string, papel: Papel) => ({
  ip: '127.0.0.1', userAgent: 'jest',
  user: { sub, email: `${sub}@x.test`, papel, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
});

function criar(medicoDaSala: string) {
  const salas = {
    findById: jest.fn().mockResolvedValue(sala(medicoDaSala)),
    findByAgendamento: jest.fn().mockResolvedValue(sala(medicoDaSala)),
    updateStatus: jest.fn().mockResolvedValue(sala(medicoDaSala)),
    findAll: jest.fn().mockResolvedValue([sala('psi-A', 's1'), sala('psi-B', 's2')]),
  };
  const eventos = { listBySala: jest.fn().mockResolvedValue([]) };
  const service = new TelemedicinaService(
    salas as never, eventos as never, {} as never, { create: jest.fn() } as never, {} as never, {} as never, {} as never,
  );
  return { service, salas, eventos };
}

describe('TelemedicinaService – posse (D2)', () => {
  const psiB = ctxDe('psi-B', Papel.PSICOLOGO);

  it('psicólogo NÃO consulta sala de colega (findById, findByAgendamento, eventos)', async () => {
    const { service, eventos } = criar('psi-A');
    await expect(service.findById('s1', undefined, psiB)).rejects.toThrow(ForbiddenException);
    await expect(service.findByAgendamento('ag-1', undefined, psiB)).rejects.toThrow(ForbiddenException);
    await expect(service.listarEventos('s1', undefined, psiB)).rejects.toThrow(ForbiddenException);
    expect(eventos.listBySala).not.toHaveBeenCalled();
  });

  it('psicólogo NÃO encerra sala de colega', async () => {
    const { service, salas } = criar('psi-A');
    await expect(service.encerrarSala('s1', undefined, psiB)).rejects.toThrow(ForbiddenException);
    expect(salas.updateStatus).not.toHaveBeenCalled();
  });

  it('histórico de salas do psicólogo traz só as dele', async () => {
    const { service } = criar('psi-A');
    const lista = await service.listar({}, psiB);
    expect(lista.map((s: { id: string }) => s.id)).toEqual(['s2']);
  });

  it('psicólogo opera a própria sala; admin vê a clínica inteira', async () => {
    const { service } = criar('psi-B');
    await expect(service.findById('s1', undefined, psiB)).resolves.toBeDefined();
    await expect(service.encerrarSala('s1', undefined, psiB)).resolves.toBeDefined();
    const doColega = criar('psi-A');
    await expect(doColega.service.findById('s1', undefined, ctxDe('adm', Papel.ADMIN))).resolves.toBeDefined();
  });
});
