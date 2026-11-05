import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  listByPaciente: vi.fn(), create: vi.fn(), update: vi.fn(),
  enviarAviso: vi.fn(), marcarPaga: vi.fn(), cancelar: vi.fn(),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, cobrancasApi: { ...original.cobrancasApi, ...mocks } };
});

import { CobrancasSecao } from './CobrancasSecao';

const aberta = {
  id: 'c1', clinicaId: 'cl1', pacienteId: 'p1', tipo: 'pacote_mensal', descricao: 'Pacote de curativos', valorCentavos: 35000,
  itens: [], vencimento: '2099-02-10T00:00:00.000Z', status: 'pendente',
};
const paga = { ...aberta, id: 'c2', descricao: 'Consulta antiga', status: 'paga', valorCentavos: 22000 };
const vencida = { ...aberta, id: 'c3', descricao: 'Cobrança atrasada', status: 'vencida', vencimento: '2000-01-05T00:00:00.000Z' };

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CobrancasSecao pacienteId="p1" />
    </QueryClientProvider>,
  );
}

describe('CobrancasSecao', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.listByPaciente.mockResolvedValue([aberta, paga, vencida]);
  });

  it('lista as cobranças com status e vencimento de calendário (sem escorregar de dia pelo fuso)', async () => {
    montar();
    expect(await screen.findByText('Pacote de curativos')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Paga')).toBeInTheDocument();
    expect(screen.getByText('Vencida')).toBeInTheDocument();
    expect(screen.getAllByText('10/02/2099')).toHaveLength(2); // aberta e paga (mesma data de calendário)
    expect(screen.getByText('05/01/2000')).toBeInTheDocument();
  });

  it('cobrança paga não oferece ações; as em aberto sim', async () => {
    montar();
    await screen.findByText('Pacote de curativos');
    expect(screen.getByRole('button', { name: 'Marcar paga Pacote de curativos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Marcar paga Consulta antiga/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancelar cobrança Consulta antiga/ })).not.toBeInTheDocument();
  });

  it('nova cobrança: envia o valor em CENTAVOS (R$ 350,50 -> 35050)', async () => {
    const user = userEvent.setup();
    mocks.create.mockResolvedValue(aberta);
    montar();
    await screen.findByText('Pacote de curativos');

    await user.click(screen.getByRole('button', { name: /Nova cobrança/ }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('combobox', { name: 'Tipo' }));
    await user.click(await screen.findByRole('option', { name: 'Pacote mensal' }));
    await user.type(within(dialogo).getByLabelText('Valor (R$) *'), '350,50');
    await user.type(within(dialogo).getByLabelText('Descrição *'), 'Pacote de abril');
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      pacienteId: 'p1', tipo: 'pacote_mensal', valorCentavos: 35050, descricao: 'Pacote de abril',
    });
  });

  it('marcar paga abre o diálogo; sem escolher a forma, ela vai vazia (campo opcional)', async () => {
    const user = userEvent.setup();
    mocks.marcarPaga.mockResolvedValue({ ...aberta, status: 'paga' });
    montar();
    await screen.findByText('Pacote de curativos');

    await user.click(screen.getByRole('button', { name: 'Marcar paga Pacote de curativos' }));
    const dialogo = await screen.findByRole('dialog');
    expect(mocks.marcarPaga).not.toHaveBeenCalled();
    await user.click(within(dialogo).getByRole('button', { name: 'Confirmar pagamento' }));

    await waitFor(() => expect(mocks.marcarPaga).toHaveBeenCalledWith('c1', undefined));
  });

  it('marcar paga com a forma de pagamento escolhida (pix) envia a forma', async () => {
    const user = userEvent.setup();
    mocks.marcarPaga.mockResolvedValue({ ...aberta, status: 'paga' });
    montar();
    await screen.findByText('Pacote de curativos');

    await user.click(screen.getByRole('button', { name: 'Marcar paga Pacote de curativos' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('combobox', { name: 'Forma de pagamento recebida' }));
    await user.click(await screen.findByRole('option', { name: 'Pix' }));
    await user.click(within(dialogo).getByRole('button', { name: 'Confirmar pagamento' }));

    await waitFor(() => expect(mocks.marcarPaga).toHaveBeenCalledWith('c1', 'pix'));
  });

  it('cancelar exige o motivo e só então chama a API', async () => {
    const user = userEvent.setup();
    mocks.cancelar.mockResolvedValue({ ...aberta, status: 'cancelada' });
    montar();
    await screen.findByText('Pacote de curativos');

    await user.click(screen.getByRole('button', { name: 'Cancelar cobrança Pacote de curativos' }));
    const dialogo = await screen.findByRole('dialog');
    const botao = within(dialogo).getByRole('button', { name: 'Cancelar cobrança' });
    expect(botao).toBeDisabled();
    await user.type(within(dialogo).getByLabelText('Motivo *'), 'Paciente desistiu');
    await user.click(botao);

    await waitFor(() => expect(mocks.cancelar).toHaveBeenCalledWith('c1', 'Paciente desistiu'));
  });

  it('enviar aviso: e-mail por padrão; com WhatsApp marcado envia os dois canais', async () => {
    const user = userEvent.setup();
    mocks.enviarAviso.mockResolvedValue({ cobranca: { ...aberta, status: 'enviada' }, canais: [{ canal: 'email', ok: true }, { canal: 'whatsapp', ok: true }] });
    montar();
    await screen.findByText('Pacote de curativos');

    await user.click(screen.getByRole('button', { name: 'Enviar aviso Pacote de curativos' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByLabelText('WhatsApp'));
    await user.click(within(dialogo).getByRole('button', { name: 'Enviar aviso' }));

    await waitFor(() => expect(mocks.enviarAviso).toHaveBeenCalledWith('c1', ['email', 'whatsapp']));
  });

  it('cobrança de consulta de enfermagem aparece com o rótulo, mas o tipo não é oferecido na criação manual', async () => {
    const user = userEvent.setup();
    mocks.listByPaciente.mockResolvedValue([{ ...aberta, id: 'c7', tipo: 'consulta_enfermagem', descricao: 'Consulta de enfermagem' }]);
    montar();
    expect(await screen.findAllByText('Consulta de enfermagem')).toHaveLength(2); // descrição + rótulo do tipo

    await user.click(screen.getByRole('button', { name: /Nova cobrança/ }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('combobox', { name: 'Tipo' }));
    const opcoes = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(opcoes).toEqual(['Pacote mensal', 'Outro']);
  });

  it('falha ao carregar não parece "sem cobranças"', async () => {
    mocks.listByPaciente.mockRejectedValue(new Error('falhou'));
    montar();
    expect(await screen.findByTestId('erro-consulta')).toBeInTheDocument();
  });
});
