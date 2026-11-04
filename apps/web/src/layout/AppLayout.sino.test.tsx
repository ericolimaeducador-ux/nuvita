import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Modulo, Papel } from '@/types';

// O sino do cabeçalho leva a /notificacoes: só aparece (com o ponto dourado) para quem tem o módulo de Notificações.
const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock('@/auth/AuthContext', () => ({ useAuth: () => mocks.auth() }));

import { AppLayout } from './AppLayout';

const auth = (papel: Papel, permissoes: Modulo[]) => ({
  user: { id: 'u1', clinicaId: 'c1', papel, nome: 'Psi Teste' }, permissoes,
  clinicaAtiva: null, trocarClinica: vi.fn(), logout: vi.fn(),
});
function renderizar() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><AppLayout /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AppLayout — sino de notificações', () => {
  it('psicólogo (sem o módulo Notificações): não há sino no cabeçalho', () => {
    mocks.auth.mockReturnValue(auth(Papel.PSICOLOGO, [Modulo.DASHBOARD, Modulo.AGENDA]));
    renderizar();
    expect(screen.queryByRole('button', { name: 'Notificações' })).not.toBeInTheDocument();
  });

  it('quem tem o módulo (secretária): o sino aparece', () => {
    mocks.auth.mockReturnValue(auth(Papel.SECRETARIA, [Modulo.DASHBOARD, Modulo.NOTIFICACOES]));
    renderizar();
    expect(screen.getByRole('button', { name: 'Notificações' })).toBeInTheDocument();
  });
});
