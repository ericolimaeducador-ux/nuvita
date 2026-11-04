import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// O servidor recusa registrar atendimento que ainda não começou; a lista de "registráveis" não o oferece.
const mocks = vi.hoisted(() => ({ agendaList: vi.fn(), painel: vi.fn(), prontuariosList: vi.fn(), pacientesList: vi.fn() }));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', clinicaId: 'c1', papel: 'ENFERMEIRO', nome: 'Psi Teste' } }),
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

const emMin = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
const ag = (id: string, nome: string, inicioEmMin: number) => ({
  id, clinicaId: 'c1', pacienteId: `p-${id}`, pacienteNome: nome, medicoId: 'u1', tipo: 'sessao_psicoterapia', status: 'agendado',
  dataHoraInicio: emMin(inicioEmMin), dataHoraFim: emMin(inicioEmMin + 50),
});

describe('Atendimento Psicológico — atendimentos futuros não são registráveis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.painel.mockResolvedValue({ pacientes: [] });
    mocks.prontuariosList.mockResolvedValue([]);
    mocks.pacientesList.mockResolvedValue([]);
    mocks.agendaList.mockResolvedValue([ag('1', 'Paciente Que Começou', -10), ag('2', 'Paciente Futuro', 120)]);
  });

  it('lista só o que já começou', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter><AtendimentoPsicologicoPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Paciente Que Começou')).toBeInTheDocument();
    expect(screen.queryByText('Paciente Futuro')).not.toBeInTheDocument();
  });
});
