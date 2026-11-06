import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// O AGENDAMENTO define qual formulário abre; o seletor do topo corrige; o payload grava o formulário usado.
const mocks = vi.hoisted(() => ({ pacienteGet: vi.fn(), prontuariosList: vi.fn(), create: vi.fn(), assinar: vi.fn() }));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', clinicaId: 'c1', papel: 'ENFERMEIRO', nome: 'Psi', coren: 'COREN 06/123' } }),
}));
vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    pacientesApi: { ...original.pacientesApi, get: mocks.pacienteGet },
    prontuariosApi: { ...original.prontuariosApi, list: mocks.prontuariosList, create: mocks.create, assinar: mocks.assinar },
  };
});

import { RegistroSessao } from './AtendimentoPsicologicoPage';
// R1: este teste cobre código herdado que está OCULTO por padrão (src/lib/recursos-legado.ts); liga as flags só aqui
// para o código dormente continuar testado até sair na etapa de conteúdo.
vi.mock('@/lib/recursos-legado', () => ({ RECURSOS_LEGADO: { escritaProntuarioAntigo: true, iaClinicaAntiga: true, edicaoModulosPorUsuario: true } }));


const agendamentoDe = (tipo?: string) =>
  ({
    id: 'a1', clinicaId: 'c1', pacienteId: 'p1', pacienteNome: 'Maria', medicoId: 'u1',
    dataHoraInicio: '2026-10-25T13:00:00.000Z', ...(tipo ? { tipo } : {}),
  }) as never;

const assinado = (id: string) => ({
  id, pacienteId: 'p1', tipo: 'psicoterapia', dataAtendimento: '2026-10-01T12:00:00Z',
  registroPsicologico: { motivoAtendimento: 'queixa', anotacoesLivres: 'n' },
  assinado: { medicoId: 'u1', dataAssinatura: '2026-10-01T12:00:00Z', hash: 'h' },
});

function renderizar(agendamento: never) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RegistroSessao agendamento={agendamento} open onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

const formularioCompleto = () => screen.queryByRole('textbox', { name: /motivo do atendimento/i });
const formularioSeguimento = () => screen.queryByRole('textbox', { name: /anotações da psicoterapia/i });

describe('RegistroSessao — o agendamento define o formulário', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue({ id: 'p1', nome: 'Maria' });
    mocks.prontuariosList.mockResolvedValue([]);
    mocks.create.mockResolvedValue({ id: 'r1' });
  });

  it('SESSÃO de psicoterapia abre o SEGUIMENTO, mesmo sem nenhum registro anterior (o caso real)', async () => {
    renderizar(agendamentoDe('sessao_psicoterapia'));
    expect(await screen.findByRole('textbox', { name: /anotações da psicoterapia/i })).toBeInTheDocument();
    expect(formularioCompleto()).not.toBeInTheDocument();
  });

  it('AVALIAÇÃO psicológica abre o COMPLETO, mesmo com registros anteriores assinados', async () => {
    mocks.prontuariosList.mockResolvedValue([assinado('r0')]);
    renderizar(agendamentoDe('avaliacao_psicologica'));
    expect(await screen.findByRole('textbox', { name: /motivo do atendimento/i })).toBeInTheDocument();
    expect(formularioSeguimento()).not.toBeInTheDocument();
  });

  it('agendamento sem tipo (dado antigo): cai na regra do histórico assinado', async () => {
    mocks.prontuariosList.mockResolvedValue([assinado('r0')]);
    renderizar(agendamentoDe());
    expect(await screen.findByRole('textbox', { name: /anotações da psicoterapia/i })).toBeInTheDocument();
  });

  it('há um SELETOR visível no topo, e trocar muda o formulário', async () => {
    const user = userEvent.setup();
    renderizar(agendamentoDe('sessao_psicoterapia'));
    const completo = await screen.findByRole('radio', { name: /avaliação inicial/i });
    const seguimento = screen.getByRole('radio', { name: /seguimento/i });
    expect(seguimento).toBeChecked();
    await user.click(completo);
    expect(await screen.findByRole('textbox', { name: /motivo do atendimento/i })).toBeInTheDocument();
    expect(formularioSeguimento()).not.toBeInTheDocument();
  });

  it('o payload GRAVA o formulário usado (o corrigido no seletor, não o padrão)', async () => {
    const user = userEvent.setup();
    renderizar(agendamentoDe('sessao_psicoterapia'));
    await user.click(await screen.findByRole('radio', { name: /avaliação inicial/i }));
    await user.type(await screen.findByRole('textbox', { name: /motivo do atendimento/i }), 'Queixa');
    await user.click(screen.getByRole('button', { name: /salvar rascunho/i }));
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ formulario: 'completo' });
  });

  it('seguimento: o payload diz seguimento', async () => {
    const user = userEvent.setup();
    renderizar(agendamentoDe('sessao_psicoterapia'));
    await user.type(await screen.findByRole('textbox', { name: /anotações da psicoterapia/i }), 'Notas');
    await user.click(screen.getByRole('button', { name: /salvar rascunho/i }));
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ formulario: 'seguimento' });
  });
});
