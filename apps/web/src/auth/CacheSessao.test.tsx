import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

/**
 * R1.3 — dois usuários de clínicas diferentes no mesmo navegador não podem ver dado um do outro pelo cache.
 * A API é simulada: devolve os pacientes da clínica de quem está logado AGORA.
 */
const mocks = vi.hoisted(() => ({ login: vi.fn(), logout: vi.fn(), pacientes: vi.fn() }));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, authApi: { ...original.authApi, login: mocks.login, logout: mocks.logout } };
});

import { AuthProvider, useAuth } from './AuthContext';
import { criarQueryClient, escopoDaSessao } from '@/lib/cache-sessao';

const usuarioA = { id: 'uA', nome: 'A', email: 'a@x', papel: 'ENFERMEIRO', clinicaId: 'clinica-A', permissoes: [] };
const usuarioB = { id: 'uB', nome: 'B', email: 'b@x', papel: 'ENFERMEIRO', clinicaId: 'clinica-B', permissoes: [] };

let auth: ReturnType<typeof useAuth>;
function Tela() {
  auth = useAuth();
  const q = useQuery({ queryKey: ['pacientes', { busca: '' }], queryFn: mocks.pacientes, enabled: !!auth.user });
  return <div data-testid="lista">{auth.user ? (q.data ?? 'carregando') : 'deslogado'}</div>;
}

function montar(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider><Tela /></AuthProvider>
    </QueryClientProvider>,
  );
}

// Mesmos padrões do main.tsx (staleTime de 30 s: sem limpeza, o cache do usuário anterior seria servido como "fresco").
const clienteDoApp = () => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 } } });

describe('R1.3 — cache da interface por sessão', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.logout.mockResolvedValue(undefined);
    mocks.login.mockImplementation((email: string) =>
      Promise.resolve({ accessToken: `tok-${email}`, user: email === 'a@x' ? usuarioA : usuarioB }),
    );
    mocks.pacientes.mockImplementation(() => {
      const u = JSON.parse(localStorage.getItem('nuvita.user') ?? 'null');
      return Promise.resolve(u?.clinicaId === 'clinica-A' ? 'Paciente da clínica A' : 'Paciente da clínica B');
    });
  });

  it('logout de A + login de B: B nunca vê o paciente da clínica A', async () => {
    montar(clienteDoApp());
    await act(() => auth.login('a@x', 'senha'));
    await waitFor(() => expect(screen.getByTestId('lista')).toHaveTextContent('Paciente da clínica A'));

    await act(() => auth.logout());
    await act(() => auth.login('b@x', 'senha'));
    await waitFor(() => expect(screen.getByTestId('lista')).toHaveTextContent('Paciente da clínica B'));
    expect(screen.getByTestId('lista')).not.toHaveTextContent('clínica A');
  });

  it('login de B sem logout explícito (sessão expirada) também não reaproveita o cache de A', async () => {
    montar(clienteDoApp());
    await act(() => auth.login('a@x', 'senha'));
    await waitFor(() => expect(screen.getByTestId('lista')).toHaveTextContent('Paciente da clínica A'));
    await act(() => auth.login('b@x', 'senha'));
    await waitFor(() => expect(screen.getByTestId('lista')).toHaveTextContent('Paciente da clínica B'));
  });

  it('troca de clínica (SUPER_ADMIN) limpa o cache e cancela o que estava em andamento', async () => {
    const client = clienteDoApp();
    const cancel = vi.spyOn(client, 'cancelQueries');
    const clear = vi.spyOn(client, 'clear');
    montar(client);
    await act(() => auth.login('a@x', 'senha'));
    cancel.mockClear();
    clear.mockClear();
    act(() => auth.trocarClinica('clinica-X'));
    await waitFor(() => expect(cancel).toHaveBeenCalled());
    expect(clear).toHaveBeenCalled();
  });

  it('chave por sessão: a mesma chave em outra sessão (usuário/clínica) é outro cache; invalidação por prefixo continua funcionando', async () => {
    const client = criarQueryClient();
    localStorage.setItem('nuvita.user', JSON.stringify(usuarioA));
    client.setQueryData(['cobrancas-abertas'], 'cobranças da clínica A');
    expect(client.getQueryData(['cobrancas-abertas'])).toBe('cobranças da clínica A');

    localStorage.setItem('nuvita.user', JSON.stringify(usuarioB));
    expect(client.getQueryData(['cobrancas-abertas'])).toBeUndefined();

    // SUPER_ADMIN: a clínica escolhida entra no escopo.
    localStorage.setItem('nuvita.user', JSON.stringify({ ...usuarioA, papel: 'SUPER_ADMIN', clinicaId: null }));
    localStorage.setItem('nuvita.clinicaAtiva', 'clinica-X');
    const escopoX = escopoDaSessao();
    localStorage.setItem('nuvita.clinicaAtiva', 'clinica-Y');
    expect(escopoDaSessao()).not.toBe(escopoX);

    localStorage.setItem('nuvita.user', JSON.stringify(usuarioA));
    localStorage.removeItem('nuvita.clinicaAtiva');
    await client.invalidateQueries({ queryKey: ['cobrancas-abertas'] });
    expect(client.getQueryState(['cobrancas-abertas'])?.isInvalidated).toBe(true);
  });
});
