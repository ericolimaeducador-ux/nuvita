import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { ReactElement } from 'react';

const mocks = vi.hoisted(() => ({
  pacienteGet: vi.fn(),
  prontuariosList: vi.fn(),
  prontuariosGet: vi.fn(),
  agendaList: vi.fn(),
  resumo: vi.fn(),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', clinicaId: 'c1', papel: 'PSICOLOGO', nome: 'Psi Teste', registroProfissional: '06/123', crp: '06/123' },
  }),
}));

// Setup: consultório com CPF/CNPJ informado (sem isso a psicóloga cai no gate do documento do consultório).
vi.mock('@/lib/useClinicaMinha', () => ({ useClinicaMinha: () => ({ isLoading: false, isError: false, data: { nome: 'Clínica', documento: '52998224725', tipoDocumento: 'CPF' } }) }));
vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    pacientesApi: { ...original.pacientesApi, get: mocks.pacienteGet },
    prontuariosApi: {
      ...original.prontuariosApi, list: mocks.prontuariosList, get: mocks.prontuariosGet,
      resumoAcompanhamento: mocks.resumo,
    },
    agendaApi: { ...original.agendaApi, list: mocks.agendaList },
  };
});

import { AtestadoComparecimentoPage } from './AtestadoComparecimentoPage';
import { EncaminhamentoPage } from './EncaminhamentoPage';
import { LaudoPsicoterapicoPage } from './LaudoPsicoterapicoPage';
import { PrescricaoCuidadosPage } from './PrescricaoCuidadosPage';
import { ProntuarioImpressaoPage } from './ProntuarioImpressaoPage';

function erroHttp(status: number) {
  return new AxiosError('falha interna', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: {},
    statusText: '',
    headers: {},
    config: {} as never,
  });
}

function renderizar(pagina: ReactElement, rota = '/p/:id') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[rota.replace(':id', 'p1').replace(':prontuarioId', 'r1')]}>
        <Routes>
          <Route path={rota} element={pagina} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Resumo calculado pelo servidor sobre sessões ancoradas na agenda (7 sessões desde 10/08/2026).
const RESUMO = { desde: '2026-08-10T15:00:00.000Z', totalSessoes: 7 };
const paciente = { id: 'p1', nome: 'Maria Demonstração', cpf: '12345678909', dataNascimento: '1990-01-01' };
const sessao = {
  id: 's1',
  pacienteId: 'p1',
  tipo: 'psicoterapia',
  agendamentoId: 'a1',
  dataAtendimento: '2026-09-01T14:00:00.000Z',
  registroPsicologico: { motivoAtendimento: 'Ansiedade generalizada' },
};

// Páginas que emitem documento a partir do histórico de sessões do paciente.
const PAGINAS_COM_SESSOES: Array<[string, () => ReactElement, RegExp]> = [
  ['Encaminhamento', () => <EncaminhamentoPage />, /gerar encaminhamento/i],
  ['Laudo psicoterápico', () => <LaudoPsicoterapicoPage />, /gerar laudo/i],
];

describe.each(PAGINAS_COM_SESSOES)('%s — falha explícita', (_nome, pagina, botaoGerar) => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue(paciente);
    mocks.prontuariosList.mockResolvedValue([sessao]);
    mocks.resumo.mockResolvedValue(RESUMO);
  });

  it('com os dados carregados, o botão de gerar existe', async () => {
    renderizar(pagina());
    expect(await screen.findByRole('button', { name: botaoGerar })).toBeInTheDocument();
    expect(screen.queryByTestId('erro-consulta')).not.toBeInTheDocument();
  });

  it('403 no paciente: alerta, SEM botão de gerar e sem "Carregando…" eterno', async () => {
    mocks.pacienteGet.mockRejectedValue(erroHttp(403));
    renderizar(pagina());
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(screen.queryByRole('button', { name: botaoGerar })).not.toBeInTheDocument();
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
  });

  it('500 no histórico de sessões: alerta com nova tentativa e SEM botão de gerar', async () => {
    mocks.prontuariosList.mockRejectedValue(erroHttp(500));
    renderizar(pagina());
    const alerta = await screen.findByRole('alert');
    expect(within(alerta).getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: botaoGerar })).not.toBeInTheDocument();
  });

  it('depois de "Tentar novamente" com sucesso, o botão de gerar aparece', async () => {
    mocks.prontuariosList.mockRejectedValueOnce(erroHttp(500)).mockResolvedValue([sessao]);
    renderizar(pagina());
    const alerta = await screen.findByRole('alert');
    await userEvent.click(within(alerta).getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByRole('button', { name: botaoGerar })).toBeInTheDocument();
  });
});

