import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ModuloFerida } from '@shared/consulta';
import type { Lesao } from '@/types';

const mocks = vi.hoisted(() => ({
  listByPaciente: vi.fn(),
  create: vi.fn(),
  listarAnexos: vi.fn(),
  enviarAnexo: vi.fn(),
  urlAnexo: vi.fn(),
  listProdutos: vi.fn(),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    lesoesApi: { ...original.lesoesApi, listByPaciente: mocks.listByPaciente, create: mocks.create },
    consultasApi: { ...original.consultasApi, listarAnexos: mocks.listarAnexos, enviarAnexo: mocks.enviarAnexo, urlAnexo: mocks.urlAnexo },
    produtosApi: { ...original.produtosApi, list: mocks.listProdutos },
  };
});

import { ModuloFeridaCampos } from './ModuloFerida';
import { medicaoValida } from './MedicaoFoto';

const lesao = (over: Partial<Lesao>): Lesao => ({
  id: '65f00000000000000000b001', clinicaId: 'c', pacienteId: 'p1', numero: 1, localizacaoAnatomica: 'sacral', lado: 'CENTRAL',
  etiologia: 'ULCERA_VENOSA', dataIdentificacao: '2026-11-01', status: 'ABERTA', correcoes: [], versao: 1, criadaPor: 'e', criadaEm: '2026-11-01T00:00:00Z',
  ...over,
});

let ultimo: ModuloFerida = {};
function Harness({ inicial = {}, editavel = true }: { inicial?: ModuloFerida; editavel?: boolean }) {
  const [d, setD] = useState<ModuloFerida>(inicial);
  ultimo = d;
  return <ModuloFeridaCampos consultaId="c1" pacienteId="p1" dados={d} editavel={editavel} onChange={(x) => { ultimo = x; setD(x); }} />;
}
function montar(props: Parameters<typeof Harness>[0] = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><Harness {...props} /></QueryClientProvider>);
}

