import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { ReactElement } from 'react';

const mocks = vi.hoisted(() => ({
  agendaList: vi.fn(),
  pacientesList: vi.fn(),
  listar: vi.fn(),
  eventos: vi.fn(),
  findByAgendamento: vi.fn(),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', clinicaId: 'c1', papel: 'PSICOLOGO', nome: 'Psi Teste' }, permissoes: [] }),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    agendaApi: { ...original.agendaApi, list: mocks.agendaList },
    pacientesApi: { ...original.pacientesApi, list: mocks.pacientesList },
    telemedicinaApi: {
      ...original.telemedicinaApi,
      listar: mocks.listar,
      eventos: mocks.eventos,
      findByAgendamento: mocks.findByAgendamento,
    },
  };
});

import { TelemedicinaPage, SalaCard } from './TelemedicinaPage';

function erroHttp(status: number) {
  return new AxiosError('falha interna', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: {},
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

const sala = {
  id: 's1',
  clinicaId: 'c1',
  agendamentoId: 'a1',
  medicoId: 'u1',
  modalidade: 'psicologia',
  pacienteId: 'p1',
  status: 'encerrada',
  tokenMedico: 'tm',
  tokenPaciente: 'tp',
  expiresAt: '2026-10-06T14:00:00.000Z',
  criadoEm: '2026-10-05T14:00:00.000Z',
} as never;

describe('Telemedicina — falha explícita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.agendaList.mockResolvedValue([]);
    mocks.pacientesList.mockResolvedValue({ items: [], hasMore: false });
    mocks.listar.mockResolvedValue([]);
    mocks.eventos.mockResolvedValue([]);
  });

  it('histórico vazio legítimo: "Nenhum atendimento registrado no período."', async () => {
    renderizar(<TelemedicinaPage />);
    expect(await screen.findByText('Nenhum atendimento registrado no período.')).toBeInTheDocument();
  });

  it('403 no histórico: alerta, NUNCA "Nenhum atendimento registrado"', async () => {
    mocks.listar.mockRejectedValue(erroHttp(403));
    renderizar(<TelemedicinaPage />);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(screen.queryByText('Nenhum atendimento registrado no período.')).not.toBeInTheDocument();
  });

  it('500 no histórico: "Tentar novamente" refaz a consulta', async () => {
    mocks.listar.mockRejectedValueOnce(erroHttp(500)).mockResolvedValue([]);
    renderizar(<TelemedicinaPage />);
    const alerta = await screen.findByRole('alert');
    await userEvent.click(within(alerta).getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText('Nenhum atendimento registrado no período.')).toBeInTheDocument();
  });

  it('erro na busca de pacientes avisa que os nomes estão indisponíveis', async () => {
    mocks.pacientesList.mockRejectedValue(erroHttp(500));
    renderizar(<TelemedicinaPage />);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/nomes dos pacientes/i);
  });

  it('erro na lista de agendamentos: alerta no diálogo "Nova sala"', async () => {
    mocks.agendaList.mockRejectedValue(erroHttp(403));
    renderizar(<TelemedicinaPage />);
    await userEvent.click(await screen.findByRole('button', { name: /nova sala/i }));
    const dialogo = await screen.findByRole('dialog');
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Seu perfil não tem acesso a esta informação');
  });
});

describe('Telemedicina — busca de sala por agendamento', () => {
  const agendamento = {
    id: 'a1',
    pacienteId: 'p1',
    pacienteNome: 'Maria Demonstração',
    tipo: 'sessao_psicoterapia',
    status: 'agendado',
    modalidade: 'psicologia',
    dataHoraInicio: '2026-10-05T14:00:00.000Z',
    dataHoraFim: '2026-10-05T14:50:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.agendaList.mockResolvedValue([agendamento]);
    mocks.pacientesList.mockResolvedValue({ items: [], hasMore: false });
    mocks.listar.mockResolvedValue([]);
  });

  async function buscar() {
    renderizar(<TelemedicinaPage />);
    await userEvent.click(await screen.findByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: /Maria Demonstração/ }));
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }));
  }

  it('404: só aqui aparece "Nenhuma sala encontrada para este agendamento"', async () => {
    mocks.findByAgendamento.mockRejectedValue(erroHttp(404));
    await buscar();
    expect(await screen.findByText(/Nenhuma sala encontrada para este agendamento/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('403: alerta de perfil sem acesso, NUNCA "Nenhuma sala encontrada"', async () => {
    mocks.findByAgendamento.mockRejectedValue(erroHttp(403));
    await buscar();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(screen.queryByText(/Nenhuma sala encontrada/)).not.toBeInTheDocument();
  });

  it('500: alerta com nova tentativa, NUNCA "Nenhuma sala encontrada"', async () => {
    mocks.findByAgendamento.mockRejectedValue(erroHttp(500));
    await buscar();
    const alerta = await screen.findByRole('alert');
    expect(within(alerta).getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    expect(screen.queryByText(/Nenhuma sala encontrada/)).not.toBeInTheDocument();
  });
});

describe('SalaCard — registro do atendimento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventos.mockResolvedValue([]);
  });

  const card = () => <SalaCard sala={sala} onEncerrar={vi.fn()} loading={false} />;

  it('sem eventos (legítimo): mensagem de que o registro começa quando alguém entra', async () => {
    renderizar(card());
    expect(await screen.findByText(/Nenhum evento registrado ainda/)).toBeInTheDocument();
  });

  it('403 nos eventos: alerta, NUNCA "Nenhum evento registrado ainda"', async () => {
    mocks.eventos.mockRejectedValue(erroHttp(403));
    renderizar(card());
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(screen.queryByText(/Nenhum evento registrado ainda/)).not.toBeInTheDocument();
  });

  it('500 nos eventos: alerta com nova tentativa que refaz a consulta', async () => {
    mocks.eventos.mockRejectedValueOnce(erroHttp(500)).mockResolvedValue([]);
    renderizar(card());
    const alerta = await screen.findByRole('alert');
    await userEvent.click(within(alerta).getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText(/Nenhum evento registrado ainda/)).toBeInTheDocument();
  });
});