// O atestado não usa mais o histórico de prontuários: data/hora vêm dos atendimentos CONCLUÍDOS da agenda.
describe('Atestado de comparecimento — falha explícita (agenda)', () => {
  const concluido = {
    id: 'a1', status: 'concluido', pacienteId: 'p1', medicoId: 'u1', clinicaId: 'c1',
    dataHoraInicio: '2026-09-01T17:00:00.000Z', dataHoraFim: '2026-09-01T18:00:00.000Z',
  };
  const botao = /gerar atestado/i;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue(paciente);
    mocks.agendaList.mockResolvedValue([concluido]);
  });

  it('com os dados carregados, o botão de gerar existe', async () => {
    renderizar(<AtestadoComparecimentoPage />);
    expect(await screen.findByRole('button', { name: botao })).toBeInTheDocument();
    expect(screen.queryByTestId('erro-consulta')).not.toBeInTheDocument();
  });

  it('403 no paciente: alerta, SEM botão de gerar e sem "Carregando…" eterno', async () => {
    mocks.pacienteGet.mockRejectedValue(erroHttp(403));
    renderizar(<AtestadoComparecimentoPage />);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(screen.queryByRole('button', { name: botao })).not.toBeInTheDocument();
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
  });

  it('500 na agenda: alerta com nova tentativa e SEM botão de gerar', async () => {
    mocks.agendaList.mockRejectedValue(erroHttp(500));
    renderizar(<AtestadoComparecimentoPage />);
    const alerta = await screen.findByRole('alert');
    expect(within(alerta).getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: botao })).not.toBeInTheDocument();
  });

  it('depois de "Tentar novamente" com sucesso, o botão de gerar aparece', async () => {
    mocks.agendaList.mockRejectedValueOnce(erroHttp(500)).mockResolvedValue([concluido]);
    renderizar(<AtestadoComparecimentoPage />);
    const alerta = await screen.findByRole('alert');
    await userEvent.click(within(alerta).getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByRole('button', { name: botao })).toBeInTheDocument();
  });

  it('sem atendimento concluído: recusa emitir (sem botão) — não há data livre', async () => {
    mocks.agendaList.mockResolvedValue([]);
    renderizar(<AtestadoComparecimentoPage />);
    expect(await screen.findByText(/nenhum atendimento conclu[ií]do/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: botao })).not.toBeInTheDocument();
    expect(document.querySelector('input[type="datetime-local"]')).toBeNull();
  });
});

describe('Laudo — rascunho depois de falha do histórico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue(paciente);
    mocks.resumo.mockResolvedValue(RESUMO);
  });

  it('a falha não "gasta" o rascunho: depois do retry, o texto é gerado do histórico', async () => {
    mocks.prontuariosList.mockRejectedValueOnce(erroHttp(500)).mockResolvedValue([sessao]);
    renderizar(<LaudoPsicoterapicoPage />);
    const alerta = await screen.findByRole('alert');
    await userEvent.click(within(alerta).getByRole('button', { name: /tentar novamente/i }));
    const texto = (await screen.findByLabelText('Texto do laudo')) as HTMLTextAreaElement;
    expect(texto.value).toContain('Ansiedade generalizada');
  });

  // BUG-020: os fatos que o laudo afirma a terceiros ("desde X, N sessões") vêm do SERVIDOR, calculados
  // sobre sessões ancoradas na agenda; a tela não conta nem escolhe a data.
  it('"desde" e o total do rascunho vêm do resumo do servidor, não da contagem da tela', async () => {
    mocks.prontuariosList.mockResolvedValue([sessao]);
    renderizar(<LaudoPsicoterapicoPage />);
    const texto = (await screen.findByLabelText('Texto do laudo')) as HTMLTextAreaElement;
    expect(texto.value).toContain('desde 10/08/2026, totalizando 7 sessão(ões)');
  });

  it('falha do resumo: alerta com nova tentativa e SEM rascunho com fato inventado', async () => {
    mocks.prontuariosList.mockResolvedValue([sessao]);
    mocks.resumo.mockRejectedValue(erroHttp(500));
    renderizar(<LaudoPsicoterapicoPage />);
    const alerta = await screen.findByRole('alert');
    expect(within(alerta).getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Texto do laudo')).not.toBeInTheDocument();
  });
});

describe('Prescrição de cuidados — falha explícita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue(paciente);
  });

  it('com os dados carregados, o botão de gerar existe', async () => {
    renderizar(<PrescricaoCuidadosPage />);
    expect(await screen.findByRole('button', { name: /gerar prescrição/i })).toBeInTheDocument();
  });

  it('403 no paciente: alerta, SEM botão de gerar e sem "Carregando…" eterno', async () => {
    mocks.pacienteGet.mockRejectedValue(erroHttp(403));
    renderizar(<PrescricaoCuidadosPage />);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(screen.queryByRole('button', { name: /gerar prescrição/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
  });
});

describe('Impressão do prontuário — falha explícita', () => {
  const ROTA = '/p/:id/:prontuarioId';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue(paciente);
    mocks.prontuariosGet.mockResolvedValue({ ...sessao, assinado: undefined });
  });

  it('com os dados carregados, o botão de imprimir existe', async () => {
    renderizar(<ProntuarioImpressaoPage />, ROTA);
    expect(await screen.findByRole('button', { name: /imprimir/i })).toBeInTheDocument();
  });

  it('403 no prontuário: alerta, SEM botão de imprimir e SEM documento em branco', async () => {
    mocks.prontuariosGet.mockRejectedValue(erroHttp(403));
    renderizar(<ProntuarioImpressaoPage />, ROTA);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(screen.queryByRole('button', { name: /imprimir/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Data do atendimento/)).not.toBeInTheDocument();
  });

  it('500 no paciente: alerta com nova tentativa e SEM botão de imprimir', async () => {
    mocks.pacienteGet.mockRejectedValue(erroHttp(500));
    renderizar(<ProntuarioImpressaoPage />, ROTA);
    const alerta = await screen.findByRole('alert');
    expect(within(alerta).getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /imprimir/i })).not.toBeInTheDocument();
  });
});
