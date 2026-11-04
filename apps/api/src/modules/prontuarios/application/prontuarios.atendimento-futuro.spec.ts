import { UnprocessableEntityException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { StatusAgendamento } from '../../agendamentos/domain/agendamento.entity';
import { TipoAtendimento } from '../domain/prontuario.entity';
import { ProntuariosService } from './prontuarios.service';

// Não se registra um atendimento que ainda não começou (declaração e atestado saíram antes da hora).
const ids = { clinicaId: '6addf106f1ed2961f5111e68', pacienteId: '6addf5f398eae6c5fd7e9d4f', agendamentoId: '6addf7a498eae6c5fd7e9dda' };
const context = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'psi-1', email: 'p@x.test', papel: Papel.PSICOLOGO, clinicaId: ids.clinicaId, jti: 'j', typ: 'access' as const },
};
const dto = {
  ...ids, tipo: TipoAtendimento.PSICOTERAPIA, formulario: 'seguimento', registroPsicologico: { anotacoesLivres: 'x' },
};

function criar(inicio: Date) {
  const create = jest.fn().mockImplementation((i) => Promise.resolve({ id: 'pr-1', ...i }));
  const conclude = jest.fn().mockResolvedValue(undefined);
  const service = new ProntuariosService(
    { create, findByAgendamento: jest.fn().mockResolvedValue(null) } as never,
    { autocomplete: jest.fn() } as never,
    { create: jest.fn().mockResolvedValue(undefined) } as never,
    { getConfig: () => ({ prontuarioSignatureSecret: 's' }) } as never,
    {
      obterParaEmissao: jest.fn().mockResolvedValue({
        pacienteId: ids.pacienteId, status: StatusAgendamento.AGENDADO, dataHoraInicio: inicio,
      }),
      conclude,
    } as never,
    { findById: jest.fn() } as never,
  );
  return { service, create, conclude };
}

const emMin = (m: number) => new Date(Date.now() + m * 60_000);

describe('ProntuariosService.create — atendimento no futuro', () => {
  it('início daqui a 10 minutos: 422, nada é criado e o agendamento não é concluído', async () => {
    const { service, create, conclude } = criar(emMin(10));
    await expect(service.create(dto as never, context)).rejects.toThrow(new UnprocessableEntityException('O atendimento ainda não começou.'));
    expect(create).not.toHaveBeenCalled();
    expect(conclude).not.toHaveBeenCalled();
  });

  it('início há 1 minuto (acabou de começar): registra', async () => {
    const { service, create } = criar(emMin(-1));
    await service.create(dto as never, context);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
