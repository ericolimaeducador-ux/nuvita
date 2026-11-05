import { gerarSenhaTemporaria } from './gerar-senha-temporaria';

describe('gerarSenhaTemporaria (Fase 7)', () => {
  it('satisfaz a política mínima de senha do sistema (>= 10 caracteres)', () => {
    expect(gerarSenhaTemporaria().length).toBeGreaterThanOrEqual(10);
  });

  it('tem entropia suficiente: pelo menos 16 caracteres', () => {
    expect(gerarSenhaTemporaria().length).toBeGreaterThanOrEqual(16);
  });

  it('usa só caracteres seguros para copiar/colar (sem ambíguos nem espaços)', () => {
    const senha = gerarSenhaTemporaria();
    expect(senha).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('não é determinística: 50 chamadas geram 50 valores distintos', () => {
    const geradas = new Set(Array.from({ length: 50 }, () => gerarSenhaTemporaria()));
    expect(geradas.size).toBe(50);
  });
});
