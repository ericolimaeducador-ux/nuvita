import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';

const mocks = vi.hoisted(() => ({
  listUsuarios: vi.fn(),
  listClinicas: vi.fn(),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', papel: 'SUPER_ADMIN', nome: 'Super Teste' }, permissoes: [] }),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    superAdminApi: { ...original.superAdminApi, listUsuarios: mocks.listUsuarios, listClinicas: mocks.listClinicas },
  };
});

import { SuperAdminPage } from './SuperAdminPage';

function erroHttp(status: number) {
  return new AxiosError('falha interna', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: {},
    statusText: '',
    headers: {},
    config: {} as never,
  });
}

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SuperAdminPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Super Admin — falha explícita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listUsuarios.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 20 });
    mocks.listClinicas.mockResolvedValue({ items: [], total: 0 });
  });

  it('sem usuários (legítimo): "Nenhum usuário encontrado."', async () => {
    renderizar();
    expect(await screen.findByText('Nenhum usuário encontrado.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('403 em usuários: alerta de perfil sem acesso, NUNCA "Nenhum usuário encontrado."', async () => {
    mocks.listUsuarios.mockRejectedValue(erroHttp(403));
    renderizar();
    const alertas = await screen.findAllByRole('alert');
    expect(alertas.some((a) => a.textContent?.includes('Seu perfil não tem acesso'))).toBe(true);
    expect(screen.queryByText('Nenhum usuário encontrado.')).not.toBeInTheDocument();
  });

  it('500 em usuários: "Tentar novamente" refaz a consulta', async () => {
    mocks.listUsuarios
      .mockRejectedValueOnce(erroHttp(500))
      .mockResolvedValue({ items: [], total: 0, skip: 0, limit: 20 });
    renderizar();
    const alertas = await screen.findAllByRole('alert');
    await userEvent.click(within(alertas[0]).getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText('Nenhum usuário encontrado.')).toBeInTheDocument();
  });

  it('erro nas clínicas: aviso na aba de usuários (nomes e vínculos) e na aba Clínicas, NUNCA "Nenhuma clínica cadastrada."', async () => {
    mocks.listClinicas.mockRejectedValue(erroHttp(500));
    renderizar();
    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent(/as clínicas/i);
    await userEvent.click(screen.getByRole('tab', { name: /clínicas/i }));
    const painel = screen.getByRole('tabpanel');
    expect(within(painel).getByRole('alert')).toHaveTextContent(/as clínicas/i);
    expect(within(painel).queryByText('Nenhuma clínica cadastrada.')).not.toBeInTheDocument();
  });

  it('sem clínicas (legítimo): "Nenhuma clínica cadastrada."', async () => {
    renderizar();
    await userEvent.click(await screen.findByRole('tab', { name: /clínicas/i }));
    expect(await screen.findByText('Nenhuma clínica cadastrada.')).toBeInTheDocument();
  });
});
