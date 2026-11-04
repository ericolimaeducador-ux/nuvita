import { describe, expect, it } from 'vitest';
import { comoObjetoComLista, RespostaInvalidaError } from './consulta';

describe('comoObjetoComLista', () => {
  it('deixa passar objeto cujo campo é uma lista (mesma referência), inclusive vazia', () => {
    const painel = { total: 1, pacientes: [{ id: 'p1' }] };
    expect(comoObjetoComLista(painel, 'pacientes')).toBe(painel);
    const vazio = { pacientes: [] };
    expect(comoObjetoComLista(vazio, 'pacientes')).toBe(vazio);
  });

  it.each([
    ['HTML de gateway', '<!doctype html><html></html>'],
    ['null', null],
    ['undefined', undefined],
    ['array', [{ pacientes: [] }]],
    ['objeto sem o campo', { total: 3 }],
    ['campo que não é lista', { pacientes: 'x' }],
    ['campo objeto', { pacientes: {} }],
  ])('lança RespostaInvalidaError para %s', (_nome, entrada) => {
    expect(() => comoObjetoComLista(entrada, 'pacientes')).toThrow(RespostaInvalidaError);
  });
});
