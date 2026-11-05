import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ listarPendentes: vi.fn(), exportar: vi.fn(), atualizar: vi.fn() }));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, captacaoApi: { listarPendentes: mocks.listarPendentes, exportar: mocks.exportar, atualizar: mocks.atualizar } };
});

import { AbaCaptacaoPacientes } from './AbaCaptacaoPacientes';

const lead = {
  id: 'l1', nome: 'Maria Lead', cpf: '52998224725', telefone: '11999990000', codigoEnfermeiro: 'ENF-00326',
  status: 'pendente', criadoEm: '2026-10-19T12:00:00.000Z',
};

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AbaCaptacaoPacientes />
    </QueryClientProvider>,
  );
}

describe('AbaCaptacaoPacientes', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.listarPendentes.mockResolvedValue({ success: true, data: [lead] });
  });

  it('lista os leads pendentes', async () => {
    montar();
    expect(await screen.findByText('Maria Lead')).toBeInTheDocument();
    expect(screen.getByText('ENF-00326')).toBeInTheDocument();
  });

  it('exportar pede confirmação (explica que entra como IU) e chama a API com o id', async () => {
    const user = userEvent.setup();
    mocks.exportar.mockResolvedValue({ success: true, message: 'ok', pacienteId: 'p1' });
    montar();
    await screen.findByText('Maria Lead');

    await user.click(screen.getByRole('button', { name: 'Exportar' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/classificado como IU/)).toBeInTheDocument();
    expect(mocks.exportar).not.toHaveBeenCalled();
    await user.click(within(dialogo).getByRole('button', { name: 'Exportar' }));

    await waitFor(() => expect(mocks.exportar).toHaveBeenCalledWith('l1'));
  });

  it('completar: preenche a data de nascimento e salva SEM exportar', async () => {
    const user = userEvent.setup();
    mocks.atualizar.mockResolvedValue({ success: true, data: lead });
    montar();
    await screen.findByText('Maria Lead');

    await user.click(screen.getByRole('button', { name: /Completar Maria Lead/ }));
    const dialogo = await screen.findByRole('dialog');
    await user.type(within(dialogo).getByLabelText('Data de nascimento'), '1985-02-20');
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mocks.atualizar).toHaveBeenCalled());
    const [id, payload] = mocks.atualizar.mock.calls[0];
    expect(id).toBe('l1');
    expect(payload).toMatchObject({ dataNascimento: '1985-02-20', nome: 'Maria Lead' });
    expect(payload).not.toHaveProperty('responsavelLegal'); // adulto: sem bloco de responsável
    expect(mocks.exportar).not.toHaveBeenCalled();
  });

  it('completar paciente menor de idade mostra o responsável legal e envia a autorização', async () => {
    const user = userEvent.setup();
    mocks.atualizar.mockResolvedValue({ success: true, data: lead });
    montar();
    await screen.findByText('Maria Lead');

    await user.click(screen.getByRole('button', { name: /Completar Maria Lead/ }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).queryByLabelText('Nome do responsável')).not.toBeInTheDocument();
    const ano = new Date().getFullYear() - 8;
    await user.type(within(dialogo).getByLabelText('Data de nascimento'), `${ano}-01-01`);
    await user.type(await within(dialogo).findByLabelText('Nome do responsável'), 'Mae Silva');
    await user.click(within(dialogo).getByLabelText('Autorização do responsável legal confirmada'));
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mocks.atualizar).toHaveBeenCalled());
    expect(mocks.atualizar.mock.calls[0][1]).toMatchObject({
      responsavelLegal: { nome: 'Mae Silva' },
      autorizacaoResponsavel: { confirmado: true },
    });
  });

  it('fila vazia mostra a orientação', async () => {
    mocks.listarPendentes.mockResolvedValue({ success: true, data: [] });
    montar();
    expect(await screen.findByText(/Nenhuma captação pendente/)).toBeInTheDocument();
  });
});
