import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ lista: vi.fn() }));
vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, superAdminApi: { ...original.superAdminApi, recuperacaoSenha: mocks.lista } };
});

import { RecuperacaoSenhaPainel } from './RecuperacaoSenhaPainel';

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><RecuperacaoSenhaPainel /></QueryClientProvider>);
}

describe('RecuperacaoSenhaPainel (super-admin vê quem está travado)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista pedidos e conclusões com e-mail, caminho e resultado', async () => {
    mocks.lista.mockResolvedValue([
      { evento: 'PASSWORD_RESET_REQUESTED', quando: '2026-10-25T12:00:00Z', email: 'a@x.com', caminho: 'AUTOATENDIMENTO', resultado: 'ENVIADO' },
      { evento: 'PASSWORD_RESET_BY_ADMIN', quando: '2026-10-25T13:00:00Z', email: 'b@x.com', caminho: 'SUPER_ADMIN', resultado: 'SUCESSO' },
    ]);
    renderizar();
    expect(await screen.findByText('a@x.com')).toBeInTheDocument();
    expect(screen.getByText(/e-mail enviado/i)).toBeInTheDocument();
    expect(screen.getByText('super-admin')).toBeInTheDocument();
  });

  it('falha da consulta aparece como erro explícito, não como "nenhum pedido"', async () => {
    mocks.lista.mockRejectedValue({ isAxiosError: true, response: { status: 500, data: {} } });
    renderizar();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/nenhum pedido/i)).not.toBeInTheDocument();
  });
});
