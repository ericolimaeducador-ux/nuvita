import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  pacienteGet: vi.fn(),
  agendamentosList: vi.fn(),
  clinicaMinha: vi.fn(),
  emitir: vi.fn(),
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
    documentosEmitidosApi: { declaracaoComparecimento: mocks.emitir, atestadoComparecimento: vi.fn() },
  };
});

import { DeclaracaoComparecimentoPage } from './DeclaracaoComparecimentoPage';

const RESPOSTA_SERVIDOR = {
  id: 'doc-1', protocolo: 'NV-ABC12345', tipo: 'DECLARACAO_COMPARECIMENTO', titulo: 'Declaração de Comparecimento',
  corpo: 'Declaro, para os devidos fins, que Paciente Fictício esteve nesta clínica em 20/10/2026, das 14:00 às 15:00.',
  atendimento: { data: '20/10/2026', horaInicio: '14:00', horaFim: '15:00' },
  emissor: { nome: 'Maria Secretária' }, clinica: { nome: 'Clínica Mente Sã' }, emitidoEm: '2026-10-23T12:00:00.000Z',
};

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
    // O servidor é a fonte do conteúdo: a tela só renderiza o que ele devolve.
    mocks.emitir.mockResolvedValue(RESPOSTA_SERVIDOR);
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
    // Pede ao servidor só com ids (sem data/hora digitável) e mostra exatamente o texto que ele devolveu.
    expect(mocks.emitir).toHaveBeenCalledWith({ pacienteId: 'p1', agendamentoId: 'a1' });
    expect(corpo).toHaveTextContent('Paciente Fictício esteve nesta clínica em 20/10/2026, das 14:00 às 15:00.');
    expect(corpo.textContent).not.toMatch(/psicol[oó]gic|atendimento|atesto|sess[aã]o|terapia/i);
    expect(screen.getByText(/NV-ABC12345/)).toBeInTheDocument();
  });

  it('a tela NÃO monta o texto: o que o servidor devolve é o que aparece', async () => {
    mocks.agendamentosList.mockResolvedValue([agenda('a1', 'concluido', local(20, 14), local(20, 15))]);
    mocks.emitir.mockResolvedValue({ ...RESPOSTA_SERVIDOR, corpo: 'TEXTO MONTADO PELO SERVIDOR' });
    renderizar();
    await userEvent.click(await screen.findByRole('radio'));
    await userEvent.click(screen.getByRole('button', { name: /gerar declara/i }));
    expect(await screen.findByTestId('declaracao-corpo')).toHaveTextContent('TEXTO MONTADO PELO SERVIDOR');
  });

  it('recusa do servidor (ex.: 422 atendimento não concluído) aparece como erro e NÃO gera documento', async () => {
    mocks.agendamentosList.mockResolvedValue([agenda('a1', 'concluido', local(20, 14), local(20, 15))]);
    mocks.emitir.mockRejectedValue({ isAxiosError: true, response: { status: 422, data: { message: 'Só é possível emitir para atendimento concluído na agenda.' } } });
    renderizar();
    await userEvent.click(await screen.findByRole('radio'));
    await userEvent.click(screen.getByRole('button', { name: /gerar declara/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/atendimento conclu[ií]do na agenda/i);
    expect(screen.queryByTestId('declaracao-corpo')).not.toBeInTheDocument();
  });

  it('assina pela clínica e por quem emite, sem COREN', async () => {
    mocks.agendamentosList.mockResolvedValue([agenda('a1', 'concluido', local(20, 14), local(20, 15))]);
    renderizar();
    await userEvent.click(await screen.findByRole('radio'));
    await userEvent.click(screen.getByRole('button', { name: /gerar declara/i }));
    const assinatura = await screen.findByTestId('assinatura-declaracao');
    expect(assinatura).toHaveTextContent('Clínica Mente Sã');
    expect(assinatura).toHaveTextContent('Maria Secretária');
    expect(assinatura.textContent).not.toMatch(/COREN/);
  });

  it('sem atendimento concluído na agenda: recusa emitir (sem botão de gerar)', async () => {
    mocks.agendamentosList.mockResolvedValue([agenda('a4', 'agendado', local(23, 9), local(23, 10))]);
    renderizar();
    expect(await screen.findByText(/nenhum atendimento conclu[ií]do/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gerar declara/i })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });
});
