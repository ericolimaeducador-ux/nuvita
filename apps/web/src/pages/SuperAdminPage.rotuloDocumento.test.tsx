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

// O formulário "Nova clínica" aceita documento em branco (a psicóloga informa no primeiro uso);
// o rótulo precisa dizer isso, senão quem cria acha que o número é obrigatório.
describe('Super Admin — Nova clínica: rótulo do documento', () => {
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

  it('o rótulo diz que o documento do consultório é opcional e que a psicóloga informa no primeiro uso', async () => {
    const dialogo = await abrirNovaClinica();
    expect(
      within(dialogo).getByText('Documento do consultório (CPF ou CNPJ) — opcional; a psicóloga informa no primeiro uso'),
    ).toBeInTheDocument();
  });

  it('o campo do número fica associado ao rótulo (acessível por nome)', async () => {
    const dialogo = await abrirNovaClinica();
    expect(
      within(dialogo).getByRole('textbox', { name: /documento do consultório/i }),
    ).toBeInTheDocument();
  });

  it('o número em branco não mostra erro de obrigatoriedade ("Informe o documento.")', async () => {
    const dialogo = await abrirNovaClinica();
    const user = userEvent.setup();
    await user.click(within(dialogo).getByRole('button', { name: /criar clínica/i }));
    expect(within(dialogo).queryByText(/Informe o documento/i)).not.toBeInTheDocument();
  });
});
