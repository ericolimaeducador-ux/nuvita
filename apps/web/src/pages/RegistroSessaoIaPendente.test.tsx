import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ pacienteGet: vi.fn(), prontuariosList: vi.fn(), sugerir: vi.fn(), decidir: vi.fn() }));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', clinicaId: 'c1', papel: 'ENFERMEIRO', nome: 'Psi', registroProfissional: 'COREN 06/123' } }),
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
// R1: este teste cobre código herdado que está OCULTO por padrão (src/lib/recursos-legado.ts); liga as flags só aqui
// para o código dormente continuar testado até sair na etapa de conteúdo.
vi.mock('@/lib/recursos-legado', () => ({ RECURSOS_LEGADO: { escritaProntuarioAntigo: true, iaClinicaAntiga: true, edicaoModulosPorUsuario: true } }));


const agendamento = { id: 'a1', clinicaId: 'c1', pacienteId: 'p1', pacienteNome: 'Maria', medicoId: 'u1', dataHoraInicio: '2026-10-05T14:00:00.000Z' } as never;

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RegistroSessao agendamento={agendamento} open onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('Atendimento — sugestão da IA pendente de decisão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue({ id: 'p1', nome: 'Maria' });
    mocks.prontuariosList.mockResolvedValue([]);
    mocks.sugerir.mockResolvedValue({ sugestao: 'Tente reestruturação.', registroUsoIaId: 'r1' });
    mocks.decidir.mockResolvedValue(undefined);
  });

  it('sugestão pendente: "Gerar novamente" bloqueado; usar libera', async () => {
    renderizar();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /sugerir abordagem/i }));
    await screen.findByText('Tente reestruturação.');
    expect(screen.getByRole('button', { name: /gerar novamente/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /usar esta sugestão/i }));
    await vi.waitFor(() => expect(screen.getByRole('button', { name: /gerar novamente/i })).toBeEnabled());
  });

  it('descartar libera para sugerir de novo', async () => {
    renderizar();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /sugerir abordagem/i }));
    await screen.findByText('Tente reestruturação.');
    await user.click(screen.getByRole('button', { name: /descartar/i }));
    await vi.waitFor(() => expect(screen.getByRole('button', { name: /sugerir abordagem/i })).toBeEnabled());
  });
});
