import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AgendamentosService } from './agendamentos.service';

// Posse por recurso (D2) + pertencimento à clínica dos ids do payload (D4).
const agDoColega = { id: 'ag-A', clinicaId: 'cli-1', pacienteId: 'pac-1', medicoId: 'psi-A' };
const agMeu = { id: 'ag-B', clinicaId: 'cli-1', pacienteId: 'pac-1', medicoId: 'psi-B' };

const ctxDe = (sub: string, papel: Papel) => ({
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub, email: `${sub}@x.test`, papel, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
});
const psiB = ctxDe('psi-B', Papel.PSICOLOGO);
const secretaria = ctxDe('sec-1', Papel.SECRETARIA);

function criar(over: { medico?: unknown; pacientes?: Map<string, unknown> } = {}) {
  const agendamentos = {
    findById: jest.fn().mockImplementation(async (_c: string, id: string) =>
      id === 'ag-A' ? agDoColega : id === 'ag-B' ? agMeu : null),
    update: jest.fn().mockResolvedValue(agMeu),
    updateStatus: jest.fn().mockResolvedValue(agMeu),
  };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const pacientesService = {
    resumoPorIds: jest.fn().mockResolvedValue(over.pacientes ?? new Map([['pac-1', { nome: 'P' }]])),
  };
  const users = {
    findById: jest.fn().mockResolvedValue(over.medico === undefined ? { id: 'psi-B', clinicaId: 'cli-1' } : over.medico),
  };
  const service = new AgendamentosService(
    agendamentos as never, auditLogs as never, pacientesService as never, { create: jest.fn() } as never, users as never,
  );
  return { service, agendamentos, users };
}

describe('AgendamentosService – posse (D2)', () => {
  it('psicólogo NÃO lê agendamento de colega', async () => {
    const { service } = criar();
    await expect(service.findOne('ag-A', undefined, psiB)).rejects.toThrow(ForbiddenException);
  });

  it('psicólogo NÃO edita, conclui nem reatribui agendamento de colega', async () => {
    const { service, agendamentos } = criar();
    await expect(service.update('ag-A', { observacoes: 'x' }, undefined, psiB)).rejects.toThrow(ForbiddenException);
    await expect(service.conclude('ag-A', undefined, psiB)).rejects.toThrow(ForbiddenException);
    expect(agendamentos.update).not.toHaveBeenCalled();
    expect(agendamentos.updateStatus).not.toHaveBeenCalled();
  });

  it('psicólogo NÃO passa o próprio agendamento para outro profissional', async () => {
    const { service } = criar();
    await expect(service.update('ag-B', { medicoId: 'psi-A' }, undefined, psiB)).rejects.toThrow(ForbiddenException);
  });

  it('psicólogo opera o próprio agendamento', async () => {
    const { service } = criar();
    await expect(service.findOne('ag-B', undefined, psiB)).resolves.toBeDefined();
    await expect(service.update('ag-B', { observacoes: 'x' }, undefined, psiB)).resolves.toBeDefined();
    await expect(service.conclude('ag-B', undefined, psiB)).resolves.toBeDefined();
  });

  it('secretária segue com a clínica inteira', async () => {
    const { service } = criar();
    await expect(service.findOne('ag-A', undefined, secretaria)).resolves.toBeDefined();
    await expect(service.cancel('ag-A', { motivoCancelamento: 'm' } as never, undefined, secretaria)).resolves.toBeDefined();
  });
});

describe('AgendamentosService.validarReferencias – ids do payload na clínica (D4)', () => {
  it('paciente que não é da clínica → 404', async () => {
    const { service } = criar({ pacientes: new Map() });
    await expect(service.validarReferencias({ pacienteId: 'pac-X' }, undefined, secretaria)).rejects.toThrow(NotFoundException);
  });

  it('profissional de outra clínica ou inexistente → 404', async () => {
    const outra = criar({ medico: { id: 'm', clinicaId: 'cli-2' } });
    await expect(outra.service.validarReferencias({ medicoId: 'm' }, undefined, secretaria)).rejects.toThrow(NotFoundException);
    const nenhum = criar({ medico: null });
    await expect(nenhum.service.validarReferencias({ medicoId: 'm' }, undefined, secretaria)).rejects.toThrow(NotFoundException);
  });

  it('agendamento de outra clínica/inexistente → 404; de colega, para psicólogo → 403', async () => {
    const { service } = criar();
    await expect(service.validarReferencias({ agendamentoId: 'ag-Z' }, undefined, secretaria)).rejects.toThrow(NotFoundException);
    await expect(service.validarReferencias({ agendamentoId: 'ag-A' }, undefined, psiB)).rejects.toThrow(ForbiddenException);
  });

  it('referências válidas passam', async () => {
    const { service } = criar();
    await expect(
      service.validarReferencias({ pacienteId: 'pac-1', medicoId: 'psi-B', agendamentoId: 'ag-B' }, undefined, psiB),
    ).resolves.toBeUndefined();
  });
});
