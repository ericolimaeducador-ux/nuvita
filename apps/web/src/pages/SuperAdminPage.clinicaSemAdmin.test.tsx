import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

// feature-clinica-sem-admin: o primeiro administrador é opcional; o formulário avisa que os dois campos andam juntos.
describe('Super Admin — Nova clínica: primeiro administrador opcional', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listUsuarios.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 20 });
    mocks.listClinicas.mockResolvedValue({ items: [], total: 0 });
  });

  async function abrirNovaClinica() {
    const user = userEvent.setup();
    renderizar();
    await user.click(await screen.findByRole('tab', { name: /clínicas/i }));
    await user.click(await screen.findByRole('button', { name: /nova clínica/i }));
    return screen.findByRole('dialog');
  }

  it('traz o aviso "se preencher um, preencha os dois"', async () => {
    const dialogo = await abrirNovaClinica();
    expect(within(dialogo).getByText(/se preencher um, preencha os dois/i)).toBeInTheDocument();
  });

  it('com nome e e-mail do admin em branco, não mostra erro de obrigatoriedade', async () => {
    const dialogo = await abrirNovaClinica();
    const user = userEvent.setup();
    await user.click(within(dialogo).getByRole('button', { name: /criar clínica/i }));
    expect(within(dialogo).queryByText(/Informe o nome do admin/i)).not.toBeInTheDocument();
    expect(within(dialogo).queryByText(/E-mail inválido/i)).not.toBeInTheDocument();
  });
});
