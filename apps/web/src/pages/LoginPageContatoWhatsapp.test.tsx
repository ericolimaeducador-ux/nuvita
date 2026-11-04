import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/ui/use-toast', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ login: vi.fn() }) }));

import { LoginPage } from './LoginPage';

// Enquanto o e-mail de suporte não existe, quem perdeu o 2FA fala com o suporte pelo WhatsApp.
describe('LoginPage — contato de suporte do 2FA', () => {
  it('mostra o WhatsApp de suporte, com link para o wa.me', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const link = screen.getByRole('link', { name: /\(11\) 94739-1805/ });
    expect(link).toHaveAttribute('href', 'https://wa.me/5511947391805');
  });

  it('não mostra mais o e-mail inexistente nesta tela', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.queryByText(/contato@nuvita\.app\.br/i)).not.toBeInTheDocument();
  });
});
