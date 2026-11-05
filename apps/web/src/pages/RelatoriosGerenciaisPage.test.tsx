import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';

const mocks = vi.hoisted(() => ({
  pacientes: vi.fn(),
  agendamentos: vi.fn(),
  financeiro: vi.fn(),
  cobrancas: vi.fn(),
  perda: vi.fn(),
  vagos: vi.fn(),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', clinicaId: 'c1', papel: 'ADMIN', nome: 'Admin Teste' }, permissoes: [] }),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    analyticsApi: {
      ...original.analyticsApi,
      pacientes: mocks.pacientes,
      agendamentos: mocks.agendamentos,
      financeiro: mocks.financeiro,
      cobrancasPsicologia: mocks.cobrancas,
      perdaSeguimento: mocks.perda,
      horariosVagos: mocks.vagos,
    },
  };
});

import { RelatoriosGerenciaisPage } from './RelatoriosGerenciaisPage';

function erroHttp(status: number) {
  return new AxiosError('falha interna', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: {},
    statusText: '',
    headers: {},
    config: {} as never,
  });
}

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RelatoriosGerenciaisPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const tile = (rotulo: string) => screen.getByText(rotulo).parentElement as HTMLElement;
const cartao = (titulo: string) => screen.getByText(titulo).closest('div[class*="rounded"]') as HTMLElement;

describe('Relatórios gerenciais — falha explícita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacientes.mockResolvedValue({ totalAtivos: 7, novosPorMes: [{ _id: { ano: 2026, mes: 9 }, total: 3 }], porSexo: [] });
    mocks.agendamentos.mockResolvedValue({ porStatus: [], porTipo: [], topMedicos: [], porMes: [], porDia: [], porSemana: [] });
    mocks.financeiro.mockResolvedValue({ receitasPorMes: [], despesasPorMes: [], porFormaPagamento: [], totalGeral: [] });
    mocks.cobrancas.mockResolvedValue({ vencidas: [], aVencer: [], totalVencido: 0, totalAVencer: 0 });
    mocks.perda.mockResolvedValue([]);
    mocks.vagos.mockResolvedValue([]);
  });

  it('dados vazios legítimos continuam com as mensagens de "sem dados"', async () => {
    renderizar();
    expect(await screen.findByText('Nenhuma cobrança pendente.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum sinal de perda de seguimento.')).toBeInTheDocument();
    expect(screen.getByText('Sem horários livres nessa janela.')).toBeInTheDocument();
    expect(screen.getAllByText('Sem dados no período.').length).toBeGreaterThan(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(tile('Novos no período')).toHaveTextContent('3');
  });

  it('erro em pacientes: tile "Novos no período" mostra "—" (nunca 0) e alerta', async () => {
    mocks.pacientes.mockRejectedValue(erroHttp(403));
    renderizar();
    const alertas = await screen.findAllByRole('alert');
    expect(alertas.some((a) => a.textContent?.includes('Seu perfil não tem acesso'))).toBe(true);
    expect(tile('Novos no período')).toHaveTextContent('—');
    expect(tile('Novos no período')).not.toHaveTextContent(/\b0\b/);
  });

  it('erro em agendamentos: os 3 gráficos mostram alerta, NUNCA "Sem dados no período"', async () => {
    mocks.agendamentos.mockRejectedValue(erroHttp(500));
    renderizar();
    await screen.findAllByRole('alert');
    for (const titulo of ['Atendimentos por mês', 'Atendimentos por semana', 'Atendimentos por dia']) {
      const c = cartao(titulo);
      expect(within(c).getByRole('alert')).toBeInTheDocument();
      expect(within(c).queryByText('Sem dados no período.')).not.toBeInTheDocument();
    }
  });

  it('erro em financeiro: gráfico de receita com alerta e tile "Receita recebida" com "—"', async () => {
    mocks.financeiro.mockRejectedValue(erroHttp(500));
    renderizar();
    await screen.findAllByRole('alert');
    expect(within(cartao('Receita recebida por mês')).getByRole('alert')).toBeInTheDocument();
    expect(tile('Receita recebida no período')).toHaveTextContent('—');
    expect(tile('Receita recebida no período')).not.toHaveTextContent('R$');
  });

  it('erro em cobranças: alerta, "—" no tile de vencidas e NUNCA "Nenhuma cobrança pendente"', async () => {
    mocks.cobrancas.mockRejectedValue(erroHttp(403));
    renderizar();
    await screen.findAllByRole('alert');
    expect(screen.queryByText('Nenhuma cobrança pendente.')).not.toBeInTheDocument();
    expect(tile('Cobranças vencidas')).toHaveTextContent('—');
    expect(tile('Cobranças vencidas')).not.toHaveTextContent('R$');
  });

  it('erro em perda de seguimento: alerta, NUNCA "Nenhum sinal de perda de seguimento"', async () => {
    mocks.perda.mockRejectedValue(erroHttp(500));
    renderizar();
    await screen.findAllByRole('alert');
    expect(screen.queryByText('Nenhum sinal de perda de seguimento.')).not.toBeInTheDocument();
  });

  it('erro em horários vagos: alerta com nova tentativa, NUNCA "Sem horários livres"', async () => {
    mocks.vagos.mockRejectedValueOnce(erroHttp(500)).mockResolvedValue([]);
    renderizar();
    const alertas = await screen.findAllByRole('alert');
    expect(screen.queryByText('Sem horários livres nessa janela.')).not.toBeInTheDocument();
    const botao = within(alertas[0]).getByRole('button', { name: /tentar novamente/i });
    await userEvent.click(botao);
    expect(await screen.findByText('Sem horários livres nessa janela.')).toBeInTheDocument();
  });
});
