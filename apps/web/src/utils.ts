import dayjs from 'dayjs';
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

/**
 * Formata campos de DATA-CALENDÁRIO (nascimento, data de follow-up, vencimento…)
 * que a API grava como meia-noite UTC. `dayjs(iso).format(...)` converteria para
 * o fuso local e mostraria o dia ANTERIOR no Brasil (UTC-3); por isso usa só a
 * parte YYYY-MM-DD. Não usar em timestamps de evento (criadoEm, dataProtocolo…),
 * onde o horário local é o correto.
 */
export function formatData(value?: string | null): string {
  if (!value) return '—';
  return dayjs(value.slice(0, 10)).format('DD/MM/YYYY');
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
