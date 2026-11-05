import { describe, expect, it } from 'vitest';
import { documentoRotulado } from './timbre';
import { rotuloDocumentoClinica } from './documentoClinica';

// Condição (a) do sentinela, lado tela: documento vazio vira "pendente"/some do timbre; o prefixo nunca aparece.
describe('documento da clínica sem valor', () => {
  it('lista do super-admin: "Documento pendente"', () => {
    expect(rotuloDocumentoClinica('CPF', '')).toBe('Documento pendente');
    expect(rotuloDocumentoClinica('CNPJ', undefined)).toBe('Documento pendente');
  });
  it('lista do super-admin: documento informado sai formatado', () => {
    expect(rotuloDocumentoClinica('CPF', '52998224725')).toBe('529.982.247-25');
  });
  it('timbre dos documentos: sem documento, a linha some (nunca "CPF: " vazio)', () => {
    expect(documentoRotulado({ documento: '', tipoDocumento: 'CPF' })).toBeUndefined();
  });
});
