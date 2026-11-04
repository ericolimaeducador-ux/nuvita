import { describe, expect, it } from 'vitest';
import { isMenorDeIdade } from '@/paciente-idade';
import { pacienteSchema } from './PacientesPage';

// Espelho do servidor: CPF com dígito verificador válido e nascimento que não seja futuro.
const base = { nome: 'Paciente Fictício', dataNascimento: '1990-04-12' };
const campos = (r: ReturnType<typeof pacienteSchema.safeParse>) => (r.success ? [] : r.error.issues.map((i) => i.path.join('.')));

describe('pacienteSchema — CPF e nascimento', () => {
  it('CPF válido: aceito; sem CPF: aceito', () => {
    expect(pacienteSchema.safeParse({ ...base, cpf: '390.533.447-05' }).success).toBe(true);
    expect(pacienteSchema.safeParse({ ...base, cpf: '' }).success).toBe(true);
    expect(pacienteSchema.safeParse(base).success).toBe(true);
  });
  it('555.444.333-12 (dígito verificador errado): recusado em cpf', () => {
    expect(campos(pacienteSchema.safeParse({ ...base, cpf: '555.444.333-12' }))).toContain('cpf');
  });
  it('nascimento futuro: recusado em dataNascimento', () => {
    const futuro = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    expect(campos(pacienteSchema.safeParse({ ...base, dataNascimento: futuro }))).toContain('dataNascimento');
  });
});

describe('isMenorDeIdade (espelho web) — nascimento no futuro', () => {
  it('é indeterminado, não menor', () => {
    expect(isMenorDeIdade(new Date('2026-10-13'), new Date('2026-06-14T12:00:00Z'))).toBe('indeterminado');
  });
});
