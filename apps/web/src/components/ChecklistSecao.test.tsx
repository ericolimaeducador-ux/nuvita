import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  listByPaciente: vi.fn(), create: vi.fn(), criarPadrao: vi.fn(), update: vi.fn(), remove: vi.fn(),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, checklistApi: { ...mocks } };
});

import { ChecklistSecao } from './ChecklistSecao';

const itens = [
  { id: 'i1', clinicaId: 'c1', pacienteId: 'p1', nome: 'Comprovante de endereço', status: 'pendente' },
  { id: 'i2', clinicaId: 'c1', pacienteId: 'p1', nome: 'Relatório médico', status: 'recebido' },
];

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ChecklistSecao pacienteId="p1" />
    </QueryClientProvider>,
  );
}

describe('ChecklistSecao', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.listByPaciente.mockResolvedValue(itens);
  });

  it('lista os itens e mostra o progresso', async () => {
    montar();
    expect(await screen.findByText('Comprovante de endereço')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByLabelText('Recebido: Relatório médico')).toBeChecked();
    expect(screen.getByLabelText('Recebido: Comprovante de endereço')).not.toBeChecked();
  });

  it('marcar como recebido chama a API com o status recebido', async () => {
    const user = userEvent.setup();
    mocks.update.mockResolvedValue({ ...itens[0], status: 'recebido' });
    montar();
    await screen.findByText('Comprovante de endereço');

    await user.click(screen.getByLabelText('Recebido: Comprovante de endereço'));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('i1', { status: 'recebido' }));
  });

  it('remover pede confirmação antes de chamar a API', async () => {
    const user = userEvent.setup();
    mocks.remove.mockResolvedValue({ ok: true });
    montar();
    await screen.findByText('Comprovante de endereço');

    await user.click(screen.getByRole('button', { name: 'Remover Comprovante de endereço' }));
    const dialogo = await screen.findByRole('dialog');
    expect(mocks.remove).not.toHaveBeenCalled();
    await user.click(within(dialogo).getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('i1'));
  });

  it('aplicar lista padrão e adicionar documento chamam a API', async () => {
    const user = userEvent.setup();
    mocks.criarPadrao.mockResolvedValue([]);
    mocks.create.mockResolvedValue(itens[0]);
    montar();
    await screen.findByText('Comprovante de endereço');

    await user.click(screen.getByRole('button', { name: 'Aplicar lista padrão' }));
    await waitFor(() => expect(mocks.criarPadrao).toHaveBeenCalledWith('p1'));

    await user.type(screen.getByLabelText('Novo documento'), 'Cartão do SUS');
    await user.click(screen.getByRole('button', { name: /Adicionar/ }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ pacienteId: 'p1', nome: 'Cartão do SUS' }));
  });

  it('falha ao carregar não parece "checklist vazio"', async () => {
    mocks.listByPaciente.mockRejectedValue(new Error('falhou'));
    montar();
    expect(await screen.findByTestId('erro-consulta')).toBeInTheDocument();
  });
});
