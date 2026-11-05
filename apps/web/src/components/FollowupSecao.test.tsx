import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ listByPaciente: vi.fn(), create: vi.fn(), excluir: vi.fn() }));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, followupApi: { ...mocks } };
});

import { FollowupSecao } from './FollowupSecao';

const registro = {
  id: 'f1', clinicaId: 'c1', pacienteId: 'p1', enfermeiroId: 'e1', dataFollowup: '2026-02-10T00:00:00.000Z',
  statusElegibilidade: 'elegivel', observacoes: 'Paciente apto', proximoFollowup: '2026-03-10T00:00:00.000Z',
};

function montar(podeDecidir: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FollowupSecao pacienteId="p1" podeDecidir={podeDecidir} />
    </QueryClientProvider>,
  );
}

describe('FollowupSecao', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.listByPaciente.mockResolvedValue([registro]);
  });

  it('lista os follow-ups com a situação', async () => {
    montar(true);
    expect(await screen.findByText('Paciente apto')).toBeInTheDocument();
    expect(screen.getByText('Elegível')).toBeInTheDocument();
  });

  it('quem NÃO decide elegibilidade (secretária) vê a lista, mas não o botão de registrar', async () => {
    montar(false);
    await screen.findByText('Paciente apto');
    expect(screen.queryByRole('button', { name: /Registrar follow-up/ })).not.toBeInTheDocument();
  });

  it('quem decide registra o follow-up (a decisão sobre a etapa é do servidor)', async () => {
    const user = userEvent.setup();
    mocks.create.mockResolvedValue(registro);
    montar(true);
    await screen.findByText('Paciente apto');

    await user.click(screen.getByRole('button', { name: /Registrar follow-up/ }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('combobox', { name: 'Situação' }));
    await user.click(await screen.findByRole('option', { name: 'Elegível' }));
    await user.type(within(dialogo).getByLabelText('Observações *'), 'Apto ao fluxo');
    await user.click(within(dialogo).getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      pacienteId: 'p1', statusElegibilidade: 'elegivel', observacoes: 'Apto ao fluxo',
    });
  });

  it('falha ao carregar não parece "sem follow-ups"', async () => {
    mocks.listByPaciente.mockRejectedValue(new Error('falhou'));
    montar(true);
    expect(await screen.findByTestId('erro-consulta')).toBeInTheDocument();
  });
});
