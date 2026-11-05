import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Agenda: subtítulo de psicologia (não "médica, enfermagem e jurídica"). Atend. Psicológico: o estado vazio explica
// quantos agendamentos ainda não começaram e que aparecem a partir do horário de início.
const mocks = vi.hoisted(() => ({ agendaList: vi.fn(), painel: vi.fn(), prontuariosList: vi.fn(), pacientesList: vi.fn() }));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', clinicaId: 'c1', papel: 'ENFERMEIRO', nome: 'Psi Teste' }, permissoes: [] }),
}));
vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    agendaApi: { ...original.agendaApi, list: mocks.agendaList },
    psicoFinanceiroApi: { ...original.psicoFinanceiroApi, painel: mocks.painel },
    prontuariosApi: { ...original.prontuariosApi, list: mocks.prontuariosList },
    pacientesApi: { ...original.pacientesApi, list: mocks.pacientesList, listarRepresentantes: vi.fn().mockResolvedValue([]) },
  };
});

import { AgendaPage } from './AgendaPage';
import { AtendimentoPsicologicoPage } from './AtendimentoPsicologicoPage';

const emMin = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
const ag = (id: string, inicioEmMin: number, status = 'agendado') => ({
  id, clinicaId: 'c1', pacienteId: `p-${id}`, pacienteNome: `Paciente ${id}`, medicoId: 'u1', tipo: 'sessao_psicoterapia', status,
  dataHoraInicio: emMin(inicioEmMin), dataHoraFim: emMin(inicioEmMin + 50),
});
function renderizar(el: React.ReactElement) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{el}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Agenda — subtítulo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.agendaList.mockResolvedValue([]);
    mocks.pacientesList.mockResolvedValue([]);
  });
  it('fala de atendimento psicológico, não de médica/enfermagem/jurídica', async () => {
    renderizar(<AgendaPage />);
    expect(await screen.findByText('Agendamentos de atendimento psicológico')).toBeInTheDocument();
    expect(screen.queryByText(/enfermagem|jurídica|três modalidades/i)).not.toBeInTheDocument();
  });
});

describe('Atendimento Psicológico — estado vazio com agendamentos futuros', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.painel.mockResolvedValue({ pacientes: [] });
    mocks.prontuariosList.mockResolvedValue([]);
    mocks.pacientesList.mockResolvedValue([]);
  });

  it('só futuros (2): diz quantos ainda não começaram, que aparecem no horário de início, e linka a Agenda', async () => {
    mocks.agendaList.mockResolvedValue([ag('1', 60), ag('2', 180)]);
    renderizar(<AtendimentoPsicologicoPage />);
    const msg = await screen.findByText(/2 agendamentos ainda não começaram/i);
    expect(msg.textContent).toMatch(/aparecem aqui a partir do horário de início/i);
    expect(screen.getByRole('link', { name: /agenda/i })).toHaveAttribute('href', '/agenda');
  });

  it('um só futuro: singular', async () => {
    mocks.agendaList.mockResolvedValue([ag('1', 60)]);
    renderizar(<AtendimentoPsicologicoPage />);
    expect(await screen.findByText(/1 agendamento ainda não começou/i)).toBeInTheDocument();
  });

  it('cancelado futuro não conta; sem nenhum futuro ativo, mantém a mensagem de sempre', async () => {
    mocks.agendaList.mockResolvedValue([ag('1', 60, 'cancelado')]);
    renderizar(<AtendimentoPsicologicoPage />);
    expect(await screen.findByText(/Nenhum paciente agendado para o enfermeiro neste filtro/i)).toBeInTheDocument();
    expect(screen.queryByText(/ainda não começ/i)).not.toBeInTheDocument();
  });
});

describe('Atendimento Psicológico — CPF com a mesma máscara da Agenda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.painel.mockResolvedValue({ pacientes: [] });
    mocks.prontuariosList.mockResolvedValue([]);
    mocks.pacientesList.mockResolvedValue([]);
  });
  it('a lista mostra 111.111.111-11, não 11111111111', async () => {
    mocks.agendaList.mockResolvedValue([{ ...ag('1', -10), pacienteCpf: '11111111111' }]);
    renderizar(<AtendimentoPsicologicoPage />);
    expect(await screen.findByText(/CPF 111\.111\.111-11/)).toBeInTheDocument();
    expect(screen.queryByText(/CPF 11111111111/)).not.toBeInTheDocument();
  });
});
