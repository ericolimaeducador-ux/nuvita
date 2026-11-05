import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Tela e PDF renderizam pelo formulário GRAVADO no registro (não por dedução) e dizem qual foi.
const mocks = vi.hoisted(() => ({ pacienteGet: vi.fn(), prontuariosGet: vi.fn() }));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', clinicaId: 'c1', papel: 'ENFERMEIRO', nome: 'Psi', coren: 'COREN 11/11111' } }),
}));
// Setup: consultório com CPF/CNPJ informado (sem isso a enfermeira cai no gate do documento do consultório).
vi.mock('@/lib/useClinicaMinha', () => ({ useClinicaMinha: () => ({ isLoading: false, isError: false, data: { nome: 'Clínica', documento: '52998224725', tipoDocumento: 'CPF' } }) }));
vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    pacientesApi: { ...original.pacientesApi, get: mocks.pacienteGet },
    prontuariosApi: { ...original.prontuariosApi, get: mocks.prontuariosGet },
  };
});

import { ProntuarioImpressaoPage } from './ProntuarioImpressaoPage';

const registro = (over: Record<string, unknown>) => ({
  id: 'r1', pacienteId: 'p1', tipo: 'psicoterapia', agendamentoId: 'a1', dataAtendimento: '2026-10-25T13:00:00.000Z',
  assinado: { medicoId: 'u1', dataAssinatura: '2026-10-26T12:00:00.000Z', hash: 'h', coren: 'COREN 06/12345' }, ...over,
});

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/pacientes/p1/prontuario/r1/imprimir']}>
        <Routes><Route path="/pacientes/:id/prontuario/:prontuarioId/imprimir" element={<ProntuarioImpressaoPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const texto = () => document.body.textContent ?? '';

describe('PDF — renderiza pelo formulário gravado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue({ id: 'p1', nome: 'Carla', dataNascimento: '1992-05-10', linhaTerapeutica: 'TCC' });
  });

  it('gravado COMPLETO, só com anotações: lista os campos da avaliação como "Não preenchido" (a dedução diria seguimento)', async () => {
    mocks.prontuariosGet.mockResolvedValue(registro({ formulario: 'completo', registroPsicologico: { anotacoesLivres: 'NOTAS-OK' } }));
    renderizar();
    await screen.findByText(/NOTAS-OK/);
    expect(texto()).toMatch(/Medicamentos em uso[^:]*:\s*Não preenchido/);
    expect(texto()).toMatch(/Avaliação inicial/);
  });

  it('gravado SEGUIMENTO com um campo exclusivo da avaliação preenchido: não esconde o conteúdo e continua sendo seguimento', async () => {
    mocks.prontuariosGet.mockResolvedValue(
      registro({ formulario: 'seguimento', registroPsicologico: { anotacoesLivres: 'NOTAS-OK', motivoAtendimento: 'MOTIVO-OK' } }),
    );
    renderizar();
    await screen.findByText(/NOTAS-OK/);
    expect(texto()).toContain('MOTIVO-OK');
    expect(texto()).not.toMatch(/Medicamentos em uso[^:]*:\s*Não preenchido/);
    expect(texto()).toMatch(/Seguimento/);
  });

  it('registro antigo (sem formulario gravado): continua por inferência', async () => {
    mocks.prontuariosGet.mockResolvedValue(registro({ registroPsicologico: { anotacoesLivres: 'NOTAS-OK' } }));
    renderizar();
    await screen.findByText(/NOTAS-OK/);
    expect(texto()).not.toMatch(/Medicamentos em uso/);
  });
});
