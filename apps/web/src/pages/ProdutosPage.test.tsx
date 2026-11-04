import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), desativar: vi.fn() }));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, produtosApi: { list: mocks.list, create: mocks.create, update: mocks.update, desativar: mocks.desativar } };
});

import { ProdutosPage } from './ProdutosPage';

const produto = {
  id: 'pr1', codigo: 100, nome: 'Produto de teste', tipo: 'cateter_vapro', sexo: 'universal', embalagem: 'standard',
  projeto: 'ALPHA', descricaoTecnica: 'desc', ativo: true,
};

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProdutosPage />
    </QueryClientProvider>,
  );
}

describe('ProdutosPage — catálogo operacional', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.list.mockResolvedValue([produto, { ...produto, id: 'pr2', codigo: 101, nome: 'Produto antigo', ativo: false }]);
  });

  it('catálogo vazio mostra a orientação (não há seed)', async () => {
    mocks.list.mockResolvedValue([]);
    montar();
    expect(await screen.findByText(/Nenhum produto cadastrado/)).toBeInTheDocument();
  });

  it('lista os produtos com a situação e pede inativos só quando marcado', async () => {
    const user = userEvent.setup();
    montar();
    expect(await screen.findByText('Produto de teste')).toBeInTheDocument();
    expect(mocks.list).toHaveBeenLastCalledWith({ incluirInativos: false });

    await user.click(screen.getByLabelText('Mostrar produtos inativos'));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith({ incluirInativos: true }));
    expect(screen.getAllByText('Inativo').length).toBeGreaterThan(0);
  });

  it('editar abre o formulário com o código travado e salva sem enviar o código', async () => {
    const user = userEvent.setup();
    mocks.update.mockResolvedValue(produto);
    montar();
    await screen.findByText('Produto de teste');

    await user.click(screen.getByRole('button', { name: 'Editar Produto de teste' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByLabelText('Código *')).toBeDisabled();

    const nome = within(dialogo).getByLabelText('Nome *');
    await user.clear(nome);
    await user.type(nome, 'Nome novo');
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    const [codigo, payload] = mocks.update.mock.calls[0];
    expect(codigo).toBe(100);
    expect(payload).toMatchObject({ nome: 'Nome novo' });
    expect(payload).not.toHaveProperty('codigo');
  });

  it('desativar pede confirmação e chama a API com o código', async () => {
    const user = userEvent.setup();
    mocks.desativar.mockResolvedValue({ ...produto, ativo: false });
    montar();
    await screen.findByText('Produto de teste');

    await user.click(screen.getByRole('button', { name: 'Desativar Produto de teste' }));
    const dialogo = await screen.findByRole('dialog');
    expect(mocks.desativar).not.toHaveBeenCalled();
    await user.click(within(dialogo).getByRole('button', { name: 'Desativar' }));

    await waitFor(() => expect(mocks.desativar).toHaveBeenCalledWith(100));
  });
});
