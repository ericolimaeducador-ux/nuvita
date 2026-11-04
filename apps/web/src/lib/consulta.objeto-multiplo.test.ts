import { describe, expect, it } from 'vitest';
import { comoObjetoComLista, RespostaInvalidaError } from './consulta';

describe('comoObjetoComLista com vários campos', () => {
  it('exige que TODOS os campos informados sejam listas', () => {
    const ok = { vencidas: [], aVencer: [{ id: 1 }], totalVencido: 0 };
    expect(comoObjetoComLista(ok, ['vencidas', 'aVencer'])).toBe(ok);
  });

  it.each([
    ['falta um dos campos', { vencidas: [] }],
    ['um dos campos não é lista', { vencidas: [], aVencer: 'x' }],
    ['HTML de gateway', '<html></html>'],
    ['null', null],
  ])('lança RespostaInvalidaError quando %s', (_nome, entrada) => {
    expect(() => comoObjetoComLista(entrada, ['vencidas', 'aVencer'])).toThrow(RespostaInvalidaError);
  });
});
