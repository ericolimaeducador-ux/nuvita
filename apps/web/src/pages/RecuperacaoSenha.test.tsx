import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ esqueci: vi.fn(), redefinir: vi.fn() }));
vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    authApi: { ...original.authApi, esqueciSenha: mocks.esqueci, redefinirSenha: mocks.redefinir },
  };
});

import { EsqueciSenhaPage } from './EsqueciSenhaPage';
import { RedefinirSenhaPage } from './RedefinirSenhaPage';

function Destino() {
  const { state } = useLocation();
  return <div data-testid="login" data-state={JSON.stringify(state)} />;
}

function renderizar(inicial: string) {
  return render(
    <MemoryRouter initialEntries={[inicial]}>
      <Routes>
        <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
        <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
        <Route path="/login" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Esqueci minha senha', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra a MESMA confirmação, dê certo, e-mail inexistente ou erro do servidor', async () => {
    const textos: string[] = [];
    for (const resultado of [() => Promise.resolve({ ok: true }), () => Promise.reject(new Error('429'))]) {
      mocks.esqueci.mockImplementation(resultado);
      const { unmount } = renderizar('/esqueci-senha');
      await userEvent.type(screen.getByLabelText(/e-mail/i), 'alguem@x.com');
      await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
      const aviso = await screen.findByRole('status');
      textos.push(aviso.textContent ?? '');
      unmount();
    }
    expect(textos[0]).toBe(textos[1]);
    expect(textos[0]).toMatch(/se este e-mail estiver cadastrado/i);
  });

  it('explica que o 2FA perdido não se recupera aqui', () => {
    renderizar('/esqueci-senha');
    expect(screen.getByText(/contato@nuvita\.app\.br/i)).toBeInTheDocument();
  });
});

describe('Redefinir senha (link do e-mail)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia o token da URL com a nova senha e volta ao login avisando da troca', async () => {
    mocks.redefinir.mockResolvedValue({ ok: true });
    renderizar('/redefinir-senha?token=abc123');
    await userEvent.type(screen.getByLabelText(/^nova senha/i), 'senha-definitiva-1');
    await userEvent.type(screen.getByLabelText(/confirme/i), 'senha-definitiva-1');
    await userEvent.click(screen.getByRole('button', { name: /redefinir/i }));
    await waitFor(() => expect(mocks.redefinir).toHaveBeenCalledWith('abc123', 'senha-definitiva-1'));
    expect((await screen.findByTestId('login')).dataset.state).toContain('senhaRedefinida');
  });

  it('exige confirmação igual e mínimo de 10 caracteres', async () => {
    renderizar('/redefinir-senha?token=abc123');
    await userEvent.type(screen.getByLabelText(/^nova senha/i), 'curta');
    await userEvent.type(screen.getByLabelText(/confirme/i), 'diferente');
    await userEvent.click(screen.getByRole('button', { name: /redefinir/i }));
    expect(await screen.findByText(/m[ií]nimo de 10/i)).toBeInTheDocument();
    expect(mocks.redefinir).not.toHaveBeenCalled();
  });

  it('link inválido ou expirado: mensagem única e caminho para pedir outro', async () => {
    mocks.redefinir.mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { message: 'x' } } });
    renderizar('/redefinir-senha?token=velho');
    await userEvent.type(screen.getByLabelText(/^nova senha/i), 'senha-definitiva-1');
    await userEvent.type(screen.getByLabelText(/confirme/i), 'senha-definitiva-1');
    await userEvent.click(screen.getByRole('button', { name: /redefinir/i }));
    expect(await screen.findByText(/link inv[áa]lido ou expirado/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /pedir um novo/i })).toHaveAttribute('href', '/esqueci-senha');
  });

  it('sem token na URL: não deixa tentar', () => {
    renderizar('/redefinir-senha');
    expect(screen.getByText(/link inv[áa]lido ou expirado/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /redefinir/i })).not.toBeInTheDocument();
  });
});
