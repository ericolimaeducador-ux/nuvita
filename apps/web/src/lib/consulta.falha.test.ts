import { describe, expect, it, vi } from 'vitest';
import { primeiraFalha } from './consulta';

const ok = { isError: false, error: null, refetch: vi.fn() };

describe('primeiraFalha', () => {
  it('sem nenhuma consulta com erro, devolve null', () => {
    expect(primeiraFalha(ok, ok)).toBeNull();
  });

  it('devolve a primeira consulta com erro, na ordem informada', () => {
    const a = { isError: true, error: new Error('a'), refetch: vi.fn() };
    const b = { isError: true, error: new Error('b'), refetch: vi.fn() };
    expect(primeiraFalha(ok, a, b)).toBe(a);
  });
});
