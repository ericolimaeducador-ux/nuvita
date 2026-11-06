import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  get: vi.fn(), salvarRascunho: vi.fn(), assinar: vi.fn(), gerarCobranca: vi.fn(), criarAdendo: vi.fn(), aplicarDesfechoLesoes: vi.fn(),
  config: vi.fn(), paciente: vi.fn(), listarAnexos: vi.fn(), userId: { atual: 'enf-autor' },
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    consultasApi: { ...original.consultasApi, get: mocks.get, salvarRascunho: mocks.salvarRascunho, assinar: mocks.assinar, gerarCobranca: mocks.gerarCobranca, criarAdendo: mocks.criarAdendo, aplicarDesfechoLesoes: mocks.aplicarDesfechoLesoes, listarAnexos: mocks.listarAnexos },
    pacientesApi: { ...original.pacientesApi, get: mocks.paciente },
    cobrancasApi: { ...original.cobrancasApi, config: mocks.config },
  };
});
vi.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ user: { id: mocks.userId.atual, papel: 'ENFERMEIRO' } }) }));

import { ConsultaEnfermagemPage } from './ConsultaEnfermagemPage';

const rascunho = {
  id: 'c1', clinicaId: 'cl1', pacienteId: 'p1', enfermeiroId: 'enf-autor', status: 'RASCUNHO',
  avaliacao: { dadosSubjetivos: 'relato', dadosObjetivos: 'exame', modulos: [] },
  diagnosticos: [{ texto: 'diag livre', origem: 'MANUAL' }],
  planejamento: { prioridades: '', resultadosEsperados: '', prescricaoEnfermagem: [], examesSolicitados: '', encaminhamentos: '' },
  implementacao: { registros: [] }, evolucao: { texto: '' }, criadoEm: '2026-11-05T10:00:00.000Z', atualizadoEm: '2026-11-05T10:00:00.000Z',
  adendos: [],
};
const assinada = {
  ...rascunho, status: 'ASSINADA',
  assinatura: { enfermeiroId: 'enf-autor', coren: 'COREN-SP 1', dataAssinatura: '2026-11-05T12:00:00.000Z' },
  cobranca: { incluidaEmPacote: false, valorCentavos: 22000, status: 'GERADA', cobrancaId: 'cob1' },
  adendos: [{ id: 'a1', consultaId: 'c1', numero: 1, autorId: 'enf-autor', motivo: 'Correção da anotação', texto: 'texto do adendo', criadoEm: '2026-11-05T13:00:00.000Z' }],
};

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/pacientes/p1/consultas/c1']}>
        <Routes>
          <Route path="/pacientes/:id/consultas/:consultaId" element={<ConsultaEnfermagemPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ConsultaEnfermagemPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => typeof m === 'function' && m.mockReset());
    mocks.userId.atual = 'enf-autor';
    mocks.get.mockResolvedValue(rascunho);
    mocks.config.mockResolvedValue({ valorConsultaCentavos: 22000 });
    mocks.salvarRascunho.mockResolvedValue(rascunho);
    mocks.paciente.mockResolvedValue({ id: 'p1', classificacoes: ['FA'] });
    mocks.listarAnexos.mockResolvedValue([]);
  });

  it('mostra as 5 etapas em stepper e a área dos módulos (paciente OT: nenhum módulo disponível ainda)', async () => {
    mocks.paciente.mockResolvedValue({ id: 'p1', classificacoes: ['OT'] });
    montar();
    const nav = await screen.findByRole('navigation', { name: 'Etapas da consulta' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual([
      '1. Avaliação', '2. Diagnóstico', '3. Planejamento', '4. Implementação', '5. Evolução',
    ]);
    expect(await screen.findByText('Nenhum módulo de avaliação disponível para a classificação deste paciente.')).toBeInTheDocument();
  });

  it('salvar rascunho envia as 5 etapas (diagnóstico com origem MANUAL)', async () => {
    const user = userEvent.setup();
    montar();
    await user.type(await screen.findByLabelText('Dados subjetivos (entrevista)'), ' novo');
    await user.click(screen.getByRole('button', { name: '5. Evolução' }));
    await user.type(screen.getByLabelText('Evolução'), 'paciente estável');
    await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));

    await waitFor(() => expect(mocks.salvarRascunho).toHaveBeenCalled());
    const [id, payload] = mocks.salvarRascunho.mock.calls[0];
    expect(id).toBe('c1');
    expect(payload).toMatchObject({
      avaliacao: { dadosSubjetivos: 'relato novo', dadosObjetivos: 'exame' },
      diagnosticos: [{ texto: 'diag livre', origem: 'MANUAL' }],
      evolucao: { texto: 'paciente estável' },
    });
  });

  it('assinar: valor padrão da clínica editável em reais -> enviado em centavos', async () => {
    const user = userEvent.setup();
    mocks.assinar.mockResolvedValue(assinada);
    montar();
    await user.click(await screen.findByRole('button', { name: 'Assinar consulta' }));
    const dialogo = await screen.findByRole('dialog');
    const campo = within(dialogo).getByLabelText('Valor (R$)');
    await waitFor(() => expect(campo).toHaveValue('220,00'));
    await user.clear(campo);
    await user.type(campo, '180,50');
    await user.click(within(dialogo).getByRole('button', { name: 'Assinar' }));

    await waitFor(() => expect(mocks.assinar).toHaveBeenCalledWith('c1', { incluidaEmPacote: false, valorCentavos: 18050 }));
    expect(mocks.salvarRascunho).toHaveBeenCalled(); // salva antes de assinar
  });

  it('assinar com "Incluída em pacote — não cobrar" não envia valor', async () => {
    const user = userEvent.setup();
    mocks.assinar.mockResolvedValue(assinada);
    montar();
    await user.click(await screen.findByRole('button', { name: 'Assinar consulta' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByLabelText('Incluída em pacote — não cobrar'));
    expect(within(dialogo).queryByLabelText('Valor (R$)')).not.toBeInTheDocument();
    await user.click(within(dialogo).getByRole('button', { name: 'Assinar' }));

    await waitFor(() => expect(mocks.assinar).toHaveBeenCalledWith('c1', { incluidaEmPacote: true }));
  });

  it('consulta assinada: somente leitura, lista de adendos e "Adicionar adendo" (motivo mínimo de 10)', async () => {
    const user = userEvent.setup();
    mocks.get.mockResolvedValue(assinada);
    mocks.criarAdendo.mockResolvedValue(assinada.adendos[0]);
    montar();

    expect(await screen.findByLabelText('Dados subjetivos (entrevista)')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Salvar rascunho' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assinar consulta' })).not.toBeInTheDocument();
    expect(screen.getByText(/Adendo nº 1/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Adicionar adendo/ }));
    const dialogo = await screen.findByRole('dialog');
    const registrar = within(dialogo).getByRole('button', { name: 'Registrar adendo' });
    await user.type(within(dialogo).getByLabelText('Motivo *'), 'curto');
    await user.type(within(dialogo).getByLabelText('Texto do adendo *'), 'correção');
    expect(registrar).toBeDisabled();
    await user.type(within(dialogo).getByLabelText('Motivo *'), ' mas agora suficiente');
    await user.click(registrar);

    await waitFor(() => expect(mocks.criarAdendo).toHaveBeenCalledWith('c1', 'curto mas agora suficiente', 'correção'));
  });

  it('cobrança PENDENTE_GERACAO: aviso + "Gerar cobrança"', async () => {
    const user = userEvent.setup();
    mocks.get.mockResolvedValue({ ...assinada, cobranca: { incluidaEmPacote: false, valorCentavos: 22000, status: 'PENDENTE_GERACAO' } });
    mocks.gerarCobranca.mockResolvedValue({ consultaId: 'c1', cobranca: { status: 'GERADA' } });
    montar();

    expect(await screen.findByRole('alert')).toHaveTextContent('a cobrança ainda não foi gerada');
    await user.click(screen.getByRole('button', { name: 'Gerar cobrança' }));
    await waitFor(() => expect(mocks.gerarCobranca).toHaveBeenCalledWith('c1'));
  });

  it('desfecho PENDENTE_APLICACAO: aviso + "Aplicar desfecho nas lesões"; sem pendência, sem aviso', async () => {
    const user = userEvent.setup();
    mocks.get.mockResolvedValue({ ...assinada, desfechoLesoesStatus: 'PENDENTE_APLICACAO' });
    mocks.aplicarDesfechoLesoes.mockResolvedValue({ consultaId: 'c1', desfechoLesoesStatus: 'APLICADO', aplicadas: ['l1'], jaAplicadas: [], conflitos: [], falhas: [] });
    const { unmount } = montar();

    expect(await screen.findByRole('alert')).toHaveTextContent('o desfecho do módulo Feridas ainda não foi aplicado nas lesões');
    await user.click(screen.getByRole('button', { name: 'Aplicar desfecho nas lesões' }));
    await waitFor(() => expect(mocks.aplicarDesfechoLesoes).toHaveBeenCalledWith('c1'));
    unmount();

    mocks.get.mockResolvedValue({ ...assinada, desfechoLesoesStatus: 'APLICADO' });
    montar();
    await screen.findByRole('navigation', { name: 'Etapas da consulta' });
    expect(screen.queryByRole('button', { name: 'Aplicar desfecho nas lesões' })).not.toBeInTheDocument();
  });

  it('enfermeiro que NÃO é o autor vê o rascunho somente leitura (sem salvar/assinar)', async () => {
    mocks.userId.atual = 'enf-colega';
    montar();
    expect(await screen.findByLabelText('Dados subjetivos (entrevista)')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Salvar rascunho' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assinar consulta' })).not.toBeInTheDocument();
  });
});
