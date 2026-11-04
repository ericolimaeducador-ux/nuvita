import { UnprocessableEntityException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { StatusAgendamento } from '../domain/agendamento.entity';
import { AgendamentosService } from './agendamentos.service';

// Concluir exige que o atendimento tenha começado; editar o horário é auditado (valor anterior e novo).
const emMin = (m: number) => new Date(Date.now() + m * 60_000);
const ctx = {
  ip: '1.1.1.1', userAgent: 'jest',
  user: { sub: 'psi-A', email: 'a@x.test', papel: Papel.PSICOLOGO, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
};

function criar(inicio: Date, fim: Date) {
  const atual = { id: 'ag-1', clinicaId: 'cli-1', pacienteId: 'pac-1', medicoId: 'psi-A', status: StatusAgendamento.AGENDADO, dataHoraInicio: inicio, dataHoraFim: fim };
  const agendamentos = {
    findById: jest.fn().mockResolvedValue(atual),
    findAtivoSobreposto: jest.fn().mockResolvedValue(null), // BUG-028: update() com horário consulta sobreposição (setup ajustado)
    updateStatus: jest.fn().mockResolvedValue({ ...atual, status: StatusAgendamento.CONCLUIDO }),
    update: jest.fn().mockImplementation(async (_c: string, _i: string, d: Record<string, unknown>) => ({ ...atual, ...d })),
  };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const service = new AgendamentosService(agendamentos as never, auditLogs as never, {} as never, { create: jest.fn() } as never, {} as never);
  return { service, agendamentos, auditLogs, atual };
}

describe('AgendamentosService.conclude — atendimento no futuro', () => {
  it('início no futuro: 422 e o status não muda', async () => {
    const { service, agendamentos } = criar(emMin(30), emMin(80));
    await expect(service.conclude('ag-1', 'cli-1', ctx)).rejects.toThrow(new UnprocessableEntityException('O atendimento ainda não começou.'));
    expect(agendamentos.updateStatus).not.toHaveBeenCalled();
  });

  it('já começou: conclui', async () => {
    const { service, agendamentos } = criar(emMin(-5), emMin(45));
    await service.conclude('ag-1', 'cli-1', ctx);
    expect(agendamentos.updateStatus).toHaveBeenCalled();
  });
});

describe('AgendamentosService.update — auditoria do horário', () => {
  it('mudar início e fim grava evento com valor anterior e novo (quem = userId do log)', async () => {
    const { service, auditLogs, atual } = criar(emMin(-60), emMin(-10));
    const novoInicio = emMin(-120);
    const novoFim = emMin(-70);
    await service.update('ag-1', { dataHoraInicio: novoInicio.toISOString(), dataHoraFim: novoFim.toISOString() } as never, 'cli-1', ctx);
    const evento = auditLogs.create.mock.calls.map((c) => c[0]).find((e) => e.event === AuditEvent.APPOINTMENT_TIME_CHANGED);
    expect(evento).toBeDefined();
    expect(evento.userId).toBe('psi-A');
    expect(evento.metadata).toMatchObject({
      agendamentoId: 'ag-1',
      inicioAnterior: atual.dataHoraInicio.toISOString(),
      inicioNovo: novoInicio.toISOString(),
      fimAnterior: atual.dataHoraFim.toISOString(),
      fimNovo: novoFim.toISOString(),
    });
  });

  it('editar só observações NÃO grava o evento de horário', async () => {
    const { service, auditLogs } = criar(emMin(-60), emMin(-10));
    await service.update('ag-1', { observacoes: 'x' } as never, 'cli-1', ctx);
    expect(auditLogs.create.mock.calls.map((c) => c[0].event)).not.toContain(AuditEvent.APPOINTMENT_TIME_CHANGED);
  });

  it('mandar o mesmo horário que já existe não conta como mudança', async () => {
    const { service, auditLogs, atual } = criar(emMin(-60), emMin(-10));
    await service.update('ag-1', { dataHoraInicio: atual.dataHoraInicio.toISOString() } as never, 'cli-1', ctx);
    expect(auditLogs.create.mock.calls.map((c) => c[0].event)).not.toContain(AuditEvent.APPOINTMENT_TIME_CHANGED);
  });
});
