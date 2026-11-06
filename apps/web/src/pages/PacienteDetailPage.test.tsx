import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';

const mocks = vi.hoisted(() => ({
  pacienteGet: vi.fn(),
  prontuariosList: vi.fn(),
  agendaList: vi.fn(),
  documentosList: vi.fn(),
  observacoesList: vi.fn(),
  papel: 'ENFERMEIRO',
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', papel: mocks.papel, nome: 'Psi Teste', email: 'psi@teste.dev' } }),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    pacientesApi: { ...original.pacientesApi, get: mocks.pacienteGet },
    prontuariosApi: { ...original.prontuariosApi, list: mocks.prontuariosList },
    agendaApi: { ...original.agendaApi, list: mocks.agendaList },
    documentosApi: { ...original.documentosApi, list: mocks.documentosList },
    observacoesPacienteApi: { ...original.observacoesPacienteApi, listByPaciente: mocks.observacoesList },
  };
});

vi.mock('@/api/tickets', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/tickets')>();
  return { ...original, ticketsApi: { ...original.ticketsApi, listarPorPaciente: vi.fn().mockResolvedValue([]) } };
});

import { PacienteDetailPage } from './PacienteDetailPage';

function erroHttp(status: number) {
  return new AxiosError('falha interna', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: {},
    statusText: '',
    headers: {},
    config: {} as never,
  });
}

const paciente = {
  id: 'p1',
  clinicaId: 'c1',
  nome: 'Maria Demonstração',
  cpf: '12345678909',
  dataNascimento: '1990-01-01',
  sexo: 'FEMININO',
  ativo: true,
  telefone: '(11) 98888-1010',
};

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/pacientes/p1']}>
        <Routes>
          <Route path="/pacientes/:id" element={<PacienteDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PacienteDetailPage — falha explícita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.papel = 'ENFERMEIRO';
    mocks.pacienteGet.mockResolvedValue(paciente);
    mocks.prontuariosList.mockResolvedValue([]);
    mocks.agendaList.mockResolvedValue([]);
    mocks.documentosList.mockResolvedValue([]);
    mocks.observacoesList.mockResolvedValue([]);
  });

  it('lista vazia legítima continua mostrando "Nenhum atendimento"', async () => {
    renderizar();
    expect(await screen.findByText('Nenhum atendimento registrado ainda.')).toBeInTheDocument();
    expect(screen.queryByTestId('erro-consulta')).not.toBeInTheDocument();
  });

  it('403 em prontuários: alerta de perfil sem acesso, NUNCA "Nenhum atendimento"', async () => {
    mocks.prontuariosList.mockRejectedValue(erroHttp(403));
    renderizar();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(screen.queryByText('Nenhum atendimento registrado ainda.')).not.toBeInTheDocument();
    expect(within(alerta).queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it('500 em prontuários: alerta com "Tentar novamente" que refaz a consulta', async () => {
    mocks.prontuariosList.mockRejectedValueOnce(erroHttp(500)).mockResolvedValue([]);
    renderizar();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/não foi possível carregar os atendimentos/i);
    await userEvent.click(within(alerta).getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText('Nenhum atendimento registrado ainda.')).toBeInTheDocument();
    expect(mocks.prontuariosList).toHaveBeenCalledTimes(2);
  });

  it('erro em prontuários não mostra contagem 0 na seção', async () => {
    mocks.prontuariosList.mockRejectedValue(erroHttp(500));
    renderizar();
    await screen.findByRole('alert');
    const titulo = screen.getByText('Prontuários e atendimentos');
    expect(titulo.parentElement).not.toHaveTextContent(/Prontuários e atendimentos\s*0/);
  });

  it('403 no paciente: ErroConsulta, e NÃO "Paciente não encontrado"', async () => {
    mocks.pacienteGet.mockRejectedValue(erroHttp(403));
    renderizar();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(screen.queryByText('Paciente não encontrado')).not.toBeInTheDocument();
  });

  it('500 no paciente: ErroConsulta com nova tentativa, e NÃO "Paciente não encontrado"', async () => {
    mocks.pacienteGet.mockRejectedValue(erroHttp(500));
    renderizar();
    const alerta = await screen.findByRole('alert');
    expect(within(alerta).getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    expect(screen.queryByText('Paciente não encontrado')).not.toBeInTheDocument();
  });

  it('404 no paciente: só aqui aparece "Paciente não encontrado"', async () => {
    mocks.pacienteGet.mockRejectedValue(erroHttp(404));
    renderizar();
    expect(await screen.findByText('Paciente não encontrado')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // Estas seções começam fechadas (abre pelo título) e algumas só existem fora do papel de enfermeiro.
  it.each([
    ['documentos', () => mocks.documentosList, 'Documentos', 'os documentos deste paciente', 'ENFERMEIRO'],
    ['observações', () => mocks.observacoesList, 'Observações', 'as observações', 'ADMIN'],
    ['histórico de agenda', () => mocks.agendaList, 'Histórico de agenda', 'o histórico de agenda', 'ADMIN'],
  ])('erro em %s mostra alerta explícito no lugar de lista vazia', async (_nome, mock, titulo, recurso, papel) => {
    mocks.papel = papel;
    mock().mockRejectedValue(erroHttp(500));
    renderizar();
    await userEvent.click(await screen.findByText(titulo));
    await waitFor(() => {
      const alertas = screen.getAllByRole('alert');
      expect(alertas.some((a) => a.textContent?.includes(recurso))).toBe(true);
    });
  });

  it('R1.4: a seção de testes psicológicos (herdada do psi) não existe mais', async () => {
    mocks.papel = 'ENFERMEIRO';
    renderizar();
    await screen.findByText('Documentos');
    expect(screen.queryByText(/Testes Psicológicos/i)).not.toBeInTheDocument();
  });
});
