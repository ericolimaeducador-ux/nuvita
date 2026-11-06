import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * R1 (decisões do Erico) — no PADRÃO (sem ligar flag nenhuma), a interface não oferece:
 *  - escrita no prontuário antigo (o servidor responde 403: somente leitura);
 *  - a IA clínica antiga (o servidor responde 403 "Recurso desativado.");
 *  - a edição de módulos por usuário (o servidor controla só pelo papel até a etapa de conteúdo).
 */
const mocks = vi.hoisted(() => ({
  pacienteGet: vi.fn(),
  pacientesList: vi.fn(),
  prontuariosList: vi.fn(),
  listUsuarios: vi.fn(),
  listClinicas: vi.fn(),
  updateUsuario: vi.fn(),
  papel: 'ENFERMEIRO',
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', clinicaId: 'c1', papel: mocks.papel, nome: 'Enf Teste', coren: 'COREN 06/123', registroProfissional: 'COREN 06/123' },
    permissoes: [],
  }),
}));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    pacientesApi: { ...original.pacientesApi, get: mocks.pacienteGet, list: mocks.pacientesList },
    prontuariosApi: { ...original.prontuariosApi, list: mocks.prontuariosList },
    superAdminApi: { ...original.superAdminApi, listUsuarios: mocks.listUsuarios, listClinicas: mocks.listClinicas, updateUsuario: mocks.updateUsuario },
  };
});

import { RECURSOS_LEGADO } from '@/lib/recursos-legado';
import { RegistroSessao } from './AtendimentoPsicologicoPage';
import { PrescricaoCuidadosPage } from './PrescricaoCuidadosPage';
import { ProntuariosPage } from './ProntuariosPage';
import { SuperAdminPage } from './SuperAdminPage';

const comProviders = (ui: React.ReactNode, rota = '/') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[rota]}>{ui}</MemoryRouter></QueryClientProvider>);
};

describe('R1 — recursos herdados ocultos por padrão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.papel = 'ENFERMEIRO';
    mocks.pacienteGet.mockResolvedValue({ id: 'p1', nome: 'Maria Demonstração', cpf: '12345678909' });
    mocks.pacientesList.mockResolvedValue({ items: [], total: 0 });
    mocks.prontuariosList.mockResolvedValue([{ id: 'pr1', pacienteId: 'p1', assinado: false, criadoEm: '2026-11-01T00:00:00Z', dataAtendimento: '2026-11-01T00:00:00Z' }]);
  });

  it('as três flags vêm desligadas', () => {
    expect(RECURSOS_LEGADO).toEqual({ escritaProntuarioAntigo: false, iaClinicaAntiga: false, edicaoModulosPorUsuario: false });
  });

  it('registro de sessão (Atendimento psicológico): sem salvar/assinar prontuário e sem "Sugerir abordagem"', async () => {
    comProviders(<RegistroSessao agendamento={{ id: 'a1', clinicaId: 'c1', pacienteId: 'p1', pacienteNome: 'Maria', medicoId: 'u1', dataHoraInicio: '2026-10-05T14:00:00.000Z' } as never} open onClose={vi.fn()} />);
    await waitFor(() => expect(mocks.prontuariosList).toHaveBeenCalled());
    await screen.findByRole('button', { name: /fechar/i });
    expect(screen.queryByRole('button', { name: /salvar rascunho/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salvar e assinar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sugerir abordagem/i })).not.toBeInTheDocument();
  });

  it('prescrição de cuidados: sem "Gerar com IA" (a impressão manual continua)', async () => {
    comProviders(<Routes><Route path="/pacientes/:id/prescricao" element={<PrescricaoCuidadosPage />} /></Routes>, '/pacientes/p1/prescricao');
    expect(await screen.findByLabelText(/orientações adicionais/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gerar com ia/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gerar prescrição/i })).toBeInTheDocument();
  });

  it('lista de prontuários: rascunho antigo sem botão "Assinar" (leitura continua)', async () => {
    comProviders(<ProntuariosPage />);
    await waitFor(() => expect(mocks.prontuariosList).toHaveBeenCalled());
    expect(await screen.findByText('Rascunho')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^assinar$/i })).not.toBeInTheDocument();
  });

  it('Super Admin: editor de usuário sem "Módulos liberados" e o salvamento não envia módulos (dados preservados)', async () => {
    mocks.papel = 'SUPER_ADMIN';
    mocks.listUsuarios.mockResolvedValue({
      items: [{ id: 'u9', nome: 'Ana', email: 'ana@exemplo.com', papel: 'ENFERMEIRO', clinicaId: 'c1', ativo: true, modulosRevogados: ['AGENDA'], permissoes: ['DASHBOARD'] }],
      total: 1, skip: 0, limit: 20,
    });
    mocks.listClinicas.mockResolvedValue({ items: [{ id: 'c1', nome: 'Clínica Exemplo' }], total: 1 });
    mocks.updateUsuario.mockResolvedValue({});
    const user = userEvent.setup();
    comProviders(<SuperAdminPage />);
    await user.click(await screen.findByTitle('Editar'));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).queryByText('Módulos liberados')).not.toBeInTheDocument();
    await user.click(within(dialogo).getByRole('button', { name: /salvar alterações/i }));
    await waitFor(() => expect(mocks.updateUsuario).toHaveBeenCalled());
    const payload = mocks.updateUsuario.mock.calls[0][1];
    expect(payload).not.toHaveProperty('modulosConcedidos');
    expect(payload).not.toHaveProperty('modulosRevogados');
  });
});
