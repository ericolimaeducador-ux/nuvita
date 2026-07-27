import { Connection } from 'mongoose';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { AnalyticsService } from './analytics.service';

/** Stub de uma collection cujo aggregate().toArray() resolve para `resultado`. */
function connectionStub(resultado: unknown[]) {
  const toArray = jest.fn().mockResolvedValue(resultado);
  const aggregate = jest.fn().mockReturnValue({ toArray });
  const collection = jest.fn().mockReturnValue({ aggregate });
  return { connection: { collection } as unknown as Connection, aggregate, collection };
}

describe('AnalyticsService', () => {
  it('pacientesPorEtapaFluxo preenche com zero as etapas sem paciente, em vez de omiti-las', async () => {
    const { connection } = connectionStub([
      { _id: EtapaFluxoClinico.AVALIACAO_IU, total: 3 },
      { _id: EtapaFluxoClinico.CONCLUIDO, total: 1 },
    ]);
    const service = new AnalyticsService(connection);

    const resultado = await service.pacientesPorEtapaFluxo('clinica-1');

    // As 9 etapas do fluxo aparecem sempre, na ordem do pipeline.
    expect(resultado).toHaveLength(9);
    expect(resultado.find((r) => r.etapa === EtapaFluxoClinico.AVALIACAO_IU)?.total).toBe(3);
    expect(resultado.find((r) => r.etapa === EtapaFluxoClinico.CONCLUIDO)?.total).toBe(1);
    expect(resultado.find((r) => r.etapa === EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO)?.total).toBe(0);
    expect(resultado.find((r) => r.etapa === EtapaFluxoClinico.NAO_ELEGIVEL)?.total).toBe(0);
  });

  it('sondasNoPeriodo retorna 0 quando nenhuma sonda foi entregue no período', async () => {
    const { connection } = connectionStub([]);
    const service = new AnalyticsService(connection);

    const resultado = await service.sondasNoPeriodo('clinica-1', new Date('2026-01-01'), new Date('2026-01-31'));

    expect(resultado).toEqual({ totalQuantidade: 0 });
  });

  it('sondasNoPeriodo soma a quantidade retornada pela agregação', async () => {
    const { connection } = connectionStub([{ _id: null, totalQuantidade: 42 }]);
    const service = new AnalyticsService(connection);

    const resultado = await service.sondasNoPeriodo('clinica-1', new Date('2026-01-01'), new Date('2026-01-31'));

    expect(resultado).toEqual({ totalQuantidade: 42 });
  });
});
