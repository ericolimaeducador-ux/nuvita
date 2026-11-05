import { describe, expect, it } from 'vitest';
import { isMenorDeIdade } from '@/paciente-idade';
import { pacienteSchema } from './PacientesPage';

// Espelho do servidor: CPF com dígito verificador válido e nascimento que não seja futuro.
const base = { nome: 'Paciente Fictício', dataNascimento: '1990-04-12', classificacoes: ['IU'] };
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

describe('pacienteSchema — classificação de área', () => {
  it.each([[['IU']], [['FA']], [['OT']], [['IU', 'FA', 'OT']]])('%j: aceita', (classificacoes) => {
    expect(pacienteSchema.safeParse({ ...base, classificacoes }).success).toBe(true);
  });
  it('ausente ou vazia: recusada em classificacoes (ao menos uma é obrigatória no cadastro)', () => {
    const { classificacoes: _omitida, ...semCampo } = base;
    expect(campos(pacienteSchema.safeParse(semCampo))).toContain('classificacoes');
    expect(campos(pacienteSchema.safeParse({ ...base, classificacoes: [] }))).toContain('classificacoes');
  });
  it('valor fora de IU/FA/OT: recusado', () => {
    expect(campos(pacienteSchema.safeParse({ ...base, classificacoes: ['XX'] }))).toContain('classificacoes.0');
  });
});

describe('isMenorDeIdade (espelho web) — nascimento no futuro', () => {
  it('é indeterminado, não menor', () => {
    expect(isMenorDeIdade(new Date('2026-10-13'), new Date('2026-06-14T12:00:00Z'))).toBe('indeterminado');
  });
});
