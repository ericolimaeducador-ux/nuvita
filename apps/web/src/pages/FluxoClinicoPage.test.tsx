import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, pacientesApi: { ...original.pacientesApi, list: mocks.list } };
});

import { FluxoClinicoPage } from './FluxoClinicoPage';

const agora = new Date().toISOString();
const ha = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString();

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <FluxoClinicoPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('FluxoClinicoPage — lista do fluxo clínico de IU', () => {
  beforeEach(() => {
    mocks.list.mockReset();
    mocks.list.mockResolvedValue({
      items: [
        { id: 'p1', clinicaId: 'c', nome: 'Ana Dentro do Prazo', classificacoes: ['IU'], etapaFluxo: 'aguardando_atendimento', etapaFluxoDesde: agora },
        { id: 'p2', clinicaId: 'c', nome: 'Beto Atrasado', classificacoes: ['IU'], etapaFluxo: 'aguardando_atendimento', etapaFluxoDesde: ha(15) },
        { id: 'p3', clinicaId: 'c', nome: 'Carla Concluída', classificacoes: ['IU'], etapaFluxo: 'concluido', etapaFluxoDesde: ha(40) },
      ],
    });
  });

  it('pede à API SOMENTE pacientes elegíveis ao fluxo (fluxoClinico: true)', async () => {
    montar();
    await waitFor(() => expect(mocks.list).toHaveBeenCalled());
    expect(mocks.list.mock.calls[0][0]).toMatchObject({ fluxoClinico: true });
  });

  it('mostra nome, chip da etapa e badge de prazo (dentro do prazo, atrasado e sem prazo)', async () => {
    montar();
    expect(await screen.findByText('Ana Dentro do Prazo')).toBeInTheDocument();
    expect(screen.getAllByText('Aguardando Atendimento').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Concluído', { selector: 'span.rounded-full' })).toBeInTheDocument();
    expect(screen.getByText(/Atrasado 5d/)).toBeInTheDocument();
    expect(screen.getByText(/10d restantes|9d restantes/)).toBeInTheDocument();
  });

  it('filtro por etapa repassa etapaFluxo para a API (mantendo fluxoClinico)', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText('Ana Dentro do Prazo');

    await user.click(screen.getByRole('button', { name: 'Concluído' }));

    await waitFor(() => {
      const ultima = mocks.list.mock.calls.at(-1)![0];
      expect(ultima).toMatchObject({ etapaFluxo: 'concluido', fluxoClinico: true });
    });
  });

  it('busca por nome repassa o termo para a API', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText('Ana Dentro do Prazo');

    await user.type(screen.getByPlaceholderText('Buscar paciente...'), 'Beto');

    await waitFor(() => expect(mocks.list.mock.calls.at(-1)![0]).toMatchObject({ nome: 'Beto', fluxoClinico: true }));
  });

  it('lista vazia mostra a mensagem, e falha da API não parece "sem dados"', async () => {
    mocks.list.mockResolvedValueOnce({ items: [] });
    const primeira = montar();
    expect(await screen.findByText('Nenhum paciente encontrado')).toBeInTheDocument();
    primeira.unmount();

    mocks.list.mockRejectedValueOnce(new Error('falhou'));
    montar();
    expect(await screen.findByTestId('erro-consulta')).toBeInTheDocument();
  });
});
