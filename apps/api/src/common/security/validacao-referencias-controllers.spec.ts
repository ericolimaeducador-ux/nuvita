import { NotFoundException } from '@nestjs/common';
import { Papel } from '../../../../../packages/shared/src/auth';
import { AgendamentosController } from '../../modules/agendamentos/presentation/agendamentos.controller';
import { DocumentosController } from '../../modules/documentos/presentation/documentos.controller';
import { ProntuariosController } from '../../modules/prontuarios/presentation/prontuarios.controller';
import { TelemedicinaController } from '../../modules/telemedicina/presentation/telemedicina.controller';

// D4: os ids do payload de criação precisam ser validados como da clínica ANTES de criar.
const user = { sub: 'u1', email: 'u@x.test', papel: Papel.SECRETARIA, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const };
const req = { headers: {}, ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' } } as never;

function agendamentosRecusando() {
  return {
    validarReferencias: jest.fn().mockRejectedValue(new NotFoundException('fora da clinica')),
    create: jest.fn(), update: jest.fn(), createBloqueio: jest.fn(),
  };
}

describe('controllers validam referências do payload (D4)', () => {
  it('agendamento: create, update (medicoId) e bloqueio', async () => {
    const svc = agendamentosRecusando();
    const c = new AgendamentosController(svc as never);
    await expect(c.create({ pacienteId: 'p', medicoId: 'm' } as never, user, req)).rejects.toThrow(NotFoundException);
    await expect(c.update('a1', { medicoId: 'm' } as never, undefined, user, req)).rejects.toThrow(NotFoundException);
    await expect(c.createBloqueio({ medicoId: 'm' } as never, user, req)).rejects.toThrow(NotFoundException);
    expect(svc.create).not.toHaveBeenCalled();
    expect(svc.update).not.toHaveBeenCalled();
    expect(svc.createBloqueio).not.toHaveBeenCalled();
  });

  it('telemedicina: createSala (paciente e agendamento)', async () => {
    const ag = agendamentosRecusando();
    const tele = { createSala: jest.fn() };
    const c = new TelemedicinaController(tele as never, ag as never);
    await expect(c.createSala({ pacienteId: 'p', agendamentoId: 'a' } as never, user, req)).rejects.toThrow(NotFoundException);
    expect(tele.createSala).not.toHaveBeenCalled();
  });

  it('documentos: presign (paciente)', async () => {
    const ag = agendamentosRecusando();
    const docs = { createUploadUrl: jest.fn() };
    const c = new DocumentosController(docs as never, ag as never);
    await expect(c.createUploadUrl({ pacienteId: 'p' } as never, user, req)).rejects.toThrow(NotFoundException);
    expect(docs.createUploadUrl).not.toHaveBeenCalled();
  });

  it('prontuário: create (paciente e agendamento)', async () => {
    const ag = agendamentosRecusando();
    const pront = { create: jest.fn() };
    const c = new ProntuariosController(pront as never, ag as never);
    await expect(c.create({ pacienteId: 'p', agendamentoId: 'a' } as never, user, req)).rejects.toThrow(NotFoundException);
    expect(pront.create).not.toHaveBeenCalled();
  });
});
