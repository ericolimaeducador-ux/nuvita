import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  pacienteGet: vi.fn(),
  agendamentosList: vi.fn(),
  clinicaMinha: vi.fn(),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u2', clinicaId: 'c1', papel: 'SECRETARIA', nome: 'Maria Secretária' } }),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    pacientesApi: { ...original.pacientesApi, get: mocks.pacienteGet },
    agendaApi: { ...original.agendaApi, list: mocks.agendamentosList },
    clinicasApi: { ...original.clinicasApi, minha: mocks.clinicaMinha },
  };
});

import { DeclaracaoComparecimentoPage } from './DeclaracaoComparecimentoPage';

const local = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).toISOString();
const agenda = (id: string, status: string, ini: string, fim: string) => ({
  id, status, dataHoraInicio: ini, dataHoraFim: fim, clinicaId: 'c1', pacienteId: 'p1', medicoId: 'm1',
});

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/pacientes/p1/documentos/declaracao-comparecimento']}>
        <Routes>
          <Route path="/pacientes/:id/documentos/declaracao-comparecimento" element={<DeclaracaoComparecimentoPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Declaração de comparecimento (secretária)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue({ id: 'p1', nome: 'Paciente Fictício' });
    mocks.clinicaMinha.mockResolvedValue({ nome: 'Clínica Mente Sã', documento: '12345678000195', tipoDocumento: 'CNPJ' });
  });

  it('data e horário vêm da agenda: não há campo de data livre, só os atendimentos concluídos', async () => {
    mocks.agendamentosList.mockResolvedValue([
      agenda('a1', 'concluido', local(20, 14), local(20, 15)),
      agenda('a2', 'cancelado', local(21, 9), local(21, 10)),
      agenda('a3', 'falta', local(22, 9), local(22, 10)),
      agenda('a4', 'agendado', local(23, 9), local(23, 10)),
    ]);
    renderizar();
    const opcoes = await screen.findAllByRole('radio');
    expect(opcoes).toHaveLength(1);
    expect(screen.queryByLabelText(/data e hor[aá]rio/i)).not.toBeInTheDocument();
    expect(document.querySelector('input[type="datetime-local"]')).toBeNull();
  });

  it('o texto afirma PRESENÇA ("esteve nesta clínica"), com data e hora da agenda, sem falar em atendimento psicológico', async () => {
    mocks.agendamentosList.mockResolvedValue([agenda('a1', 'concluido', local(20, 14), local(20, 15))]);
    renderizar();
    await userEvent.click(await screen.findByRole('radio'));
    await userEvent.click(screen.getByRole('button', { name: /gerar declara/i }));
    const corpo = await screen.findByTestId('declaracao-corpo');
    expect(corpo).toHaveTextContent('Paciente Fictício esteve nesta clínica em 20/10/2026, das 14:00 às 15:00.');
    expect(corpo.textContent).not.toMatch(/psicol[oó]gic|atendimento|atesto|sess[aã]o|terapia/i);
  });

  it('assina pela clínica e por quem emite, sem CRP', async () => {
    mocks.agendamentosList.mockResolvedValue([agenda('a1', 'concluido', local(20, 14), local(20, 15))]);
    renderizar();
    await userEvent.click(await screen.findByRole('radio'));
    await userEvent.click(screen.getByRole('button', { name: /gerar declara/i }));
    const assinatura = await screen.findByTestId('assinatura-declaracao');
    expect(assinatura).toHaveTextContent('Clínica Mente Sã');
    expect(assinatura).toHaveTextContent('Maria Secretária');
    expect(assinatura.textContent).not.toMatch(/CRP/);
  });

  it('sem atendimento concluído na agenda: recusa emitir (sem botão de gerar)', async () => {
    mocks.agendamentosList.mockResolvedValue([agenda('a4', 'agendado', local(23, 9), local(23, 10))]);
    renderizar();
    expect(await screen.findByText(/nenhum atendimento conclu[ií]do/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gerar declara/i })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });
});
