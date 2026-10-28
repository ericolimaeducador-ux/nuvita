import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Papel } from '@/types';

// A psicóloga de um consultório sem CPF/CNPJ informado não vê o documento: o gate pede o dado, confirma e grava UMA vez.
// Outros papéis passam direto (o servidor bloqueia declaração e atestado com 422).
const mocks = vi.hoisted(() => ({ auth: vi.fn(), minha: vi.fn(), preencher: vi.fn() }));
vi.mock('@/auth/AuthContext', () => ({ useAuth: () => mocks.auth() }));
vi.mock('@/lib/useClinicaMinha', () => ({ useClinicaMinha: () => mocks.minha() }));
vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, clinicasApi: { ...original.clinicasApi, preencherDocumento: mocks.preencher } };
});

import { GateDocumentoConsultorio } from './GateDocumentoConsultorio';

const usuario = (papel: Papel) => ({ user: { id: 'u1', clinicaId: 'c1', papel, nome: 'Psi' } });
const minha = (documento: string) => ({ isLoading: false, isError: false, data: { nome: 'Clínica', documento, tipoDocumento: 'CPF' } });
function renderizar() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <GateDocumentoConsultorio><p>DOCUMENTO LIBERADO</p></GateDocumentoConsultorio>
    </QueryClientProvider>,
  );
}

describe('GateDocumentoConsultorio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockReturnValue(usuario(Papel.PSICOLOGO));
    mocks.minha.mockReturnValue(minha(''));
    mocks.preencher.mockResolvedValue({});
  });

  it('psicóloga sem documento na clínica: pede o CPF/CNPJ e não mostra o documento', () => {
    renderizar();
    expect(screen.getByText(/Informe o CPF ou CNPJ do consultório/i)).toBeInTheDocument();
    expect(screen.queryByText('DOCUMENTO LIBERADO')).not.toBeInTheDocument();
  });

  it('documento inválido: avisa e não pede confirmação', async () => {
    const u = userEvent.setup();
    renderizar();
    await u.type(screen.getByLabelText(/CPF ou CNPJ/i), '555.444.333-12');
    await u.click(screen.getByRole('button', { name: /continuar/i }));
    expect(await screen.findByText(/CPF inválido/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirmar e salvar/i })).not.toBeInTheDocument();
  });

  it('documento válido: mostra a confirmação (gravado uma vez) e só grava depois de confirmar', async () => {
    const u = userEvent.setup();
    renderizar();
    await u.type(screen.getByLabelText(/CPF ou CNPJ/i), '52998224725');
    await u.click(screen.getByRole('button', { name: /continuar/i }));
    expect(await screen.findByText(/529\.982\.247-25/)).toBeInTheDocument();
    expect(screen.getByText(/uma única vez/i)).toBeInTheDocument();
    expect(mocks.preencher).not.toHaveBeenCalled();
    await u.click(screen.getByRole('button', { name: /confirmar e salvar/i }));
    await waitFor(() => expect(mocks.preencher).toHaveBeenCalledWith({ tipoDocumento: 'CPF', documento: '529.982.247-25' }));
  });

  it('voltar da confirmação não grava nada', async () => {
    const u = userEvent.setup();
    renderizar();
    await u.type(screen.getByLabelText(/CPF ou CNPJ/i), '52998224725');
    await u.click(screen.getByRole('button', { name: /continuar/i }));
    await u.click(await screen.findByRole('button', { name: /voltar/i }));
    expect(mocks.preencher).not.toHaveBeenCalled();
  });

  it('clínica com documento: libera o documento', () => {
    mocks.minha.mockReturnValue(minha('52998224725'));
    renderizar();
    expect(screen.getByText('DOCUMENTO LIBERADO')).toBeInTheDocument();
  });

  it('outros papéis (secretária) passam direto, mesmo sem documento', () => {
    mocks.auth.mockReturnValue(usuario(Papel.SECRETARIA));
    renderizar();
    expect(screen.getByText('DOCUMENTO LIBERADO')).toBeInTheDocument();
  });
});
