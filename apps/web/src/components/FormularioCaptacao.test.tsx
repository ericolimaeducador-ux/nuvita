import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormularioCaptacao, type CaptacaoFormValues } from './FormularioCaptacao';

const valores: CaptacaoFormValues = {
  nome: '', cpf: '', dataNascimento: '', endereco: '', telefone: '', email: '', codigoEnfermeiro: 'ENF-00126',
} as CaptacaoFormValues;

describe('R1.8 — FormularioCaptacao', () => {
  it('campo CPF opcional orienta a deixar em branco quando não se sabe', () => {
    render(<FormularioCaptacao values={valores} onChange={vi.fn()} onSubmit={vi.fn()} carregando={false} />);
    expect(screen.getByLabelText('CPF (opcional)')).toHaveAttribute('placeholder', 'Deixe em branco se não souber');
  });
});
