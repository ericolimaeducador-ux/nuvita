import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Super-admin: ao criar ENFERMEIRO o COREN é exigido (não vazio); para os outros perfis não aparece.
const mocks = vi.hoisted(() => ({ createUsuario: vi.fn(), listClinicas: vi.fn(), listUsuarios: vi.fn() }));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'sa', papel: 'SUPER_ADMIN', nome: 'Super' }, permissoes: [] }),
}));
vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    superAdminApi: { ...original.superAdminApi, createUsuario: mocks.createUsuario, listClinicas: mocks.listClinicas, listUsuarios: mocks.listUsuarios },
  };
});

import { SuperAdminPage } from './SuperAdminPage';

async function abrirNovoUsuario() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><SuperAdminPage /></MemoryRouter>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: /novo usuário/i }));
  const dialogo = await screen.findByRole('dialog');
  return { user, dialogo };
}

async function escolherPerfil(user: ReturnType<typeof userEvent.setup>, dialogo: HTMLElement, nome: RegExp) {
  const seletores = within(dialogo).getAllByRole('combobox');
  await user.click(seletores[0]); // "Perfil"
  await user.click(await screen.findByRole('option', { name: nome }));
}

describe('SuperAdmin — Novo usuário e o COREN', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listClinicas.mockResolvedValue([]);
    mocks.listUsuarios.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 20 });
    mocks.createUsuario.mockResolvedValue({ id: 'n1', nome: 'X', email: 'x@y.z' });
  });

  it('enfermeiro: aparece o campo COREN e, sem ele, não envia', async () => {
    const { user, dialogo } = await abrirNovoUsuario();
    await escolherPerfil(user, dialogo, /enfermeiro/i);
    expect(within(dialogo).getByPlaceholderText(/COREN/i)).toBeInTheDocument();

    await user.type(within(dialogo).getByPlaceholderText(/João da Silva/i), 'Fulana');
    await user.type(within(dialogo).getByPlaceholderText(/usuario@nuvita/i), 'fulana@clinica.com');
    await user.type(within(dialogo).getByPlaceholderText(/mín. 10 caracteres/i), 'provisoria-123');
    await user.click(within(dialogo).getByRole('button', { name: /criar usuário/i }));
    expect(await within(dialogo).findByText(/informe o coren/i)).toBeInTheDocument();
    expect(mocks.createUsuario).not.toHaveBeenCalled();
  }, 20000);

  it('outro perfil (ex.: administrador): não pede COREN', async () => {
    const { dialogo } = await abrirNovoUsuario();
    expect(within(dialogo).queryByPlaceholderText(/^Nº do COREN$|COREN/i)).not.toBeInTheDocument();
  });
});
