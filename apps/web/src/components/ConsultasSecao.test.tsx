import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ listByPaciente: vi.fn(), create: vi.fn() }));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, consultasApi: { ...original.consultasApi, listByPaciente: mocks.listByPaciente, create: mocks.create } };
});

import { ConsultasSecao } from './ConsultasSecao';

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ConsultasSecao pacienteId="p1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ConsultasSecao', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
  });

  it('lista as consultas em ordem cronológica com status e situação da cobrança (somente leitura, link para abrir)', async () => {
    mocks.listByPaciente.mockResolvedValue([
      { id: 'c1', status: 'ASSINADA', criadoEm: '2026-10-01T10:00:00.000Z', assinatura: { dataAssinatura: '2026-10-01T11:00:00.000Z' }, cobranca: { status: 'INCLUIDA_EM_PACOTE', incluidaEmPacote: true } },
      { id: 'c2', status: 'RASCUNHO', criadoEm: '2026-11-01T10:00:00.000Z' },
    ]);
    montar();
    expect(await screen.findByText('Assinada')).toBeInTheDocument();
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
    expect(screen.getByText('Incluída em pacote')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Abrir' });
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/pacientes/p1/consultas/c1', '/pacientes/p1/consultas/c2']);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('sem consultas mostra a mensagem; falha ao carregar não parece lista vazia', async () => {
    mocks.listByPaciente.mockResolvedValueOnce([]);
    const { unmount } = montar();
    expect(await screen.findByText('Nenhuma consulta registrada.')).toBeInTheDocument();
    unmount();
    mocks.listByPaciente.mockRejectedValue(new Error('falhou'));
    montar();
    expect(await screen.findByTestId('erro-consulta')).toBeInTheDocument();
  });
});
