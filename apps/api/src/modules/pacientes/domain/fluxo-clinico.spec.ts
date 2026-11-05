import { Papel } from '../../../../../../packages/shared/src/auth';
import {
  EtapaFluxoClinico,
  ORDEM_ETAPAS_FLUXO,
  PAPEIS_AVANCO_MANUAL,
  PRAZO_DIAS_POR_ETAPA,
  PROXIMA_ETAPA_MANUAL,
  calcularPrazoEtapa,
  podeAvancarPara,
} from '../../../../../../packages/shared/src/fluxo-clinico';
import {
  ClassificacaoArea,
  elegivelFluxoClinico,
  mesmasClassificacoes,
} from '../../../../../../packages/shared/src/paciente';

const E = EtapaFluxoClinico;

describe('fluxo clínico (packages/shared) — mecânica portada do Nuvita antigo', () => {
  it('as 9 etapas, com os mesmos nomes, valores e ordem do Nuvita antigo', () => {
    expect(ORDEM_ETAPAS_FLUXO).toEqual([
      E.AGUARDANDO_ATENDIMENTO,
      E.AVALIACAO_IU,
      E.APTO_AGUARDANDO_CONTATO,
      E.ENTREVISTA_AGENDADA,
      E.AGUARDANDO_DOCUMENTOS,
      E.AGUARDANDO_CONSULTA_MEDICA,
      E.AGUARDANDO_ENTREGA,
      E.NAO_ELEGIVEL,
      E.CONCLUIDO,
    ]);
    expect(Object.values(E)).toEqual([
      'aguardando_atendimento',
      'avaliacao_iu',
      'apto_aguardando_contato',
      'entrevista_agendada',
      'aguardando_documentos',
      'aguardando_consulta_medica',
      'aguardando_entrega',
      'nao_elegivel',
      'concluido',
    ]);
  });

  it('prazos (SLA) só nas etapas com prazo definido', () => {
    expect(PRAZO_DIAS_POR_ETAPA).toEqual({
      [E.AGUARDANDO_ATENDIMENTO]: 10,
      [E.AVALIACAO_IU]: 20,
      [E.APTO_AGUARDANDO_CONTATO]: 15,
      [E.AGUARDANDO_DOCUMENTOS]: 10,
      [E.AGUARDANDO_CONSULTA_MEDICA]: 15,
    });
  });

  describe('podeAvancarPara — só para frente por posição', () => {
    it('permite avançar, inclusive pulando etapas', () => {
      expect(podeAvancarPara(E.AGUARDANDO_ATENDIMENTO, E.AVALIACAO_IU)).toBe(true);
      expect(podeAvancarPara(E.AGUARDANDO_ATENDIMENTO, E.CONCLUIDO)).toBe(true);
      expect(podeAvancarPara(E.AGUARDANDO_ENTREGA, E.NAO_ELEGIVEL)).toBe(true);
    });

    it('nunca regride nem repete', () => {
      expect(podeAvancarPara(E.AVALIACAO_IU, E.AVALIACAO_IU)).toBe(false);
      expect(podeAvancarPara(E.CONCLUIDO, E.AGUARDANDO_ATENDIMENTO)).toBe(false);
      expect(podeAvancarPara(E.NAO_ELEGIVEL, E.AGUARDANDO_ENTREGA)).toBe(false);
    });

    it('paciente sem etapa (ainda fora do fluxo) pode entrar em qualquer etapa', () => {
      expect(podeAvancarPara(undefined, E.AGUARDANDO_ATENDIMENTO)).toBe(true);
      expect(podeAvancarPara(null, E.AVALIACAO_IU)).toBe(true);
    });
  });

  it('avanço manual: mesma sequência do antigo e papéis (SECRETARIA e ENFERMEIRO; ADMIN é tratado no serviço)', () => {
    expect(PROXIMA_ETAPA_MANUAL).toEqual({
      [E.APTO_AGUARDANDO_CONTATO]: E.ENTREVISTA_AGENDADA,
      [E.ENTREVISTA_AGENDADA]: E.AGUARDANDO_DOCUMENTOS,
      [E.AGUARDANDO_DOCUMENTOS]: E.AGUARDANDO_CONSULTA_MEDICA,
    });
    for (const etapa of Object.keys(PROXIMA_ETAPA_MANUAL) as EtapaFluxoClinico[]) {
      expect(PAPEIS_AVANCO_MANUAL[etapa]).toEqual([Papel.SECRETARIA, Papel.ENFERMEIRO]);
    }
  });

  describe('calcularPrazoEtapa', () => {
    const inicio = new Date('2026-01-01T00:00:00.000Z');

    it('dentro do prazo', () => {
      const info = calcularPrazoEtapa(E.AGUARDANDO_ATENDIMENTO, inicio, new Date('2026-01-04T10:00:00.000Z'));
      expect(info).toEqual({ diasLimite: 10, diasDecorridos: 3, diasRestantes: 7, atrasado: false });
    });

    it('atrasado', () => {
      const info = calcularPrazoEtapa(E.AGUARDANDO_ATENDIMENTO, inicio, new Date('2026-01-15T00:00:00.000Z'));
      expect(info.atrasado).toBe(true);
      expect(info.diasRestantes).toBe(-4);
    });

    it('etapa sem prazo definido nunca fica atrasada', () => {
      const info = calcularPrazoEtapa(E.AGUARDANDO_ENTREGA, inicio, new Date('2027-01-01T00:00:00.000Z'));
      expect(info.diasLimite).toBeUndefined();
      expect(info.atrasado).toBe(false);
    });
  });
});

describe('elegibilidade ao fluxo clínico (derivada)', () => {
  const { IU, FA, OT } = ClassificacaoArea;

  it('só [IU] (exatamente um elemento, e é IU) é elegível', () => {
    expect(elegivelFluxoClinico([IU])).toBe(true);
  });

  it.each([[[FA]], [[OT]], [[IU, FA]], [[IU, OT]], [[FA, OT]], [[IU, FA, OT]], [[]], [undefined], [null]])(
    '%j NÃO é elegível',
    (classificacoes) => {
      expect(elegivelFluxoClinico(classificacoes as never)).toBe(false);
    },
  );

  it('mesmasClassificacoes ignora a ordem e trata ausente como vazio', () => {
    expect(mesmasClassificacoes([IU, FA], [FA, IU])).toBe(true);
    expect(mesmasClassificacoes([IU], [IU, FA])).toBe(false);
    expect(mesmasClassificacoes(undefined, [])).toBe(true);
  });
});
