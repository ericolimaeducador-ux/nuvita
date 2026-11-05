import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';

const mocks = vi.hoisted(() => ({
  pacienteGet: vi.fn(),
  prontuariosList: vi.fn(),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', clinicaId: 'c1', papel: 'ENFERMEIRO', nome: 'Psi Teste', registroProfissional: 'COREN 06/123', coren: 'COREN 06/123' },
  }),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    pacientesApi: { ...original.pacientesApi, get: mocks.pacienteGet },
    prontuariosApi: { ...original.prontuariosApi, list: mocks.prontuariosList },
  };
});

import { RegistroSessao } from './AtendimentoPsicologicoPage';

function erroHttp(status: number) {
  return new AxiosError('falha interna', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: {},
    statusText: '',
    headers: {},
    config: {} as never,
  });
}

const agendamento = {
  id: 'a1',
  clinicaId: 'c1',
  pacienteId: 'p1',
  pacienteNome: 'Maria Demonstração',
  medicoId: 'u1',
  dataHoraInicio: '2026-10-05T14:00:00.000Z',
} as never;

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RegistroSessao agendamento={agendamento} open onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

const botaoRascunho = () => screen.getByRole('button', { name: /salvar rascunho/i });
const botaoAssinar = () => screen.getByRole('button', { name: /salvar e assinar/i });

describe('RegistroSessao — falha explícita do histórico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue({ id: 'p1', nome: 'Maria Demonstração', cpf: '12345678909' });
    mocks.prontuariosList.mockResolvedValue([]);
  });

  it('histórico vazio legítimo: primeira consulta, salvar liberado', async () => {
    renderizar();
    expect(await screen.findByText(/Primeira consulta/)).toBeInTheDocument();
    expect(botaoRascunho()).toBeEnabled();
    expect(botaoAssinar()).toBeEnabled();
    expect(screen.queryByTestId('erro-consulta')).not.toBeInTheDocument();
  });

  it('403 no histórico: alerta explícito, NUNCA "Carregando o histórico" eterno', async () => {
    mocks.prontuariosList.mockRejectedValue(erroHttp(403));
    renderizar();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(screen.queryByText(/Carregando o histórico/)).not.toBeInTheDocument();
    expect(within(alerta).queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it('erro no histórico bloqueia salvar, com o motivo visível', async () => {
    mocks.prontuariosList.mockRejectedValue(erroHttp(403));
    renderizar();
    await screen.findByRole('alert');
    expect(botaoRascunho()).toBeDisabled();
    expect(botaoAssinar()).toBeDisabled();
    expect(screen.getByTestId('salvar-bloqueado')).toHaveTextContent(/salvar bloqueado/i);
  });

  it('erro no histórico não decide entre primeira consulta e seguimento', async () => {
    mocks.prontuariosList.mockRejectedValue(erroHttp(500));
    renderizar();
    await screen.findByRole('alert');
    expect(screen.queryByText(/Primeira consulta/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Consulta de seguimento/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sugestão de abordagem/)).not.toBeInTheDocument();
  });

  it('500: "Tentar novamente" refaz a consulta e libera o formulário', async () => {
    mocks.prontuariosList.mockRejectedValueOnce(erroHttp(500)).mockResolvedValue([]);
    renderizar();
    const alerta = await screen.findByRole('alert');
    await userEvent.click(within(alerta).getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText(/Primeira consulta/)).toBeInTheDocument();
    expect(botaoRascunho()).toBeEnabled();
    expect(mocks.prontuariosList).toHaveBeenCalledTimes(2);
  });

  it('erro nos dados do paciente: alerta próprio, mas o histórico ok mantém salvar liberado', async () => {
    mocks.pacienteGet.mockRejectedValue(erroHttp(500));
    renderizar();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/dados cadastrais do paciente/i);
    expect(await screen.findByText(/Primeira consulta/)).toBeInTheDocument();
    expect(botaoRascunho()).toBeEnabled();
  });
});
