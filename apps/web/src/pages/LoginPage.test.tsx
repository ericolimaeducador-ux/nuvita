import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ login: vi.fn(), erro: vi.fn() }));
vi.mock('@/components/ui/use-toast', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: mocks.erro } }));
vi.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ login: mocks.login }) }));

import { LoginPage } from './LoginPage';

function renderizar(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage – recuperação e textos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra o link "Esqueci minha senha" apontando para a recuperação', () => {
    renderizar();
    const link = screen.getByRole('link', { name: /esqueci minha senha/i });
    expect(link).toHaveAttribute('href', '/esqueci-senha');
  });

  it('não promete "credenciais corporativas"', () => {
    renderizar();
    expect(screen.queryByText(/credenciais corporativas/i)).not.toBeInTheDocument();
  });

  it('orienta quem perdeu o 2FA a falar com o suporte (reset de 2FA não é automático)', () => {
    renderizar();
    expect(screen.getByText(/perdeu o acesso ao c[óo]digo/i)).toBeInTheDocument();
    // Autorizado pelo usuário (2026-10-27): o contato de suporte passou a ser o WhatsApp.
    expect(screen.getByText(/\(11\) 94739-1805/)).toBeInTheDocument();
  });

  it('o campo do código 2FA já está na tela: a resposta do servidor não precisa revelá-lo', () => {
    renderizar();
    expect(screen.getByLabelText(/c[óo]digo de verifica[çc][ãa]o/i)).toBeInTheDocument();
  });

  it('avisa que o código 2FA pode ficar em branco para quem não usa autenticador', () => {
    renderizar();
    expect(screen.getByText(/deixe em branco se voc[êe] n[ãa]o usa autenticador/i)).toBeInTheDocument();
  });

  it('erro de login mostra mensagem única e NÃO muda a tela por ter acertado a senha', async () => {
    mocks.login.mockRejectedValue({ isAxiosError: true, response: { status: 401, data: { message: 'Credenciais invalidas.' } } });
    renderizar();
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^senha/i), 'qualquer-senha');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(mocks.erro).toHaveBeenCalledWith('Erro ao entrar', 'Credenciais invalidas.'));
    expect(mocks.erro).toHaveBeenCalledTimes(1);
  });

  it('depois de redefinir a senha, avisa para entrar com a nova', () => {
    renderizar({ senhaRedefinida: true });
    expect(screen.getByText(/senha (alterada|redefinida)/i)).toBeInTheDocument();
  });
});
