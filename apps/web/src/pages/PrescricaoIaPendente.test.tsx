import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ pacienteGet: vi.fn(), gerar: vi.fn(), decidir: vi.fn() }));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    pacientesApi: { ...original.pacientesApi, get: mocks.pacienteGet },
    iaClinicaApi: { ...original.iaClinicaApi, gerarPrescricao: mocks.gerar, registrarDecisao: mocks.decidir },
  };
});

import { PrescricaoCuidadosPage } from './PrescricaoCuidadosPage';

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/pacientes/p1/prescricao']}>
        <Routes><Route path="/pacientes/:id/prescricao" element={<PrescricaoCuidadosPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const botaoGerarIa = () => screen.getByRole('button', { name: /gerar com ia/i });
const botaoImprimir = () => screen.getByRole('button', { name: /gerar prescrição/i });

describe('Prescrição — sugestão da IA pendente de decisão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue({ id: 'p1', nome: 'Maria Demonstração' });
    mocks.gerar.mockResolvedValue({ prescricao: 'Respire fundo.', registroUsoIaId: 'r1' });
    mocks.decidir.mockResolvedValue(undefined);
  });

  async function comSugestaoPendente() {
    renderizar();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/orientações adicionais/i), 'texto livre');
    await user.click(botaoGerarIa());
    await screen.findByText('Respire fundo.');
    return user;
  }

  it('sem sugestão: gerar e imprimir liberados', async () => {
    renderizar();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/orientações adicionais/i), 'texto livre');
    expect(botaoGerarIa()).toBeEnabled();
    expect(botaoImprimir()).toBeEnabled();
  });

  it('sugestão pendente: "Gerar com IA" e imprimir ficam bloqueados', async () => {
    await comSugestaoPendente();
    expect(botaoGerarIa()).toBeDisabled();
    expect(botaoImprimir()).toBeDisabled();
  });

  it('descartar libera de novo', async () => {
    const user = await comSugestaoPendente();
    await user.click(screen.getByRole('button', { name: /descartar/i }));
    expect(mocks.decidir).toHaveBeenCalledWith('r1', 'DESCARTADA');
    await vi.waitFor(() => expect(botaoGerarIa()).toBeEnabled());
    expect(botaoImprimir()).toBeEnabled();
  });

  it('usar a sugestão também libera', async () => {
    const user = await comSugestaoPendente();
    await user.click(screen.getByRole('button', { name: /usar esta sugestão/i }));
    await vi.waitFor(() => expect(botaoGerarIa()).toBeEnabled());
    expect(botaoImprimir()).toBeEnabled();
  });
});
