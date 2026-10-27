import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

// BUG-025: duas frases distintas, cada uma só com a sua própria contagem (o servidor decide; a tela só exibe).
const mocks = vi.hoisted(() => ({ painel: vi.fn(), pacientesList: vi.fn(), agendaList: vi.fn() }));

vi.mock('@/auth/AuthContext', async () => {
  const { Modulo } = await import('@/types');
  return {
    useAuth: () => ({
      user: { id: 'u1', clinicaId: 'c1', papel: 'PSICOLOGO', nome: 'Psi Teste' },
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
import { FinanceiroPsicologiaPage } from './FinanceiroPsicologiaPage';

const linha = (over: Record<string, unknown> = {}) => ({
  pacienteId: 'p1', pacienteNome: 'Bruno Exemplo', sessoesRealizadas: 1, proximaSessao: 2, cicloAtual: 1, sessoesNoCiclo: 1,
  sessoesAteFecharCiclo: 3, statusCiclo: 'a_cobrar', valorEmAberto: 0, cobrancas: [], ...over,
});
const painel = (over: Record<string, unknown>) => ({
  sessoesPorCiclo: 4, recebidoNoMes: 0, aReceber: 0, ciclosACobrar: 0, ciclosFechadosARenovar: 0, ciclosSemCobranca: 0,
  pacientes: [linha()], ...over,
});

function renderizar(pagina: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{pagina}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Dashboard — alerta de ciclo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacientesList.mockResolvedValue({ items: [], total: 0 });
    mocks.agendaList.mockResolvedValue([]);
  });

  it('só "sem cobrança no ciclo atual": NÃO diz que fechou o ciclo', async () => {
    mocks.painel.mockResolvedValue(painel({ ciclosACobrar: 1, ciclosSemCobranca: 1 }));
    renderizar(<DashboardPage />);
    expect(await screen.findByText(/Um paciente está sem cobrança no ciclo atual/)).toBeInTheDocument();
    expect(screen.queryByText(/fechou o ciclo/)).not.toBeInTheDocument();
  });

  it('só "ciclo fechado": mantém a frase de renovar e não fala de "sem cobrança"', async () => {
    mocks.painel.mockResolvedValue(painel({ ciclosACobrar: 1, ciclosFechadosARenovar: 1 }));
    renderizar(<DashboardPage />);
    expect(await screen.findByText(/Um paciente fechou o ciclo de 4 sessões — hora de renovar o pagamento/)).toBeInTheDocument();
    expect(screen.queryByText(/sem cobrança no ciclo atual/)).not.toBeInTheDocument();
  });

  it('as duas situações: as duas frases, com plural', async () => {
    mocks.painel.mockResolvedValue(painel({ ciclosACobrar: 5, ciclosFechadosARenovar: 2, ciclosSemCobranca: 3 }));
    renderizar(<DashboardPage />);
    expect(await screen.findByText(/2 pacientes fecharam o ciclo de 4 sessões — hora de renovar o pagamento/)).toBeInTheDocument();
    expect(screen.getByText(/3 pacientes estão sem cobrança no ciclo atual/)).toBeInTheDocument();
  });

  it('nenhuma das duas: sem alerta', async () => {
    mocks.painel.mockResolvedValue(painel({}));
    renderizar(<DashboardPage />);
    await screen.findByText(/Bruno Exemplo/);
    expect(screen.queryByText(/fechou o ciclo|sem cobrança no ciclo atual/)).not.toBeInTheDocument();
  });
});

describe('Financeiro (Psi) — alerta de ciclo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('só "sem cobrança": frase própria, sem "fechou o ciclo"', async () => {
    mocks.painel.mockResolvedValue(painel({ ciclosACobrar: 1, ciclosSemCobranca: 1 }));
    renderizar(<FinanceiroPsicologiaPage />);
    expect(await screen.findByText(/Um paciente está atendendo sem cobrança no ciclo atual/)).toBeInTheDocument();
    expect(screen.queryByText(/fechou o ciclo/)).not.toBeInTheDocument();
  });

  it('só "ciclo fechado": a frase de ainda não cobrado', async () => {
    mocks.painel.mockResolvedValue(painel({ ciclosACobrar: 2, ciclosFechadosARenovar: 2 }));
    renderizar(<FinanceiroPsicologiaPage />);
    expect(await screen.findByText(/2 pacientes fecharam o ciclo e ainda não foram cobrados/)).toBeInTheDocument();
    expect(screen.queryByText(/atendendo sem cobrança/)).not.toBeInTheDocument();
  });
});