describe('Módulo Feridas (5c)', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.listarAnexos.mockResolvedValue([]);
    mocks.listProdutos.mockResolvedValue([]);
  });

  it('escolher lesão aberta adiciona a seção com desfecho EM_ACOMPANHAMENTO; lesões fechadas não são oferecidas', async () => {
    const user = userEvent.setup();
    mocks.listByPaciente.mockResolvedValue([lesao({}), lesao({ id: '65f00000000000000000b002', numero: 2, status: 'CICATRIZADA' })]);
    montar();
    await user.click(await screen.findByRole('combobox', { name: 'Lesão aberta' }));
    const opcoes = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(opcoes).toContain('Lesão 1 — sacral (central) · Úlcera venosa');
    expect(opcoes.some((o) => o?.startsWith('Lesão 2'))).toBe(false);
    await user.click(screen.getByRole('option', { name: /Lesão 1/ }));
    await user.click(screen.getByRole('button', { name: 'Avaliar' }));
    expect(ultimo.avaliacoes).toEqual([{ lesaoId: '65f00000000000000000b001', desfecho: { situacao: 'EM_ACOMPANHAMENTO' } }]);
    expect(screen.getAllByText('protocolo do serviço').length).toBeGreaterThan(0);
  });

  it('LPP: campo de categoria condicional + dica fixa (não classificável); adesivo < 30 min mostra o erro', async () => {
    mocks.listByPaciente.mockResolvedValue([
      lesao({ etiologia: 'LESAO_POR_PRESSAO' }),
      lesao({ id: '65f00000000000000000b002', numero: 2, etiologia: 'LESAO_ADESIVO_MEDICO' }),
    ]);
    montar({
      inicial: {
        avaliacoes: [
          { lesaoId: '65f00000000000000000b001', lpp: { categoria: 'NAO_CLASSIFICAVEL' }, desfecho: { situacao: 'EM_ACOMPANHAMENTO' } },
          {
            lesaoId: '65f00000000000000000b002',
            lesaoAdesivo: { observacaoRemocao: { em: '2026-11-06T10:00:00.000Z' }, observacao30min: { em: '2026-11-06T10:10:00.000Z' } },
            desfecho: { situacao: 'EM_ACOMPANHAMENTO' },
          },
        ],
      },
    });
    expect(await screen.findByRole('combobox', { name: 'Categoria *' })).toBeInTheDocument();
    expect(screen.getByText('No calcâneo, escara seca e intacta pode funcionar como proteção natural e não deve ser removida.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Registre a segunda observação 30 minutos ou mais após a remoção do adesivo.');
  });

  it('exsudato ausente não pede aspecto; biofilme só como "Suspeita de biofilme"; resposta sistêmica gera aviso', async () => {
    const user = userEvent.setup();
    mocks.listByPaciente.mockResolvedValue([lesao({})]);
    montar({ inicial: { avaliacoes: [{ lesaoId: '65f00000000000000000b001', exsudato: { quantidade: 'AUSENTE' }, desfecho: { situacao: 'EM_ACOMPANHAMENTO' } }] } });
    await screen.findByText(/Lesão 1 —/);
    expect(screen.queryByRole('combobox', { name: 'Aspecto *' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Suspeita de biofilme')).toBeInTheDocument();
    expect(screen.queryByText(/presença de biofilme/i)).not.toBeInTheDocument();
    expect(screen.getByText('Não há método validado à beira do leito para afirmar biofilme.')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Resposta sistêmica'));
    expect(screen.getByText('Resposta sistêmica registrada — encaminhamento e tratamento imediatos.')).toBeInTheDocument();
  });

  it('pele perilesional: marcar Íntegra limpa os demais; marcar outro achado desmarca Íntegra', async () => {
    const user = userEvent.setup();
    mocks.listByPaciente.mockResolvedValue([lesao({})]);
    montar({ inicial: { avaliacoes: [{ lesaoId: '65f00000000000000000b001', pelePerilesional: ['ERITEMA'], desfecho: { situacao: 'EM_ACOMPANHAMENTO' } }] } });
    await screen.findByText(/Lesão 1 —/);
    await user.click(screen.getByLabelText('Íntegra'));
    expect(ultimo.avaliacoes![0].pelePerilesional).toEqual(['INTEGRA']);
    await user.click(screen.getByLabelText('Prurido'));
    expect(ultimo.avaliacoes![0].pelePerilesional).toEqual(['PRURIDO']);
  });

  it('ITB: aviso fixo em destaque; > 1,40 não confiável; compressão mostra só a região informativa', async () => {
    mocks.listByPaciente.mockResolvedValue([]);
    montar({
      inicial: {
        itb: [
          { membro: 'DIREITO', valor: 1.5, finalidade: 'DIAGNOSTICO_DAP' },
          { membro: 'ESQUERDO', valor: 0.9, finalidade: 'SEGURANCA_COMPRESSAO' },
        ],
      },
    });
    expect(screen.getByText('A faixa de diagnóstico não serve para decidir compressão.')).toBeInTheDocument();
    const dir = screen.getByTestId('itb-DIREITO');
    expect(within(dir).getByText('Índice não confiável (possível calcificação).')).toBeInTheDocument();
    expect(within(dir).getByText('faixa de diagnóstico 0,90–1,40')).toBeInTheDocument();
    const esq = screen.getByTestId('itb-ESQUERDO');
    expect(within(esq).getByText('faixa em que todas as fontes compiladas admitem compressão')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/pode comprimir|não comprimir/i);
  });

  it('cadastrar nova lesão a partir do módulo e já avaliá-la', async () => {
    const user = userEvent.setup();
    mocks.listByPaciente.mockResolvedValue([]);
    mocks.create.mockResolvedValue(lesao({ id: '65f00000000000000000b009', numero: 3 }));
    montar();
    await user.click(screen.getByRole('button', { name: /Cadastrar nova lesão/ }));
    const form = screen.getByRole('group', { name: 'Cadastrar nova lesão' });
    await user.type(within(form).getByLabelText('Localização anatômica *'), 'calcâneo');
    await user.click(within(form).getByRole('combobox', { name: 'Etiologia *' }));
    await user.click(await screen.findByRole('option', { name: 'Lesão por pressão' }));
    await user.click(within(form).getByRole('button', { name: 'Cadastrar lesão' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('p1', expect.objectContaining({ localizacaoAnatomica: 'calcâneo', etiologia: 'LESAO_POR_PRESSAO', lado: 'NAO_SE_APLICA' })));
    await waitFor(() => expect(ultimo.avaliacoes).toEqual([{ lesaoId: '65f00000000000000000b009', desfecho: { situacao: 'EM_ACOMPANHAMENTO' } }]));
  });

  it('somente leitura (assinada): sem cadastrar/avaliar/remover nem enviar foto; campos travados', async () => {
    mocks.listByPaciente.mockResolvedValue([lesao({ status: 'CICATRIZADA' })]);
    montar({ editavel: false, inicial: { avaliacoes: [{ lesaoId: '65f00000000000000000b001', medidas: { manual: { comprimentoCm: 3 } }, desfecho: { situacao: 'CICATRIZADA' } }] } });
    expect(await screen.findByText(/Lesão 1 —/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cadastrar nova lesão/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover esta lesão/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Enviar foto/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Comprimento (cm)')).toHaveAttribute('readonly');
  });

  it('medição só entra no módulo quando calibração e contorno são válidos', () => {
    const base = { anexoId: 'a', calibracao: { p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, distanciaCm: 1 }, contorno: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }] };
    expect(medicaoValida(base)).not.toBeNull();
    expect(medicaoValida({ ...base, calibracao: { ...base.calibracao, distanciaCm: undefined } })).toBeNull();
    expect(medicaoValida({ ...base, contorno: base.contorno.slice(0, 2) })).toBeNull();
  });
});
