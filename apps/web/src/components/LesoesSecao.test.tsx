import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { HistoricoLesao, Lesao } from '@/types';

const mocks = vi.hoisted(() => ({ historico: vi.fn(), corrigir: vi.fn(), getCons: vi.fn(), registrar: vi.fn(), revogar: vi.fn() }));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    lesoesApi: { ...original.lesoesApi, historico: mocks.historico, corrigir: mocks.corrigir },
    consentimentoImagemApi: { get: mocks.getCons, registrar: mocks.registrar, revogar: mocks.revogar },
  };
});

import { LesoesSecao } from './LesoesSecao';

const lesao = (over: Partial<Lesao>): Lesao => ({
  id: '65f00000000000000000b001', clinicaId: 'c', pacienteId: 'p1', numero: 1, localizacaoAnatomica: 'sacral', lado: 'CENTRAL',
  etiologia: 'ULCERA_VENOSA', dataIdentificacao: '2026-11-01', status: 'ABERTA', correcoes: [], versao: 1, criadaPor: 'e', criadaEm: '2026-11-01T00:00:00Z',
  ...over,
});

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}><LesoesSecao pacienteId="p1" /></QueryClientProvider></MemoryRouter>);
}

describe('LesoesSecao (5c) — histórico somente leitura', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.getCons.mockResolvedValue({ vigente: null, historico: [] });
  });

  it('lista na ordem da API (abertas primeiro), linha do tempo com o método de cada medida e gráfico', async () => {
    const historico: HistoricoLesao[] = [
      {
        lesao: lesao({ numero: 2, id: '65f00000000000000000b002' }),
        avaliacoes: [
          { consultaId: 'k1', assinadaEm: '2026-11-02T10:00:00Z', enfermeiroId: 'e', avaliacao: { lesaoId: 'x', desfecho: { situacao: 'EM_ACOMPANHAMENTO' } }, medidas: [{ metodo: 'MANUAL', comprimentoCm: 3, larguraCm: 2 }] },
          { consultaId: 'k2', assinadaEm: '2026-11-05T10:00:00Z', enfermeiroId: 'e', avaliacao: { lesaoId: 'x', desfecho: { situacao: 'EM_ACOMPANHAMENTO' } }, medidas: [{ metodo: 'FOTO', anexoId: 'a', areaCm2: 4.2, comprimentoCm: 2.5, larguraCm: 1.8 }] },
        ],
      },
      { lesao: lesao({ status: 'CICATRIZADA' }), avaliacoes: [] },
    ];
    mocks.historico.mockResolvedValue(historico);
    montar();
    const itens = await screen.findAllByTestId(/^lesao-/);
    expect(itens.map((i) => i.getAttribute('data-testid'))).toEqual(['lesao-2', 'lesao-1']);
    expect(within(itens[0]).getByText(/^Manual: comprimento 3 cm/)).toBeInTheDocument();
    expect(within(itens[0]).getByText(/^Foto \(estimativa por imagem\): área 4,2 cm²/)).toBeInTheDocument();
    expect(within(itens[0]).getByRole('img', { name: 'Comprimento ao longo do tempo' })).toBeInTheDocument();
    expect(within(itens[0]).getByRole('img', { name: 'Área (só foto) ao longo do tempo' })).toBeInTheDocument();
    expect(within(itens[1]).getByText('Cicatrizada')).toBeInTheDocument();
    expect(within(itens[1]).getByText('Nenhuma avaliação em consulta assinada.')).toBeInTheDocument();
  });

  it('consentimento: sem vigente mostra o bloqueio e registra; com vigente permite revogar', async () => {
    const user = userEvent.setup();
    mocks.historico.mockResolvedValue([]);
    mocks.registrar.mockResolvedValue({});
    montar();
    expect(await screen.findByText('Sem consentimento vigente — fotos novas bloqueadas')).toBeInTheDocument();
    expect(screen.getByText(/TODO legal/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Obtido em'), '2026-11-06T09:00');
    await user.click(screen.getByRole('button', { name: 'Registrar consentimento' }));
    await waitFor(() => expect(mocks.registrar).toHaveBeenCalledWith('p1', expect.stringMatching(/^2026-11-06T\d{2}:00:00\.000Z$/)));
  });

  it('com consentimento vigente: botão Revogar chama a API', async () => {
    const user = userEvent.setup();
    mocks.historico.mockResolvedValue([]);
    mocks.getCons.mockResolvedValue({ vigente: { id: 'cons1', obtidoEm: '2026-11-06T09:00:00Z' }, historico: [] });
    mocks.revogar.mockResolvedValue({});
    montar();
    await user.click(await screen.findByRole('button', { name: 'Revogar' }));
    await waitFor(() => expect(mocks.revogar).toHaveBeenCalledWith('cons1'));
  });

  it('correção versionada exige motivo de 10+ caracteres e envia a versão vista', async () => {
    const user = userEvent.setup();
    mocks.historico.mockResolvedValue([{ lesao: lesao({ versao: 3 }), avaliacoes: [] }]);
    mocks.corrigir.mockResolvedValue({});
    montar();
    await user.click(await screen.findByRole('button', { name: 'Corrigir' }));
    const form = screen.getByRole('group', { name: 'Corrigir lesão 1' });
    const salvar = within(form).getByRole('button', { name: 'Salvar correção' });
    await user.clear(within(form).getByLabelText('Localização anatômica'));
    await user.type(within(form).getByLabelText('Localização anatômica'), 'calcâneo');
    expect(salvar).toBeDisabled();
    await user.type(within(form).getByLabelText(/Motivo da correção/), 'erro de digitação');
    await user.click(salvar);
    await waitFor(() => expect(mocks.corrigir).toHaveBeenCalledWith('65f00000000000000000b001', expect.objectContaining({ localizacaoAnatomica: 'calcâneo', motivo: 'erro de digitação', versao: 3 })));
  });
});
