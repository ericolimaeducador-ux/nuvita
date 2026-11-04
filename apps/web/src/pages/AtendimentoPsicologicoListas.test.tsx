import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';

const mocks = vi.hoisted(() => ({
  agendaList: vi.fn(),
  painel: vi.fn(),
  prontuariosList: vi.fn(),
  pacientesList: vi.fn(),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', clinicaId: 'c1', papel: 'PSICOLOGO', nome: 'Psi Teste' } }),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    agendaApi: { ...original.agendaApi, list: mocks.agendaList },
    psicoFinanceiroApi: { ...original.psicoFinanceiroApi, painel: mocks.painel },
    prontuariosApi: { ...original.prontuariosApi, list: mocks.prontuariosList },
    pacientesApi: { ...original.pacientesApi, list: mocks.pacientesList },
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

describe('Atendimento psicológico — listas com falha explícita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.agendaList.mockResolvedValue([agendamento]);
    mocks.painel.mockResolvedValue({ sessoesPorCiclo: 4, recebidoNoMes: 0, aReceber: 0, ciclosACobrar: 0, pacientes: [] });
    mocks.prontuariosList.mockResolvedValue([]);
    mocks.pacientesList.mockResolvedValue({ items: [], hasMore: false });
  });

  it('agenda vazia legítima continua mostrando "Nenhum paciente agendado"', async () => {
    mocks.agendaList.mockResolvedValue([]);
    renderizar();
    expect(await screen.findByText(/Nenhum paciente agendado/)).toBeInTheDocument();
  });

  it('403 na agenda: alerta de perfil sem acesso, NUNCA "Nenhum paciente agendado"', async () => {
    mocks.agendaList.mockRejectedValue(erroHttp(403));
    renderizar();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(screen.queryByText(/Nenhum paciente agendado/)).not.toBeInTheDocument();
  });

  it('500 na agenda: "Tentar novamente" refaz a consulta', async () => {
    mocks.agendaList.mockRejectedValueOnce(erroHttp(500)).mockResolvedValue([agendamento]);
    renderizar();
    const alerta = await screen.findByRole('alert');
    await userEvent.click(within(alerta).getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText('Maria Demonstração')).toBeInTheDocument();
  });

  it('histórico de sessões com erro: alerta no diálogo, NUNCA "Nenhuma sessão registrada"', async () => {
    mocks.prontuariosList.mockRejectedValue(erroHttp(500));
    renderizar();
    await userEvent.click(await screen.findByRole('button', { name: /histórico/i }));
    const dialogo = await screen.findByRole('dialog');
    const alerta = await within(dialogo).findByRole('alert');
    expect(alerta).toHaveTextContent(/o histórico de sessões/i);
    expect(within(dialogo).queryByText(/Nenhuma sessão registrada/)).not.toBeInTheDocument();
  });

  it('histórico de sessões vazio legítimo continua dizendo "Nenhuma sessão registrada"', async () => {
    renderizar();
    await userEvent.click(await screen.findByRole('button', { name: /histórico/i }));
    const dialogo = await screen.findByRole('dialog');
    expect(await within(dialogo).findByText(/Nenhuma sessão registrada/)).toBeInTheDocument();
  });

  it('busca de pacientes do novo agendamento com erro: alerta explícito no diálogo', async () => {
    mocks.pacientesList.mockRejectedValue(erroHttp(403));
    renderizar();
    await userEvent.click(await screen.findByRole('button', { name: /novo agendamento/i }));
    const dialogo = await screen.findByRole('dialog');
    const alerta = await within(dialogo).findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
  });
});
