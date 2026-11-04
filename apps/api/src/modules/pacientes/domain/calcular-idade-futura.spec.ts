import { isMenorDeIdade } from '../../../../../../packages/shared/src/paciente';

// Data de nascimento no futuro não é "menor de idade": é dado inválido, então 'indeterminado'.
describe('isMenorDeIdade — nascimento no futuro', () => {
  it('nascimento depois de hoje: indeterminado (não menor)', () => {
    expect(isMenorDeIdade(new Date('2026-10-13'), new Date('2026-06-14T12:00:00Z'))).toBe('indeterminado');
  });
  it('nascido hoje: segue menor', () => {
    expect(isMenorDeIdade(new Date('2026-06-14'), new Date('2026-06-14T12:00:00Z'))).toBe('menor');
  });
});
