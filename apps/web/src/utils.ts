import type { PageResult } from '@/types';

/** Normaliza respostas de lista que podem vir como array puro ou paginado. */
export function toItems<T>(data: PageResult<T> | T[] | undefined | null): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.items ?? data.data ?? [];
}

export function formatCpf(cpf?: string): string {
  if (!cpf) return '—';
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function idade(dataNascimento?: string): string {
  if (!dataNascimento) return '—';
  const nasc = new Date(dataNascimento);
  if (Number.isNaN(nasc.getTime())) return '—';
  const diff = Date.now() - nasc.getTime();
  const anos = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return `${anos} anos`;
}
