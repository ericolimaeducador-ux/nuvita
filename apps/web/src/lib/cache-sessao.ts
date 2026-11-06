import { QueryClient, hashKey, type QueryKey } from '@tanstack/react-query';
import { getClinicaAtiva } from '@/api/client';

/**
 * R1.3 — cache da interface separado por SESSÃO (usuário + clínica).
 *
 * Duas camadas:
 *  1) login, logout e troca de clínica cancelam as requisições em andamento e limpam o cache (limparCacheDaSessao);
 *  2) toda chave de consulta é prefixada com o escopo da sessão (chaveDaSessao) — aplicada por `queryKeyHashFn` no
 *     QueryClient, então vale para TODAS as chaves (ex.: ['cobrancas-abertas'], ['pacientes', filtros]) sem precisar
 *     reescrever cada uso. A invalidação por prefixo (invalidateQueries({ queryKey: ['pacientes'] })) continua igual,
 *     porque ela compara a chave original, não o hash.
 */
const USER_KEY = 'nuvita.user';

export function escopoDaSessao(): string {
  let usuario: { id?: string; clinicaId?: string | null } | null = null;
  try {
    usuario = JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
  } catch {
    usuario = null;
  }
  if (!usuario?.id) return 'anonimo';
  // SUPER_ADMIN opera a clínica escolhida (x-clinica-id); os demais, a clínica do próprio usuário.
  return `${usuario.id}@${getClinicaAtiva() ?? usuario.clinicaId ?? 'sem-clinica'}`;
}

/** Chave de consulta com o escopo da sessão (usuário + clínica) na frente. */
export function chaveDaSessao(queryKey: QueryKey): QueryKey {
  return [{ sessao: escopoDaSessao() }, ...queryKey];
}

export function hashComSessao(queryKey: QueryKey): string {
  return hashKey(chaveDaSessao(queryKey));
}

export function criarQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000, queryKeyHashFn: hashComSessao },
    },
  });
}

/** Cancela o que está em andamento e esvazia o cache (login, logout, troca de clínica). */
export async function limparCacheDaSessao(client: QueryClient | undefined): Promise<void> {
  if (!client) return;
  await client.cancelQueries();
  client.clear();
}
