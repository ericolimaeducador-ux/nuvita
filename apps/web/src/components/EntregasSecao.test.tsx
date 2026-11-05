import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  listByPaciente: vi.fn(),
  create: vi.fn(),
  confirmar: vi.fn(),
  produtosList: vi.fn(),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    entregasApi: { listByPaciente: mocks.listByPaciente, create: mocks.create, confirmar: mocks.confirmar },
    produtosApi: { ...original.produtosApi, list: mocks.produtosList },
  };
});

import { EntregasSecao } from './EntregasSecao';

const entregaPendente = {
  id: 'e1', clinicaId: 'c1', pacienteId: 'p1', dataEntrega: '2026-02-10T00:00:00.000Z', origem: 'sus', status: 'pendente',
  itens: [{ codigo: 100, descricao: 'Cateter teste', quantidade: 2, valorUnitarioCentavos: 500, valorTotalCentavos: 1000 }],
  valorTotalCentavos: 1000,
};
const entregaEntregue = { ...entregaPendente, id: 'e2', status: 'entregue' };

function montar(podeConfirmar: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EntregasSecao pacienteId="p1" podeConfirmar={podeConfirmar} />
    </QueryClientProvider>,
  );
}

describe('EntregasSecao', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.listByPaciente.mockResolvedValue([entregaPendente, entregaEntregue]);
    mocks.produtosList.mockResolvedValue([
      { id: 'pr1', codigo: 100, nome: 'Cateter teste', tipo: 'cateter_vapro', ativo: true },
    ]);
  });

  it('lista as entregas do paciente com status e valor', async () => {
    montar(true);
    expect((await screen.findAllByText(/2× Cateter teste/)).length).toBe(2);
    expect(screen.getAllByText('SUS').length).toBe(2);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Entregue')).toBeInTheDocument();
  });

  it('quem pode confirmar vê "Confirmar" só nas entregas ainda não entregues', async () => {
    montar(true);
    await screen.findByText('Pendente');
    expect(screen.getAllByRole('button', { name: 'Confirmar' })).toHaveLength(1);
  });

  it('quem NÃO pode confirmar (secretária) não vê o botão', async () => {
    montar(false);
    await screen.findByText('Pendente');
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
  });

  it('confirmar pede confirmação e chama a API com o id da entrega', async () => {
    const user = userEvent.setup();
    mocks.confirmar.mockResolvedValue({ ...entregaPendente, status: 'entregue' });
    montar(true);
    await screen.findByText('Pendente');

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    const dialogo = await screen.findByRole('dialog');
    expect(mocks.confirmar).not.toHaveBeenCalled();
    await user.click(within(dialogo).getByRole('button', { name: 'Confirmar entrega' }));

    await waitFor(() => expect(mocks.confirmar).toHaveBeenCalledWith('e1'));
  });

  it('catálogo vazio avisa para pedir ao administrador', async () => {
    const user = userEvent.setup();
    mocks.produtosList.mockResolvedValue([]);
    montar(true);
    await screen.findByText('Pendente');

    await user.click(screen.getByRole('button', { name: /Registrar entrega/ }));

    expect(await screen.findByText(/Catálogo vazio/)).toBeInTheDocument();
  });

  it('falha ao carregar não parece "sem entregas"', async () => {
    mocks.listByPaciente.mockRejectedValue(new Error('falhou'));
    montar(true);
    expect(await screen.findByTestId('erro-consulta')).toBeInTheDocument();
  });
});
