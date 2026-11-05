import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ pacienteGet: vi.fn(), prontuariosList: vi.fn(), sugerir: vi.fn(), decidir: vi.fn() }));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', clinicaId: 'c1', papel: 'ENFERMEIRO', nome: 'Psi', coren: 'COREN 06/123' } }),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    pacientesApi: { ...original.pacientesApi, get: mocks.pacienteGet },
    prontuariosApi: { ...original.prontuariosApi, list: mocks.prontuariosList },
    iaClinicaApi: { ...original.iaClinicaApi, sugerirAbordagem: mocks.sugerir, registrarDecisao: mocks.decidir },
  };
});

import { RegistroSessao } from './AtendimentoPsicologicoPage';

const agendamento = { id: 'a1', clinicaId: 'c1', pacienteId: 'p1', pacienteNome: 'Maria', medicoId: 'u1', dataHoraInicio: '2026-10-05T14:00:00.000Z' } as never;

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RegistroSessao agendamento={agendamento} open onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

// O aviso é texto na tela, ao lado dos botões — não tooltip (title).
describe('Atendimento — aviso de que a sugestão da IA não entra no prontuário', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue({ id: 'p1', nome: 'Maria' });
    mocks.prontuariosList.mockResolvedValue([]);
    mocks.sugerir.mockResolvedValue({ sugestao: 'Tente reestruturação.', registroUsoIaId: 'r1' });
    mocks.decidir.mockResolvedValue(undefined);
  });

  it('com a sugestão na tela, o aviso está visível com os três pontos', async () => {
    renderizar();
    const user = userEvent.setup();
    expect(screen.queryByText(/não entra no prontuário/i)).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /sugerir abordagem/i }));
    await screen.findByText('Tente reestruturação.');
    const aviso = screen.getByText(/não entra no prontuário/i);
    expect(aviso).toBeVisible();
    expect(aviso.textContent).toMatch(/Usar ou Descartar/);
    expect(aviso.textContent).toMatch(/auditoria/i);
    expect(aviso.textContent).toMatch(/copie para as anotações e revise antes de assinar/i);
    expect(aviso).not.toHaveAttribute('title');
  });

  it('o aviso fica junto dos botões Usar / Descartar', async () => {
    renderizar();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /sugerir abordagem/i }));
    const usar = await screen.findByRole('button', { name: /usar esta sugestão/i });
    const bloco = usar.closest('div')!.parentElement!;
    expect(bloco.textContent).toMatch(/não entra no prontuário/i);
  });

  it('depois de usar, o aviso continua (a sugestão segue na tela)', async () => {
    renderizar();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /sugerir abordagem/i }));
    await user.click(await screen.findByRole('button', { name: /usar esta sugestão/i }));
    await vi.waitFor(() => expect(screen.getByText(/sugestão aceita/i)).toBeInTheDocument());
    expect(screen.getByText(/não entra no prontuário/i)).toBeVisible();
  });
});
