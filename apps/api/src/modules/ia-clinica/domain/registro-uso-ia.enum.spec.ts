import { DecisaoUsoIA, TipoUsoIA } from './registro-uso-ia.enum';

describe('registro-uso-ia enums', () => {
  it('TipoUsoIA cobre os dois usos de IA clínica, com valores string estáveis', () => {
    expect(TipoUsoIA.SUGESTAO_ABORDAGEM).toBe('SUGESTAO_ABORDAGEM');
    expect(TipoUsoIA.PRESCRICAO_CUIDADOS).toBe('PRESCRICAO_CUIDADOS');
    expect(Object.values(TipoUsoIA).sort()).toEqual(['PRESCRICAO_CUIDADOS', 'SUGESTAO_ABORDAGEM']);
  });

  it('DecisaoUsoIA cobre aceitar e descartar, com valores string estáveis', () => {
    expect(DecisaoUsoIA.ACEITA).toBe('ACEITA');
    expect(DecisaoUsoIA.DESCARTADA).toBe('DESCARTADA');
    expect(Object.values(DecisaoUsoIA).sort()).toEqual(['ACEITA', 'DESCARTADA']);
  });
});
