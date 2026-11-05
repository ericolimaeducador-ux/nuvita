import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ resumo: vi.fn(), config: vi.fn(), salvarConfig: vi.fn(), listByClinica: vi.fn(), papel: { atual: 'ADMIN' } }));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, cobrancasApi: { ...original.cobrancasApi, resumo: mocks.resumo, config: mocks.config, salvarConfig: mocks.salvarConfig, listByClinica: mocks.listByClinica } };
});
vi.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ user: { papel: mocks.papel.atual } }) }));

import { FinanceiroPacientesPage } from './FinanceiroPacientesPage';

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <FinanceiroPacientesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('FinanceiroPacientesPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => typeof m === 'function' && m.mockReset());
    mocks.papel.atual = 'ADMIN';
    mocks.resumo.mockResolvedValue({
      mes: '2026-06', aReceberCentavos: 300000, recebidoCentavos: 800000, vencidoCentavos: 400000,
      quantidades: { aReceber: 2, recebido: 3, vencido: 1 },
    });
    mocks.config.mockResolvedValue({ valorConsultaAvaliacaoCentavos: 22000 });
    mocks.listByClinica.mockResolvedValue({
      items: [
        { id: 'c1', pacienteId: 'p1', pacienteNome: 'Maria da Silva', descricao: 'Pacote A', valorCentavos: 35000, status: 'vencida', vencimento: '2026-05-05T00:00:00.000Z', tipo: 'outro', itens: [] },
        { id: 'c2', pacienteId: 'p2', pacienteNome: 'João Souza', descricao: 'Consulta', valorCentavos: 22000, status: 'pendente', vencimento: '2099-01-10T00:00:00.000Z', tipo: 'consulta_avaliacao', itens: [] },
      ],
      hasMore: false,
    });
  });

  it('lista as cobranças pendentes e vencidas com o NOME do paciente (pedindo só os status em aberto)', async () => {
    montar();
    expect(await screen.findByText('Maria da Silva')).toBeInTheDocument();
    expect(screen.getByText('João Souza')).toBeInTheDocument();
    expect(screen.getByText('Vencida')).toBeInTheDocument();
    expect(screen.getByText('05/05/2026')).toBeInTheDocument();
    expect(mocks.listByClinica).toHaveBeenCalledWith(expect.objectContaining({ status: ['pendente', 'enviada', 'vencida'], limit: 20 }));
  });

  it('"Carregar mais" busca a próxima página pelo cursor', async () => {
    const user = userEvent.setup();
    mocks.listByClinica
      .mockResolvedValueOnce({ items: [{ id: 'c1', pacienteId: 'p1', pacienteNome: 'Maria da Silva', descricao: 'A', valorCentavos: 100, status: 'pendente', vencimento: '2099-01-10T00:00:00.000Z', tipo: 'outro', itens: [] }], hasMore: true, nextCursor: 'cur1' })
      .mockResolvedValueOnce({ items: [{ id: 'c9', pacienteId: 'p9', pacienteNome: 'Ana Nova', descricao: 'B', valorCentavos: 100, status: 'pendente', vencimento: '2099-02-10T00:00:00.000Z', tipo: 'outro', itens: [] }], hasMore: false });
    montar();
    await screen.findByText('Maria da Silva');

    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByText('Ana Nova')).toBeInTheDocument();
    expect(mocks.listByClinica).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'cur1' }));
  });

  it('lista vazia mostra a mensagem; falha ao carregar não parece lista vazia', async () => {
    mocks.listByClinica.mockResolvedValueOnce({ items: [], hasMore: false });
    const { unmount } = montar();
    expect(await screen.findByText(/Nenhuma cobrança pendente ou vencida/)).toBeInTheDocument();
    unmount();

    mocks.listByClinica.mockRejectedValue(new Error('falhou'));
    montar();
    expect(await screen.findByTestId('erro-consulta')).toBeInTheDocument();
  });

  it('mostra a receber, recebido e vencido do mês', async () => {
    montar();
    expect(await screen.findByTestId('resumo-A receber')).toHaveTextContent('3.000,00');
    expect(screen.getByTestId('resumo-Recebido')).toHaveTextContent('8.000,00');
    expect(screen.getByTestId('resumo-Vencido')).toHaveTextContent('4.000,00');
  });

  it('o ADMIN edita o valor da consulta de avaliação (salvo em centavos)', async () => {
    const user = userEvent.setup();
    mocks.salvarConfig.mockResolvedValue({ valorConsultaAvaliacaoCentavos: 25050 });
    montar();
    const campo = await screen.findByLabelText('Valor (R$)');
    await waitFor(() => expect(campo).toHaveValue('220,00'));

    await user.clear(campo);
    await user.type(campo, '250,50');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mocks.salvarConfig).toHaveBeenCalledWith(25050));
  });

  it('quem não é ADMIN vê o valor, mas não edita', async () => {
    mocks.papel.atual = 'SECRETARIA';
    montar();
    const campo = await screen.findByLabelText('Valor (R$)');
    await waitFor(() => expect(campo).toHaveValue('220,00'));
    expect(campo).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
  });
});
