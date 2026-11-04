import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// CRP carimbado pelo servidor: no formulário ele é SÓ LEITURA (valor do perfil) e nunca vai no payload;
// sem CRP no perfil, "Salvar e assinar" é bloqueado, "Salvar rascunho" continua permitido.
const mocks = vi.hoisted(() => ({
  user: { current: {} as Record<string, unknown> },
  pacienteGet: vi.fn(),
  prontuariosList: vi.fn(),
  create: vi.fn(),
  assinar: vi.fn(),
}));

vi.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ user: mocks.user.current }) }));
vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return {
    ...original,
    pacientesApi: { ...original.pacientesApi, get: mocks.pacienteGet },
    prontuariosApi: { ...original.prontuariosApi, list: mocks.prontuariosList, create: mocks.create, assinar: mocks.assinar },
  };
});

import { RegistroSessao } from './AtendimentoPsicologicoPage';

const agendamento = { id: 'a1', clinicaId: 'c1', pacienteId: 'p1', pacienteNome: 'Maria', medicoId: 'u1', dataHoraInicio: '2026-10-05T14:00:00.000Z' } as never;

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RegistroSessao agendamento={agendamento} open onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

async function preencherMotivo() {
  const user = userEvent.setup();
  await user.type(await screen.findByRole('textbox', { name: /motivo do atendimento/i }), 'Queixa de teste');
  return user;
}

describe('RegistroSessao — CRP vem do perfil, não do formulário', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pacienteGet.mockResolvedValue({ id: 'p1', nome: 'Maria' });
    mocks.prontuariosList.mockResolvedValue([]);
    mocks.create.mockResolvedValue({ id: 'r1' });
    mocks.assinar.mockResolvedValue({});
  });

  it('mostra o CRP do PERFIL, somente leitura; o número de conselho do cadastro (registroProfissional) não entra', async () => {
    mocks.user.current = { id: 'u1', clinicaId: 'c1', papel: 'PSICOLOGO', nome: 'Psi', crp: 'CRP 06/12345', registroProfissional: '0152482' };
    renderizar();
    const campo = await screen.findByLabelText(/CRP do psicólogo responsável/i);
    expect(campo).toHaveValue('CRP 06/12345');
    expect(campo).toHaveAttribute('readonly');
    expect(screen.queryByDisplayValue('0152482')).not.toBeInTheDocument();
  });

  it('o payload NÃO carrega "crp"', async () => {
    mocks.user.current = { id: 'u1', clinicaId: 'c1', papel: 'PSICOLOGO', nome: 'Psi', crp: 'CRP 06/12345' };
    renderizar();
    const user = await preencherMotivo();
    await user.click(screen.getByRole('button', { name: /salvar rascunho/i }));
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalled());
    const registro = mocks.create.mock.calls[0][0].registroPsicologico as Record<string, unknown>;
    expect(registro).not.toHaveProperty('crp');
    expect(registro['motivoAtendimento']).toBe('Queixa de teste');
  });

  it('sem CRP no perfil: "Salvar e assinar" não cria nem assina, e explica; o rascunho continua permitido', async () => {
    mocks.user.current = { id: 'u1', clinicaId: 'c1', papel: 'PSICOLOGO', nome: 'Psi', registroProfissional: '0152482' };
    renderizar();
    const user = await preencherMotivo();

    // A explicação fica na tela (junto do campo), e o botão de assinar fica indisponível.
    expect(await screen.findByText(/informe o CRP no seu perfil para assinar/i)).toBeInTheDocument();
    const assinar = screen.getByRole('button', { name: /salvar e assinar/i });
    expect(assinar).toBeDisabled();
    await user.click(assinar);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.assinar).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /salvar rascunho/i }));
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.assinar).not.toHaveBeenCalled();
  });
});
