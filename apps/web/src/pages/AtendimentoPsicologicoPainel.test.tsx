import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';

const mocks = vi.hoisted(() => ({
  agendaList: vi.fn(),
  painel: vi.fn(),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', clinicaId: 'c1', papel: 'ENFERMEIRO', nome: 'Psi Teste' } }),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    agendaApi: { ...original.agendaApi, list: mocks.agendaList },
    psicoFinanceiroApi: { ...original.psicoFinanceiroApi, painel: mocks.painel },
  };
});

import { AtendimentoPsicologicoPage } from './AtendimentoPsicologicoPage';

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
  clinicaId: 'c1',
  pacienteId: 'p1',
  pacienteNome: 'Maria Demonstração',
  medicoId: 'u1',
  tipo: 'sessao_psicoterapia',
  status: 'agendado',
  dataHoraInicio: '2026-10-05T14:00:00.000Z',
  dataHoraFim: '2026-10-05T14:50:00.000Z',
};

const painelOk = (pacientes: unknown[] = [
  { pacienteId: 'p1', sessoesRealizadas: 5, proximaSessao: 6, cicloAtual: 2, sessoesNoCiclo: 1 },
]) => ({ sessoesPorCiclo: 4, recebidoNoMes: 0, aReceber: 0, ciclosACobrar: 0, pacientes });

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AtendimentoPsicologicoPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Atendimento psicológico — numeração da sessão (painel de cobrança)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.agendaList.mockResolvedValue([agendamento]);
    mocks.painel.mockResolvedValue(painelOk());
  });

  it('painel ok: mostra a sessão e o ciclo calculados pela API', async () => {
    renderizar();
    expect(await screen.findByText('6ª sessão')).toBeInTheDocument();
    expect(screen.getByText(/Ciclo 2 · 1\/4 sessões/)).toBeInTheDocument();
  });

  it('paciente ausente de um painel que carregou: continua sendo "1ª consulta"', async () => {
    mocks.painel.mockResolvedValue(painelOk([]));
    renderizar();
    expect(await screen.findByText('1ª consulta')).toBeInTheDocument();
    expect(screen.queryByTestId('erro-consulta')).not.toBeInTheDocument();
  });

  it('403 no painel: alerta explícito e NENHUM número de sessão/ciclo', async () => {
    mocks.painel.mockRejectedValue(erroHttp(403));
    renderizar();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(screen.queryByText('1ª consulta')).not.toBeInTheDocument();
    expect(screen.queryByText(/\dª sessão/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ciclo \d/)).not.toBeInTheDocument();
    expect(screen.getByTestId('numero-sessao-indisponivel')).toBeInTheDocument();
  });

  it('erro no painel não bloqueia as ações (número vem da API; Salvar fica liberado)', async () => {
    mocks.painel.mockRejectedValue(erroHttp(500));
    renderizar();
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: /prontuário/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /atender/i })).toBeEnabled();
  });

  it('500 no painel: "Tentar novamente" refaz a consulta e volta a mostrar os números', async () => {
    mocks.painel.mockRejectedValueOnce(erroHttp(500)).mockResolvedValue(painelOk());
    renderizar();
    const alerta = await screen.findByRole('alert');
    await userEvent.click(within(alerta).getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText('6ª sessão')).toBeInTheDocument();
    expect(mocks.painel).toHaveBeenCalledTimes(2);
  });
});
