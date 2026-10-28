import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { StatusAgendamento } from '../domain/agendamento.entity';
import { AgendamentosService } from './agendamentos.service';

// O psicólogo cancela os PRÓPRIOS agendamentos; admin e secretária, os da clínica toda.
// O cancelamento grava quem, quando (createdAt do log) e o status anterior.
const ctx = (papel: Papel, sub: string) => ({
  ip: '1.1.1.1', userAgent: 'jest',
  user: { sub, email: `${sub}@x.test`, papel, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
});

function criar(status: StatusAgendamento = StatusAgendamento.AGENDADO) {
  const existente = { id: 'ag-1', clinicaId: 'cli-1', pacienteId: 'pac-1', medicoId: 'psi-A', status };
  const agendamentos = {
    findById: jest.fn().mockResolvedValue(existente),
    updateStatus: jest.fn().mockResolvedValue({ ...existente, status: StatusAgendamento.CANCELADO }),
  };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const service = new AgendamentosService(agendamentos as never, auditLogs as never, {} as never, {} as never, {} as never);
  return { service, agendamentos, auditLogs };
}

describe('AgendamentosService.cancel — posse e auditoria', () => {
  it('psicólogo dono cancela o próprio agendamento', async () => {
    const { service, agendamentos } = criar();
    await expect(service.cancel('ag-1', {}, 'cli-1', ctx(Papel.PSICOLOGO, 'psi-A'))).resolves.toBeDefined();
    expect(agendamentos.updateStatus).toHaveBeenCalledWith('cli-1', 'ag-1', StatusAgendamento.CANCELADO, undefined);
  });

  it('psicólogo NÃO cancela agendamento de outro profissional: 403 e nada muda', async () => {
    const { service, agendamentos, auditLogs } = criar();
    await expect(service.cancel('ag-1', {}, 'cli-1', ctx(Papel.PSICOLOGO, 'psi-B'))).rejects.toThrow(
      new ForbiddenException('Este agendamento pertence a outro profissional.'),
    );
    expect(agendamentos.updateStatus).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  it.each([Papel.ADMIN, Papel.SECRETARIA])('%s cancela agendamento de qualquer profissional da clínica', async (papel) => {
    const { service, agendamentos } = criar();
    await expect(service.cancel('ag-1', {}, 'cli-1', ctx(papel, 'outro'))).resolves.toBeDefined();
    expect(agendamentos.updateStatus).toHaveBeenCalled();
  });

  it.each([StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO])('a auditoria grava quem cancelou e o status anterior (%s)', async (anterior) => {
    const { service, auditLogs } = criar(anterior);
    await service.cancel('ag-1', { motivoCancelamento: 'paciente avisou' }, 'cli-1', ctx(Papel.PSICOLOGO, 'psi-A'));
    expect(auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({
      event: AuditEvent.APPOINTMENT_CANCELLED,
      userId: 'psi-A',
      email: 'psi-A@x.test',
      metadata: expect.objectContaining({ agendamentoId: 'ag-1', statusAnterior: anterior, motivo: 'paciente avisou' }),
    }));
  });

  it('agendamento inexistente: 404 e nada é gravado (também para admin/secretária)', async () => {
    const { service, agendamentos, auditLogs } = criar();
    agendamentos.findById.mockResolvedValue(null);
    await expect(service.cancel('ag-1', {}, 'cli-1', ctx(Papel.SECRETARIA, 'sec-1'))).rejects.toThrow(NotFoundException);
    expect(agendamentos.updateStatus).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });
});
