import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';

const mocks = vi.hoisted(() => ({
  pacientesList: vi.fn(),
  agendaList: vi.fn(),
  painel: vi.fn(),
}));

vi.mock('@/auth/AuthContext', async () => {
  const { Modulo } = await import('@/types');
  return {
    useAuth: () => ({
      user: { id: 'u1', clinicaId: 'c1', papel: 'ENFERMEIRO', nome: 'Psi Teste' },
      permissoes: [Modulo.FINANCEIRO_PSICOLOGIA],
    }),
  };
});

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    pacientesApi: { ...original.pacientesApi, list: mocks.pacientesList },
    agendaApi: { ...original.agendaApi, list: mocks.agendaList },
    psicoFinanceiroApi: { ...original.psicoFinanceiroApi, painel: mocks.painel },
  };
});

import { DashboardPage } from './DashboardPage';

function erroHttp(status: number) {
  return new AxiosError('falha interna', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: {},
    statusText: '',
    headers: {},
    config: {} as never,
  });
}

const agendamento = {
  id: 'a1',
  pacienteId: 'p1',
  tipo: 'sessao_psicoterapia',
  status: 'concluido',
  dataHoraInicio: '2026-10-05T14:00:00.000Z',
  dataHoraFim: '2026-10-05T14:50:00.000Z',
};

const painelOk = {
  sessoesPorCiclo: 4,
  recebidoNoMes: 0,
  aReceber: 0,
  ciclosACobrar: 0,
  pacientes: [
    { pacienteId: 'p1', pacienteNome: 'Maria Demonstração', sessoesRealizadas: 5, proximaSessao: 6, cicloAtual: 2, sessoesNoCiclo: 1 },
  ],
};

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const valorDoCartao = (titulo: string) => screen.getByText(titulo).parentElement as HTMLElement;

describe('Dashboard — falha explícita em vez de zeros', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacientesList.mockResolvedValue({ items: [{ id: 'p1' }], total: 12, hasMore: false });
    mocks.agendaList.mockResolvedValue([agendamento]);
    mocks.painel.mockResolvedValue(painelOk);
  });

  it('com tudo ok: números reais e painel de psicoterapia', async () => {
    renderizar();
    expect(await screen.findByText('Psicoterapia — sessões e ciclos')).toBeInTheDocument();
    expect(valorDoCartao('Pacientes ativos')).toHaveTextContent('12');
    expect(valorDoCartao('Agendamentos hoje')).toHaveTextContent('1');
    expect(screen.queryByTestId('erro-consulta')).not.toBeInTheDocument();
  });

  it('agenda vazia legítima: cartões 0 e "Nenhum agendamento para hoje"', async () => {
    mocks.agendaList.mockResolvedValue([]);
    renderizar();
    expect(await screen.findByText('Nenhum agendamento para hoje')).toBeInTheDocument();
    expect(valorDoCartao('Agendamentos hoje')).toHaveTextContent('0');
  });

  it('erro na agenda: cartões com "—" (nunca 0) e alerta no lugar de "Nenhum agendamento"', async () => {
    mocks.agendaList.mockRejectedValue(erroHttp(403));
    renderizar();
    const alertas = await screen.findAllByRole('alert');
    expect(alertas.some((a) => a.textContent?.includes('Seu perfil não tem acesso'))).toBe(true);
    expect(screen.queryByText('Nenhum agendamento para hoje')).not.toBeInTheDocument();
    expect(valorDoCartao('Agendamentos hoje')).toHaveTextContent('—');
    expect(valorDoCartao('Agendamentos hoje')).not.toHaveTextContent(/\b0\b/);
    expect(valorDoCartao('Atendimentos realizados')).toHaveTextContent('—');
  });

  it('erro na contagem de pacientes: cartão com "—" e alerta', async () => {
    mocks.pacientesList.mockRejectedValue(erroHttp(500));
    renderizar();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/pacientes/i);
    expect(valorDoCartao('Pacientes ativos')).toHaveTextContent('—');
  });

  it('erro no painel de psicoterapia: alerta explícito em vez de sumir silenciosamente', async () => {
    mocks.painel.mockRejectedValue(erroHttp(500));
    renderizar();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/sessões e ciclos/i);
    expect(within(alerta).getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });
});
