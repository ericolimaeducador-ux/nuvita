import { StatusAgendamento } from '../../domain/agendamento.entity';
import { AgendamentoMongoRepository } from './agendamento-mongo.repository';

// BUG-028: a consulta usa a condição ESTRITA de sobreposição e só os status ativos.
describe('AgendamentoMongoRepository.findAtivoSobreposto — consulta', () => {
  function criar() {
    const findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    return { repo: new AgendamentoMongoRepository({ findOne } as never, {} as never), findOne };
  }
  const inicio = new Date('2026-11-03T14:00:00.000Z');
  const fim = new Date('2026-11-03T14:50:00.000Z');

  it('estrita (< fim e > início), por clínica e profissional, só agendado/confirmado/concluído', async () => {
    const { repo, findOne } = criar();
    await repo.findAtivoSobreposto('cli-1', 'psi-A', inicio, fim);
    expect(findOne).toHaveBeenCalledWith({
      clinicaId: 'cli-1',
      medicoId: 'psi-A',
      status: { $in: [StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO, StatusAgendamento.CONCLUIDO] },
      dataHoraInicio: { $lt: fim },
      dataHoraFim: { $gt: inicio },
    });
  });

  it('na edição exclui o próprio agendamento', async () => {
    const { repo, findOne } = criar();
    await repo.findAtivoSobreposto('cli-1', 'psi-A', inicio, fim, '6addf7a498eae6c5fd7e9dda');
    const filtro = findOne.mock.calls[0][0];
    expect(String(filtro._id.$ne)).toBe('6addf7a498eae6c5fd7e9dda');
  });
});
