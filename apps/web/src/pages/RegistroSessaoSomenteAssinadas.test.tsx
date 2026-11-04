import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// BUG-025: "primeira consulta × seguimento" e o número de sessões anteriores vêm só de prontuários ASSINADOS.
const mocks = vi.hoisted(() => ({ pacienteGet: vi.fn(), prontuariosList: vi.fn() }));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', clinicaId: 'c1', papel: 'ENFERMEIRO', nome: 'Psi', registroProfissional: 'COREN 06/123' } }),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    pacientesApi: { ...original.pacientesApi, get: mocks.pacienteGet },
    prontuariosApi: { ...original.prontuariosApi, list: mocks.prontuariosList },
  };
});

import { RegistroSessao } from './AtendimentoPsicologicoPage';

const agendamento = { id: 'a1', clinicaId: 'c1', pacienteId: 'p1', pacienteNome: 'Maria', medicoId: 'u1', dataHoraInicio: '2026-10-05T14:00:00.000Z' } as never;

const registro = (id: string, data: string, assinado: boolean) => ({
  id, pacienteId: 'p1', tipo: 'psicoterapia', dataAtendimento: data,
  registroPsicologico: { motivoAtendimento: 'queixa', evolucao: `evolução ${id}` },
  ...(assinado ? { assinado: { medicoId: 'u1', dataAssinatura: data, hash: 'h' } } : {}),
});

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RegistroSessao agendamento={agendamento} open onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('RegistroSessao — só prontuário assinado conta como sessão anterior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue({ id: 'p1', nome: 'Maria' });
  });

  it('histórico só com RASCUNHO: continua sendo "Primeira consulta"', async () => {
    mocks.prontuariosList.mockResolvedValue([registro('r1', '2026-10-01T12:00:00Z', false)]);
    renderizar();
    expect(await screen.findByText(/Primeira consulta/)).toBeInTheDocument();
    expect(screen.queryByText(/Consulta de seguimento/)).not.toBeInTheDocument();
  });

  it('uma assinada + um rascunho: seguimento, 2ª sessão (o rascunho não entra na conta)', async () => {
    mocks.prontuariosList.mockResolvedValue([
      registro('r1', '2026-10-01T12:00:00Z', true),
      registro('r2', '2026-10-08T12:00:00Z', false),
    ]);
    renderizar();
    expect(await screen.findByText(/Consulta de seguimento — 2ª sessão/)).toBeInTheDocument();
    expect(screen.getByText(/1 sessão registrada/)).toBeInTheDocument();
  });
});
