import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { ReactElement } from 'react';

const mocks = vi.hoisted(() => ({
  listarAbertos: vi.fn(),
  listClinicas: vi.fn(),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', papel: 'SUPER_ADMIN', nome: 'Super Teste' },
    permissoes: [],
    clinicaAtiva: null,
    trocarClinica: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/api/tickets', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/tickets')>();
  return { ...original, ticketsApi: { ...original.ticketsApi, listarAbertos: mocks.listarAbertos } };
});

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, superAdminApi: { ...original.superAdminApi, listClinicas: mocks.listClinicas } };
});

import { TicketsPage } from './TicketsPage';
import { AppLayout } from '@/layout/AppLayout';

function erroHttp(status: number) {
  return new AxiosError('falha interna', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: {},
    statusText: '',
    headers: {},
    config: {} as never,
  });
}

function renderizar(pagina: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{pagina}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Tickets — falha explícita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listarAbertos.mockResolvedValue([]);
    mocks.listClinicas.mockResolvedValue({ items: [], total: 0 });
  });

  it('fila vazia legítima: "Nenhum ticket aberto."', async () => {
    renderizar(<TicketsPage />);
    expect(await screen.findByText('Nenhum ticket aberto.')).toBeInTheDocument();
  });

  it('403: alerta, "—" na contagem e NUNCA "Nenhum ticket aberto."', async () => {
    mocks.listarAbertos.mockRejectedValue(erroHttp(403));
    renderizar(<TicketsPage />);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(screen.queryByText('Nenhum ticket aberto.')).not.toBeInTheDocument();
    const cabecalho = screen.getByText('Tickets de correção').parentElement as HTMLElement;
    expect(cabecalho).toHaveTextContent('—');
    expect(cabecalho).not.toHaveTextContent(/\b0\b/);
  });

  it('500: "Tentar novamente" refaz a consulta', async () => {
    mocks.listarAbertos.mockRejectedValueOnce(erroHttp(500)).mockResolvedValue([]);
    renderizar(<TicketsPage />);
    const alerta = await screen.findByRole('alert');
    await userEvent.click(within(alerta).getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText('Nenhum ticket aberto.')).toBeInTheDocument();
  });
});

describe('Seletor de clínica do Super Admin (AppLayout) — falha explícita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listClinicas.mockResolvedValue({ items: [{ id: 'c1', nome: 'Clínica Demo' }, { id: 'c2', nome: 'Outra' }], total: 2 });
  });

  it('com as clínicas carregadas: seletor presente e sem alerta', async () => {
    renderizar(<AppLayout />);
    expect(await screen.findByText('Selecione a clínica…')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('erro ao carregar as clínicas: alerta no topo (seletor não pode ficar vazio sem explicação)', async () => {
    mocks.listClinicas.mockRejectedValue(erroHttp(500));
    renderizar(<AppLayout />);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/as clínicas/i);
    expect(within(alerta).getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });
});
