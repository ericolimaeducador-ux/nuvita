import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AgendamentosService } from './agendamentos.service';

// obterParaEmissao: leitura silenciosa (sem auditoria de "visualizou") para o servidor montar documentos.
const ag = { id: 'ag-1', clinicaId: 'cli-1', pacienteId: 'pac-1', medicoId: 'psi-A' };
const userDe = (sub: string, papel: Papel) => ({ sub, email: 'x@x.test', papel, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const });

function criar() {
  const agendamentos = { findById: jest.fn().mockImplementation(async (_c: string, id: string) => (id === 'ag-1' ? ag : null)) };
  const service = new AgendamentosService(
    agendamentos as never, { create: jest.fn() } as never, {} as never, {} as never, {} as never,
  );
  return { service, agendamentos };
}

describe('AgendamentosService.obterParaEmissao', () => {
  it('devolve o agendamento da clínica do token', async () => {
    const { service, agendamentos } = criar();
    await expect(service.obterParaEmissao('cli-1', 'ag-1', userDe('sec', Papel.SECRETARIA))).resolves.toMatchObject({ id: 'ag-1' });
    expect(agendamentos.findById).toHaveBeenCalledWith('cli-1', 'ag-1');
  });

  it('inexistente → 404; enfermeiro de outro profissional → 403; o dono passa', async () => {
    const { service } = criar();
    await expect(service.obterParaEmissao('cli-1', 'ag-9', userDe('sec', Papel.SECRETARIA))).rejects.toThrow(NotFoundException);
    await expect(service.obterParaEmissao('cli-1', 'ag-1', userDe('psi-B', Papel.ENFERMEIRO))).rejects.toThrow(ForbiddenException);
    await expect(service.obterParaEmissao('cli-1', 'ag-1', userDe('psi-A', Papel.ENFERMEIRO))).resolves.toBeDefined();
  });
});
