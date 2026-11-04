import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// PR 1: a assinatura do PDF mostra o COREN CARIMBADO no registro (não o de quem está logado); um conjunto único de rótulos
// (o do formulário); a ordem do formulário; "Não preenchido" nos campos vazios do formulário usado.
const mocks = vi.hoisted(() => ({ pacienteGet: vi.fn(), prontuariosGet: vi.fn() }));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', clinicaId: 'c1', papel: 'ENFERMEIRO', nome: 'Psi Logada', coren: 'COREN 11/11111' } }),
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

const paciente = { id: 'p1', nome: 'Carla Fictícia', cpf: '12345678909', dataNascimento: '1992-05-10', linhaTerapeutica: 'TCC' };
const registro = (over: Record<string, unknown> = {}) => ({
  id: 'r1', pacienteId: 'p1', tipo: 'psicoterapia', agendamentoId: 'a1', dataAtendimento: '2026-10-25T13:00:00.000Z',
  registroPsicologico: { anotacoesLivres: 'NOTAS-OK', tccPensamentosAutomaticos: 'RPD-OK' },
  assinado: { medicoId: 'u1', dataAssinatura: '2026-10-26T12:00:00.000Z', hash: 'h', coren: 'COREN 06/12345' },
  ...over,
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

describe('Impressão do prontuário — COREN, rótulos, ordem e "Não preenchido"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue(paciente);
  });

  it('a assinatura mostra o COREN CARIMBADO no registro, não o de quem está logado', async () => {
    mocks.prontuariosGet.mockResolvedValue(registro());
    renderizar();
    await screen.findByText(/NOTAS-OK/);
    expect(texto()).toContain('COREN 06/12345');
    expect(texto()).not.toContain('COREN 11/11111');
  });

  it('registro antigo (sem COREN carimbado): mantém o comportamento de hoje (COREN de quem está logado)', async () => {
    mocks.prontuariosGet.mockResolvedValue(registro({ assinado: { medicoId: 'u1', dataAssinatura: '2026-10-26T12:00:00.000Z', hash: 'h' } }));
    renderizar();
    await screen.findByText(/NOTAS-OK/);
    expect(texto()).toContain('COREN 11/11111');
  });

  it('usa os rótulos do FORMULÁRIO (um conjunto só), não os antigos do PDF', async () => {
    mocks.prontuariosGet.mockResolvedValue(registro());
    renderizar();
    await screen.findByText(/NOTAS-OK/);
    expect(texto()).toContain('Registro de Pensamentos Disfuncionais (RPD):');
    expect(texto()).not.toContain('Pensamentos automáticos identificados');
    expect(texto()).toContain('Técnica aplicada na sessão e evolução:');
    expect(texto()).not.toContain('Registro de comportamento-alvo / frequência');
  });

  it('segue a ORDEM do formulário e marca "Não preenchido" nos campos vazios do formulário usado', async () => {
    mocks.prontuariosGet.mockResolvedValue(registro());
    renderizar();
    await screen.findByText(/NOTAS-OK/);
    const t = texto();
    const ordem = ['Registro de Pensamentos Disfuncionais (RPD):', 'Distorções cognitivas identificadas:', 'Tarefa de casa prescrita:', 'Técnica aplicada na sessão e evolução:', 'Anotações da psicoterapia:']
      .map((r) => t.indexOf(r));
    expect(ordem.every((i) => i >= 0)).toBe(true);
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem);
    expect(t).toMatch(/Tarefa de casa prescrita:\s*Não preenchido/);
    expect(t).toMatch(/Distorções cognitivas identificadas:\s*Não preenchido/);
    expect(t).not.toMatch(/Registro de Pensamentos Disfuncionais \(RPD\):\s*Não preenchido/); // este foi preenchido
  });

  it('o formulário de seguimento não lista campos que só existem na avaliação inicial', async () => {
    mocks.prontuariosGet.mockResolvedValue(registro());
    renderizar();
    await screen.findByText(/NOTAS-OK/);
    expect(texto()).not.toMatch(/Qualidade do sono|Medicamentos em uso|Histórico familiar/);
  });

  it('avaliação inicial (tem campo exclusivo dela): lista os campos da avaliação, vazios como "Não preenchido"', async () => {
    mocks.prontuariosGet.mockResolvedValue(registro({ registroPsicologico: { motivoAtendimento: 'MOTIVO-OK', anotacoesLivres: 'NOTAS-OK' } }));
    renderizar();
    await screen.findByText(/MOTIVO-OK/);
    expect(texto()).toMatch(/Medicamentos em uso[^:]*:\s*Não preenchido/);
  });
});
