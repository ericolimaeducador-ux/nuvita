import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  listByPaciente: vi.fn(), create: vi.fn(), update: vi.fn(), excluir: vi.fn(), produtosList: vi.fn(),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    avaliacaoIUApi: { listByPaciente: mocks.listByPaciente, create: mocks.create, update: mocks.update, excluir: mocks.excluir },
    produtosApi: { ...original.produtosApi, list: mocks.produtosList },
  };
});

import { AvaliacaoIuSecao } from './AvaliacaoIuSecao';

const avaliacao = {
  id: 'a1', clinicaId: 'c1', pacienteId: 'p1', enfermeiroId: 'e1', enfermeiroNome: 'Enf. Ana',
  dataAtendimento: '2026-03-01T00:00:00.000Z', local: 'residencia', motivoIU: 'x', perfilCliente: 'ativo', destreza: 'preservada',
  dntui: false, tiposIU: ['esforco'], miccaoEspontanea: true, realizaCateterismo: false, emTratamento: false,
  autorizaPesquisa: false, aceitaInformacoes: false, criadoEm: '2026-03-01T00:00:00.000Z',
};

function montar(podeEscrever: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AvaliacaoIuSecao pacienteId="p1" podeEscrever={podeEscrever} />
    </QueryClientProvider>,
  );
}

describe('AvaliacaoIuSecao', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.listByPaciente.mockResolvedValue([avaliacao]);
    mocks.produtosList.mockResolvedValue([]);
  });

  it('lista as avaliações com local, tipos e profissional', async () => {
    montar(true);
    expect(await screen.findByText('Residência')).toBeInTheDocument();
    expect(screen.getByText('Esforço')).toBeInTheDocument();
    expect(screen.getByText('Enf. Ana')).toBeInTheDocument();
  });

  it('quem NÃO escreve (secretária) vê a lista, mas não "Nova avaliação" nem editar/excluir', async () => {
    montar(false);
    await screen.findByText('Residência');
    expect(screen.queryByRole('button', { name: /Nova avaliação/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Excluir avaliação/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar avaliação/ })).not.toBeInTheDocument();
  });

  it('excluir pede confirmação e chama a API com o id', async () => {
    const user = userEvent.setup();
    mocks.excluir.mockResolvedValue(avaliacao);
    montar(true);
    await screen.findByText('Residência');

    await user.click(screen.getByRole('button', { name: /Excluir avaliação/ }));
    const dialogo = await screen.findByRole('dialog');
    expect(mocks.excluir).not.toHaveBeenCalled();
    await user.click(within(dialogo).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(mocks.excluir).toHaveBeenCalledWith('a1'));
  });

  it('falha ao carregar não parece "sem avaliações"', async () => {
    mocks.listByPaciente.mockRejectedValue(new Error('falhou'));
    montar(true);
    expect(await screen.findByTestId('erro-consulta')).toBeInTheDocument();
  });
});
