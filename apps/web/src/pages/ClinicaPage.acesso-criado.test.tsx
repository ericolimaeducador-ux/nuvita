import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  criarUsuario: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'adm', clinicaId: 'c1', papel: 'ADMIN', nome: 'Admin' } }),
}));
vi.mock('@/lib/useClinicaMinha', () => ({ useClinicaMinha: () => ({ data: { logoUrl: undefined } }) }));
vi.mock('@/components/LogoClinicaCard', () => ({ LogoClinicaCard: () => null }));
vi.mock('@/components/ui/use-toast', () => ({ toast: { success: mocks.success, error: mocks.error, info: vi.fn() } }));
vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, clinicasApi: { ...original.clinicasApi, criarUsuario: mocks.criarUsuario } };
});

import { ClinicaPage } from './ClinicaPage';

async function criarUsuarioNaTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ClinicaPage />
    </QueryClientProvider>,
  );
  await userEvent.type(screen.getByLabelText(/nome completo/i), 'Fulana de Tal');
  await userEvent.type(screen.getByLabelText(/^e-mail/i), 'fulana@clinica.com');
  await userEvent.type(screen.getByLabelText(/senha provis/i), 'provisoria-123');
  // Autorizado pelo usuário (2026-10-27): o perfil padrão é ENFERMEIRO e a criação agora exige o COREN.
  await userEvent.type(screen.getByLabelText(/^COREN/i), 'COREN 06/123456');
  await userEvent.click(screen.getByRole('button', { name: /criar usu/i }));
}

describe('ClinicaPage – diálogo "Acesso criado"', () => {
  beforeEach(() => vi.clearAllMocks());

  it('secretária (sem 2FA): não fala de segundo fator, mas avisa da troca de senha no 1º acesso', async () => {
    mocks.criarUsuario.mockResolvedValue({ user: { nome: 'Fulana de Tal', email: 'fulana@clinica.com' } });
    await criarUsuarioNaTela();
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent(/troca de senha/i);
    expect(dialogo.textContent).not.toMatch(/segundo fator|2fa|autenticador/i);
  });

  it('enfermeiro (com 2FA): mostra o segredo e o aviso de que ele não aparece de novo', async () => {
    mocks.criarUsuario.mockResolvedValue({
      user: { nome: 'Fulana de Tal', email: 'fulana@clinica.com' },
      twoFactorSetup: { otpauthUrl: 'otpauth://totp/x', base32: 'ABCDEF' },
    });
    await criarUsuarioNaTela();
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent(/segundo fator/i);
    expect(dialogo).toHaveTextContent(/n[ãa]o ser[áa] exibido de novo/i);
  });

  it('o diálogo é a confirmação: não dispara também um toast de sucesso (duplicado)', async () => {
    mocks.criarUsuario.mockResolvedValue({ user: { nome: 'Fulana de Tal', email: 'fulana@clinica.com' } });
    await criarUsuarioNaTela();
    await screen.findByRole('dialog');
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
