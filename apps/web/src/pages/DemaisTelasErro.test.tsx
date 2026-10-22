import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { ReactElement } from 'react';

const mocks = vi.hoisted(() => ({
  notificacoes: vi.fn(),
  painel: vi.fn(),
  listarPorPaciente: vi.fn(),
  prontuarioGet: vi.fn(),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', clinicaId: 'c1', papel: 'PSICOLOGO', nome: 'Psi Teste' }, permissoes: [] }),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    notificacoesApi: { ...original.notificacoesApi, dashboard: mocks.notificacoes },
    psicoFinanceiroApi: { ...original.psicoFinanceiroApi, painel: mocks.painel },
    prontuariosApi: { ...original.prontuariosApi, get: mocks.prontuarioGet },
  };
});

vi.mock('@/api/tickets', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/tickets')>();
  return { ...original, ticketsApi: { ...original.ticketsApi, listarPorPaciente: mocks.listarPorPaciente } };
});

import { NotificacoesPage } from './NotificacoesPage';
import { FinanceiroPsicologiaPage } from './FinanceiroPsicologiaPage';
import { TicketsDoPaciente } from '@/components/CorrecaoIdentidadeDialogs';
import { ProntuarioDetailDialog } from '@/components/ProntuarioDialogs';

function erroHttp(status: number, mensagemApi = 'detalhe interno da API') {
  return new AxiosError('Request failed with status code ' + status, 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: { message: mensagemApi },
    statusText: '',
    headers: {},
    config: {} as never,
  });
}

function renderizar(pagina: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{pagina}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Notificações — falha explícita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notificacoes.mockResolvedValue({ enviadas: 5, entregues: 4, pendentes: 1, falhas: 0, recentes: [] });
  });

  it('com dados: mostra os números reais', async () => {
    renderizar(<NotificacoesPage />);
    expect(await screen.findByText('Enviadas')).toBeInTheDocument();
    expect((screen.getByText('Enviadas').parentElement as HTMLElement)).toHaveTextContent('5');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('403: ErroConsulta (sem mensagem crua da API) e cartões com "—" em vez de 0', async () => {
    mocks.notificacoes.mockRejectedValue(erroHttp(403));
    renderizar(<NotificacoesPage />);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(alerta).not.toHaveTextContent(/detalhe interno|Request failed/);
    const cartao = screen.getByText('Enviadas').parentElement as HTMLElement;
    expect(cartao).toHaveTextContent('—');
    expect(cartao).not.toHaveTextContent(/\b0\b/);
  });
});

describe('Financeiro da psicologia — falha explícita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.painel.mockResolvedValue({ sessoesPorCiclo: 4, recebidoNoMes: 0, aReceber: 0, ciclosACobrar: 0, pacientes: [] });
  });

  it('sem pacientes (legítimo): mensagem de nenhum paciente em acompanhamento', async () => {
    renderizar(<FinanceiroPsicologiaPage />);
    expect(await screen.findByText(/Nenhum paciente em acompanhamento ainda/)).toBeInTheDocument();
  });

  it('403 no painel: ErroConsulta padronizado, sem mensagem crua da API', async () => {
    mocks.painel.mockRejectedValue(erroHttp(403));
    renderizar(<FinanceiroPsicologiaPage />);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(alerta).not.toHaveTextContent(/detalhe interno|Request failed/);
    expect(screen.queryByText(/Nenhum paciente em acompanhamento ainda/)).not.toBeInTheDocument();
  });

  it('500 no painel: ErroConsulta com nova tentativa', async () => {
    mocks.painel.mockRejectedValueOnce(erroHttp(500)).mockResolvedValue({
      sessoesPorCiclo: 4, recebidoNoMes: 0, aReceber: 0, ciclosACobrar: 0, pacientes: [],
    });
    renderizar(<FinanceiroPsicologiaPage />);
    const alerta = await screen.findByRole('alert');
    await userEvent.click(within(alerta).getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText(/Nenhum paciente em acompanhamento ainda/)).toBeInTheDocument();
  });
});

describe('Tickets do paciente — mesma mensagem padrão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listarPorPaciente.mockResolvedValue([]);
  });

  it('403: mensagem de perfil sem acesso e SEM nova tentativa', async () => {
    mocks.listarPorPaciente.mockRejectedValue(erroHttp(403));
    renderizar(<TicketsDoPaciente pacienteId="p1" />);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(within(alerta).queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it('500: alerta com nova tentativa que refaz a consulta', async () => {
    mocks.listarPorPaciente.mockRejectedValueOnce(erroHttp(500)).mockResolvedValue([]);
    renderizar(<TicketsDoPaciente pacienteId="p1" />);
    const alerta = await screen.findByRole('alert');
    await userEvent.click(within(alerta).getByRole('button', { name: /tentar novamente/i }));
    expect(mocks.listarPorPaciente).toHaveBeenCalledTimes(2);
  });

  it('sem tickets (legítimo): não renderiza nada', async () => {
    const { container } = renderizar(<TicketsDoPaciente pacienteId="p1" />);
    await vi.waitFor(() => expect(mocks.listarPorPaciente).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Diálogo do prontuário — falha explícita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const dialogo = () => <ProntuarioDetailDialog prontuarioId="r1" open onOpenChange={vi.fn()} />;

  it('403: perfil sem acesso, sem nova tentativa (não é "não foi possível carregar" genérico)', async () => {
    mocks.prontuarioGet.mockRejectedValue(erroHttp(403));
    renderizar(dialogo());
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(within(alerta).queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it('500: alerta com nova tentativa que refaz a consulta', async () => {
    mocks.prontuarioGet.mockRejectedValue(erroHttp(500));
    renderizar(dialogo());
    const alerta = await screen.findByRole('alert');
    await userEvent.click(within(alerta).getByRole('button', { name: /tentar novamente/i }));
    expect(mocks.prontuarioGet).toHaveBeenCalledTimes(2);
  });
});
