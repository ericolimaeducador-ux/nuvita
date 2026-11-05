import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const mocks = vi.hoisted(() => ({ listarAnexos: vi.fn(), enviarAnexo: vi.fn(), urlAnexo: vi.fn() }));

vi.mock('@/api/resources', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/resources')>();
  return { ...original, consultasApi: { ...original.consultasApi, ...mocks } };
});

import { ModulosAvaliacao, type ModuloForm } from './ModulosAvaliacao';

let ultimo: ModuloForm[] = [];
function Harness({ inicial = [], classificacoes = ['IU'], editavel = true }: { inicial?: ModuloForm[]; classificacoes?: string[]; editavel?: boolean }) {
  const [m, setM] = useState<ModuloForm[]>(inicial);
  ultimo = m;
  return <ModulosAvaliacao consultaId="c1" modulos={m} onChange={(x) => { ultimo = x; setM(x); }} editavel={editavel} classificacoes={classificacoes} />;
}

function montar(props: Parameters<typeof Harness>[0] = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><Harness {...props} /></QueryClientProvider>);
}

describe('ModulosAvaliacao (5b)', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.listarAnexos.mockResolvedValue([]);
  });

  it('"Adicionar módulo" oferece só os módulos da classificação do paciente (IU -> urinária e anal)', async () => {
    const user = userEvent.setup();
    montar({ classificacoes: ['IU'] });
    await user.click(screen.getByRole('button', { name: /Adicionar módulo/ }));
    const grupo = screen.getByRole('group', { name: 'Módulos disponíveis' });
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual(['Incontinência urinária', 'Incontinência anal']);
  });

  it('paciente FA/OT: nenhum módulo disponível (sem botão de adicionar)', () => {
    montar({ classificacoes: ['FA', 'OT'] });
    expect(screen.queryByRole('button', { name: /Adicionar módulo/ })).not.toBeInTheDocument();
    expect(screen.getByText('Nenhum módulo de avaliação disponível para a classificação deste paciente.')).toBeInTheDocument();
  });

  it('IU: avisos fixos do toque, do RPM e da urodinâmica; MISTA pede o predominante; teste do absorvente recolhido', async () => {
    const user = userEvent.setup();
    montar({ inicial: [{ area: 'IU' as ModuloForm['area'], dados: {} }] });

    expect(screen.getAllByText('Competência do enfermeiro para este exame não verificada — confirme a base legal')).toHaveLength(2);
    expect(screen.getByText('Ultrassom (bladder scan) é preferível ao cateterismo.')).toBeInTheDocument();
    expect(screen.getByText(/EAU 2026: medir em todo paciente/)).toBeInTheDocument();
    expect(screen.getByText('Não é exame de avaliação inicial; é critério de encaminhamento.')).toBeInTheDocument();
    expect(screen.queryByText(/NICE NG123 veda o uso de rotina/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Classificação inicial' }));
    await user.click(await screen.findByRole('option', { name: 'Mista' }));
    expect(screen.getByRole('combobox', { name: 'Sintoma predominante *' })).toBeInTheDocument();
    expect(ultimo[0].dados).toMatchObject({ classificacaoInicial: { tipo: 'MISTA' } });

    await user.click(screen.getByRole('button', { name: /Mostrar teste do absorvente/ }));
    expect(screen.getByText('Não é etapa padrão da avaliação (NICE NG123 veda o uso de rotina).')).toBeInTheDocument();
  });

  it('IU: diário miccional com menos de 3 dias mostra o alerta (não bloqueia)', () => {
    montar({ inicial: [{ area: 'IU' as ModuloForm['area'], dados: { diarioMiccional: { dataInicio: '2026-11-01', dataFim: '2026-11-02' } } }] });
    expect(screen.getByText('O diário miccional deve cobrir no mínimo 3 dias.')).toBeInTheDocument();
  });

  it('Incontinência anal: aviso de sinal de alarme; diário intestinal sem alerta de período; sem nenhuma escala', async () => {
    const user = userEvent.setup();
    montar({ inicial: [{ area: 'INCONTINENCIA_ANAL' as ModuloForm['area'], dados: { diarioIntestinal: { dataInicio: '2026-11-01', dataFim: '2026-11-01' } } }] });
    expect(screen.queryByText(/mínimo 3 dias/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bristol/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Sinal de alarme registrado — avalie encaminhamento.')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Sangramento'));
    expect(screen.getByText('Sinal de alarme registrado — avalie encaminhamento.')).toBeInTheDocument();
    expect(ultimo[0].dados).toMatchObject({ sinaisAlarme: ['SANGRAMENTO'] });
    expect(screen.getByText('Competência do enfermeiro para este exame não verificada — confirme a base legal')).toBeInTheDocument();
  });

  it('upload do diário: envia o arquivo e vincula o id do anexo ao diário', async () => {
    const user = userEvent.setup();
    mocks.enviarAnexo.mockResolvedValue({ id: '65f0000000000000000a0001', consultaId: 'c1', mimeType: 'image/png', tamanho: 2048, enviadoPor: 'e', confirmadoEm: '2026-11-05T00:00:00Z', criadoEm: '2026-11-05T00:00:00Z' });
    montar({ inicial: [{ area: 'IU' as ModuloForm['area'], dados: {} }] });

    const arquivo = new File(['x'], 'diario.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Enviar anexo: Diário miccional'), arquivo);

    await waitFor(() => expect(mocks.enviarAnexo).toHaveBeenCalledWith('c1', arquivo));
    await waitFor(() => expect(ultimo[0].dados).toMatchObject({ diarioMiccional: { anexos: ['65f0000000000000000a0001'] } }));
  });

  it('somente leitura (consulta assinada): sem adicionar/remover módulo nem enviar anexo', () => {
    montar({ editavel: false, inicial: [{ area: 'IU' as ModuloForm['area'], dados: { anamnese: { sintomas: 'perdas' } } }] });
    expect(screen.queryByRole('button', { name: /Adicionar módulo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover módulo/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Enviar anexo: Diário miccional')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Sintomas')).toHaveAttribute('readonly');
  });
});
