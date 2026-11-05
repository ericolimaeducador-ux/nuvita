import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ resumo: vi.fn(), config: vi.fn(), salvarConfig: vi.fn(), papel: { atual: 'ADMIN' } }));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, cobrancasApi: { ...original.cobrancasApi, resumo: mocks.resumo, config: mocks.config, salvarConfig: mocks.salvarConfig } };
});
vi.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ user: { papel: mocks.papel.atual } }) }));

import { FinanceiroPacientesPage } from './FinanceiroPacientesPage';

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FinanceiroPacientesPage />
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
