import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// A criação de ENFERMEIRO pede o COREN (só "não vazio"; TODO(legal): formato do COREN pendente de fonte oficial).
const mocks = vi.hoisted(() => ({ criarUsuario: vi.fn(), createUsuario: vi.fn(), listClinicas: vi.fn(), listUsuarios: vi.fn() }));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'adm', clinicaId: 'c1', papel: 'ADMIN', nome: 'Admin' }, permissoes: [] }),
}));
vi.mock('@/lib/useClinicaMinha', () => ({ useClinicaMinha: () => ({ data: { logoUrl: undefined } }) }));
vi.mock('@/components/LogoClinicaCard', () => ({ LogoClinicaCard: () => null }));
vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    clinicasApi: { ...original.clinicasApi, criarUsuario: mocks.criarUsuario },
    superAdminApi: { ...original.superAdminApi, createUsuario: mocks.createUsuario, listClinicas: mocks.listClinicas, listUsuarios: mocks.listUsuarios },
  };
});

import { ClinicaPage } from './ClinicaPage';

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><ClinicaPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

async function preencherBase() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/nome completo/i), 'Fulana de Tal');
  await user.type(screen.getByLabelText(/^e-mail/i), 'fulana@clinica.com');
  await user.type(screen.getByLabelText(/senha provis/i), 'provisoria-123');
  return user;
}

describe('Admin da clínica — criar enfermeiro exige o COREN', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.criarUsuario.mockResolvedValue({ user: { nome: 'Fulana de Tal', email: 'fulana@clinica.com' } });
  });

  it('enfermeiro (perfil padrão): há o campo COREN', () => {
    renderizar();
    expect(screen.getByLabelText(/^COREN/i)).toBeInTheDocument();
  });

  it('sem COREN: não envia e mostra o erro', async () => {
    renderizar();
    const user = await preencherBase();
    await user.click(screen.getByRole('button', { name: /criar usu/i }));
    expect(await screen.findByText(/informe o coren/i)).toBeInTheDocument();
    expect(mocks.criarUsuario).not.toHaveBeenCalled();
  });

  it('COREN só com espaços: também não envia', async () => {
    renderizar();
    const user = await preencherBase();
    await user.type(screen.getByLabelText(/^COREN/i), '   ');
    await user.click(screen.getByRole('button', { name: /criar usu/i }));
    expect(mocks.criarUsuario).not.toHaveBeenCalled();
  });

  it('com COREN: envia o COREN no payload', async () => {
    renderizar();
    const user = await preencherBase();
    await user.type(screen.getByLabelText(/^COREN/i), 'COREN 06/123456');
    await user.click(screen.getByRole('button', { name: /criar usu/i }));
    await vi.waitFor(() => expect(mocks.criarUsuario).toHaveBeenCalled());
    expect(mocks.criarUsuario.mock.calls[0][1]).toMatchObject({ papel: 'ENFERMEIRO', coren: 'COREN 06/123456' });
  });
});
