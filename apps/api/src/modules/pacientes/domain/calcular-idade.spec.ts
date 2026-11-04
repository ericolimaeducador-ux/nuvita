// Testa a função compartilhada de packages/shared/src/paciente (fonte de verdade
// única, usada pela API na regra de responsável legal — ver PacientesService — e
// espelhada manualmente no web, mesmo padrão já usado para `Papel` etc.).
import { calcularIdadeAnos, isMenorDeIdade } from '../../../../../../packages/shared/src/paciente';

describe('calcularIdadeAnos / isMenorDeIdade', () => {
  it('calcula por calendário exato, não por aproximação de dias', () => {
    // Nasceu em 2010-06-15; em 2026-06-14 ainda não fez aniversário → 15 anos.
    expect(calcularIdadeAnos(new Date('2010-06-15'), new Date('2026-06-14T12:00:00Z'))).toBe(15);
    // Em 2026-06-15 (dia exato) já fez → 16 anos.
    expect(calcularIdadeAnos(new Date('2010-06-15'), new Date('2026-06-15T12:00:00Z'))).toBe(16);
  });

  it('classifica exatamente no dia da fronteira de 18 anos: véspera=menor, dia do aniversário=maior', () => {
    expect(isMenorDeIdade(new Date('2008-06-15'), new Date('2026-06-14T12:00:00Z'))).toBe('menor');
    expect(isMenorDeIdade(new Date('2008-06-15'), new Date('2026-06-15T12:00:00Z'))).toBe('maior');
  });

  it('sem data de nascimento → indeterminado (nunca inferido como maior nem menor)', () => {
    expect(isMenorDeIdade(undefined)).toBe('indeterminado');
    expect(isMenorDeIdade(null)).toBe('indeterminado');
  });

  // Nota: o ancoramento de `agora` ao dia de calendário LOCAL de quem chama (em vez
  // do instante UTC) é o que evita adiantar o aniversário em até 1 dia nas últimas
  // horas de cada dia num fuso negativo como o do Brasil (ver o comentário da
  // função). Um teste automatizado desse comportamento específico dependeria do
  // fuso horário da máquina/CI rodando o teste (os getters locais de `Date` seguem
  // o fuso do processo, não um offset embutido na string de entrada) — por isso
  // fica documentado aqui, não testado, para não introduzir um teste frágil que
  // passa numa máquina e falha noutra.
});
