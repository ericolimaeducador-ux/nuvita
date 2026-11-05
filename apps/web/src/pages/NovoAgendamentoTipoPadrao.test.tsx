import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// O padrão do "Novo agendamento" é CALCULADO: paciente sem sessão assinada → avaliação; com → sessão de psicoterapia.
const mocks = vi.hoisted(() => ({
  agendaList: vi.fn(), painel: vi.fn(), pacientesList: vi.fn(), prontuariosList: vi.fn(),
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
    pacientesApi: { ...original.pacientesApi, list: mocks.pacientesList },
    prontuariosApi: { ...original.prontuariosApi, list: mocks.prontuariosList },
  };
});

import { AtendimentoPsicologicoPage } from './AtendimentoPsicologicoPage';

const assinada = {
  id: 'r0', pacienteId: 'p1', tipo: 'psicoterapia', dataAtendimento: '2026-10-01T12:00:00Z',
  assinado: { medicoId: 'u1', dataAssinatura: '2026-10-01T12:00:00Z', hash: 'h' },
};
const rascunho = { id: 'r1', pacienteId: 'p1', tipo: 'psicoterapia', dataAtendimento: '2026-10-01T12:00:00Z' };

async function abrirEEscolherPaciente(historico: unknown[]) {
  mocks.prontuariosList.mockResolvedValue(historico);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><AtendimentoPsicologicoPage /></MemoryRouter>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: /novo agendamento/i }));
  const dialogo = await screen.findByRole('dialog');
  const [seletorPaciente] = within(dialogo).getAllByRole('combobox');
  await user.click(seletorPaciente);
  await user.click(await screen.findByRole('option', { name: /Maria Demonstração/i }));
  return dialogo;
}

describe('Novo agendamento psicológico — tipo padrão calculado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.agendaList.mockResolvedValue([]);
    mocks.painel.mockResolvedValue({ sessoesPorCiclo: 4, recebidoNoMes: 0, aReceber: 0, ciclosACobrar: 0, pacientes: [] });
    mocks.pacientesList.mockResolvedValue({ items: [{ id: 'p1', nome: 'Maria Demonstração' }], total: 1 });
  });

  it('paciente SEM sessão assinada: Avaliação Psicológica', async () => {
    const dialogo = await abrirEEscolherPaciente([]);
    expect(await within(dialogo).findByText('Avaliação Psicológica')).toBeInTheDocument();
  });

  it('paciente COM sessão assinada: Sessão de Psicoterapia', async () => {
    const dialogo = await abrirEEscolherPaciente([assinada]);
    expect(await within(dialogo).findByText('Sessão de Psicoterapia')).toBeInTheDocument();
  });

  it('paciente só com RASCUNHO conta como sem sessão assinada: Avaliação Psicológica', async () => {
    const dialogo = await abrirEEscolherPaciente([rascunho]);
    expect(await within(dialogo).findByText('Avaliação Psicológica')).toBeInTheDocument();
  });
});
