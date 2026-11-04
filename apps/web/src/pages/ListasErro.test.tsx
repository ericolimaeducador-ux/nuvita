import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { ReactElement } from 'react';

const mocks = vi.hoisted(() => ({
  pacientesList: vi.fn(),
  agendaList: vi.fn(),
  documentosList: vi.fn(),
  prontuariosList: vi.fn(),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', clinicaId: 'c1', papel: 'ADMIN', nome: 'Admin Teste' }, permissoes: [] }),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    pacientesApi: { ...original.pacientesApi, list: mocks.pacientesList, listarRepresentantes: vi.fn().mockResolvedValue([]) },
    agendaApi: { ...original.agendaApi, list: mocks.agendaList },
    documentosApi: { ...original.documentosApi, list: mocks.documentosList },
    prontuariosApi: { ...original.prontuariosApi, list: mocks.prontuariosList },
  };
});

import { PacientesPage } from './PacientesPage';
import { AgendaPage } from './AgendaPage';
import { DocumentosPage } from './DocumentosPage';
import { ProntuariosPage } from './ProntuariosPage';
import { AgendaCalendario } from '@/components/AgendaCalendario';

function erroHttp(status: number) {
  return new AxiosError('falha interna', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: {},
    statusText: '',
    headers: {},
    config: {} as never,
  });
}

function renderizar(pagina: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{pagina}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const vazioPaginado = { items: [], hasMore: false };

describe('Listas — falha explícita em vez de "nenhum registro"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacientesList.mockResolvedValue(vazioPaginado);
    mocks.agendaList.mockResolvedValue([]);
    mocks.documentosList.mockResolvedValue([]);
    mocks.prontuariosList.mockResolvedValue([]);
  });

  describe('Pacientes', () => {
    it('lista vazia legítima: "Nenhum paciente encontrado"', async () => {
      renderizar(<PacientesPage />);
      expect(await screen.findByText('Nenhum paciente encontrado')).toBeInTheDocument();
    });

    it('403: alerta de perfil sem acesso, NUNCA "Nenhum paciente encontrado"', async () => {
      mocks.pacientesList.mockRejectedValue(erroHttp(403));
      renderizar(<PacientesPage />);
      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
      expect(screen.queryByText('Nenhum paciente encontrado')).not.toBeInTheDocument();
    });

    it('500: "Tentar novamente" refaz a consulta', async () => {
      mocks.pacientesList.mockRejectedValueOnce(erroHttp(500)).mockResolvedValue(vazioPaginado);
      renderizar(<PacientesPage />);
      const alerta = await screen.findByRole('alert');
      await userEvent.click(within(alerta).getByRole('button', { name: /tentar novamente/i }));
      expect(await screen.findByText('Nenhum paciente encontrado')).toBeInTheDocument();
    });
  });

  describe('Agenda (lista do dia)', () => {
    async function abrirLista() {
      await userEvent.click(await screen.findByRole('button', { name: /lista/i }));
    }

    it('dia vazio legítimo: "Nenhum agendamento para este dia"', async () => {
      renderizar(<AgendaPage />);
      await abrirLista();
      expect(await screen.findByText('Nenhum agendamento para este dia')).toBeInTheDocument();
    });

    it('403: alerta, NUNCA "Nenhum agendamento para este dia"', async () => {
      mocks.agendaList.mockRejectedValue(erroHttp(403));
      renderizar(<AgendaPage />);
      await abrirLista();
      const alertas = await screen.findAllByRole('alert');
      expect(alertas.some((a) => a.textContent?.includes('Seu perfil não tem acesso'))).toBe(true);
      expect(screen.queryByText('Nenhum agendamento para este dia')).not.toBeInTheDocument();
    });

    it('erro na busca de pacientes avisa que os nomes estão indisponíveis', async () => {
      mocks.pacientesList.mockRejectedValue(erroHttp(500));
      renderizar(<AgendaPage />);
      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent(/nomes dos pacientes/i);
    });
  });

  describe('Agenda (calendário)', () => {
    const calendario = () => (
      <AgendaCalendario nomePorPacienteId={new Map()} podeConcluir={false} onIniciarAtendimento={vi.fn()} />
    );

    it('403: alerta explícito acima do calendário', async () => {
      mocks.agendaList.mockRejectedValue(erroHttp(403));
      renderizar(calendario());
      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    });

    it('sem erro: nenhum alerta', async () => {
      renderizar(calendario());
      await screen.findByText(/Arraste um evento para reagendar/);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Documentos', () => {
    it('lista vazia legítima: "Nenhum documento encontrado"', async () => {
      renderizar(<DocumentosPage />);
      expect(await screen.findByText('Nenhum documento encontrado')).toBeInTheDocument();
    });

    it('403: alerta, NUNCA "Nenhum documento encontrado"', async () => {
      mocks.documentosList.mockRejectedValue(erroHttp(403));
      renderizar(<DocumentosPage />);
      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
      expect(screen.queryByText('Nenhum documento encontrado')).not.toBeInTheDocument();
    });
  });

  describe('Prontuários', () => {
    it('lista vazia legítima: "Nenhum prontuário encontrado"', async () => {
      renderizar(<ProntuariosPage />);
      expect(await screen.findByText('Nenhum prontuário encontrado')).toBeInTheDocument();
    });

    it('403: alerta, NUNCA "Nenhum prontuário encontrado"', async () => {
      mocks.prontuariosList.mockRejectedValue(erroHttp(403));
      renderizar(<ProntuariosPage />);
      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent('Seu perfil não tem acesso a esta informação');
      expect(screen.queryByText('Nenhum prontuário encontrado')).not.toBeInTheDocument();
    });

    it('erro na busca de pacientes avisa que os nomes estão indisponíveis (sem mostrar só IDs)', async () => {
      mocks.pacientesList.mockRejectedValue(erroHttp(500));
      renderizar(<ProntuariosPage />);
      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent(/nomes dos pacientes/i);
    });
  });
});
