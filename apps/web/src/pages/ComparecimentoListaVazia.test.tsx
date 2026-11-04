import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Lista vazia de Declaração/Atestado: manda registrar a sessão em Atendimento Psicológico (o caminho que a psicóloga conhece).
const mocks = vi.hoisted(() => ({ pacienteGet: vi.fn(), agendamentosList: vi.fn(), clinicaMinha: vi.fn() }));
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

describe('Declaração de comparecimento — lista vazia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue({ id: 'p1', nome: 'Paciente Fictício' });
    mocks.clinicaMinha.mockResolvedValue({ nome: 'Clínica', documento: '12345678000195', tipoDocumento: 'CNPJ' });
    mocks.agendamentosList.mockResolvedValue([]);
  });
  it('manda registrar a sessão em Atendimento Psicológico, não "concluir na agenda"', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/pacientes/p1/documentos/declaracao-comparecimento']}>
          <Routes><Route path="/pacientes/:id/documentos/declaracao-comparecimento" element={<DeclaracaoComparecimentoPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const msg = await screen.findByText(/nenhum atendimento conclu[ií]do/i);
    expect(msg.textContent).toMatch(/Registre a sessão em Atendimento Psicológico para que o atendimento fique concluído/);
    expect(msg.textContent).not.toMatch(/conclua o atendimento na agenda/i);
  });
});
