import { TipoAtendimento } from '../../domain/prontuario.entity';
import { ProntuarioMongoRepository } from './prontuario-mongo.repository';

// BUG-025. A suíte não tem camada de banco: este teste prova a FORMA do pipeline (o filtro de assinado e o fato de o
// $match não derrubar quem só tem rascunho). O resultado no Mongo foi verificado à parte, contra o Mongo local.
function repo() {
  const aggregate = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
  return { repository: new ProntuarioMongoRepository({ aggregate } as never, {} as never), aggregate };
}

describe('ProntuarioMongoRepository.resumoSessoesAssinadasPorPaciente — forma do pipeline', () => {
  it('o $match NÃO filtra por assinatura (paciente só com rascunho precisa continuar saindo, com total 0)', async () => {
    const { repository, aggregate } = repo();
    await repository.resumoSessoesAssinadasPorPaciente('cli-1', TipoAtendimento.PSICOTERAPIA, 'psi-1');
    const pipeline = aggregate.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(pipeline[0]).toEqual({ $match: { clinicaId: 'cli-1', tipo: TipoAtendimento.PSICOTERAPIA, medicoId: 'psi-1' } });
  });

  it('o total e as datas só consideram registros com assinatura (assinado.dataAssinatura)', async () => {
    const { repository, aggregate } = repo();
    await repository.resumoSessoesAssinadasPorPaciente('cli-1', TipoAtendimento.PSICOTERAPIA);
    const pipeline = aggregate.mock.calls[0][0] as Array<{ $group?: Record<string, unknown> }>;
    const grupo = pipeline.find((e) => e.$group)!.$group!;
    const texto = JSON.stringify(grupo);
    expect(texto).toContain('assinado.dataAssinatura');
    expect(grupo['total']).not.toEqual({ $sum: 1 }); // a soma "1 por registro" era o defeito
  });
});
