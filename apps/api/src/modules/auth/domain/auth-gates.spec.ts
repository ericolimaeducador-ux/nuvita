import { Papel } from '../../../../../../packages/shared/src/auth';
import {
  TERMO_DE_TESTE_VERSAO_ATUAL,
  TERMOS_DE_USO_VERSAO_ATUAL,
} from '../../../../../../packages/shared/src/termos';
import { gatePendente } from './auth-gates';

describe('gatePendente — predicado da cadeia de gates pós-login (Fase 2b)', () => {
  it('deveTrocarSenha=true => gate pendente, independente do papel', () => {
    expect(gatePendente({ papel: Papel.SECRETARIA, deveTrocarSenha: true })).toBe(true);
    expect(gatePendente({ papel: Papel.ENFERMEIRO, deveTrocarSenha: true })).toBe(true);
    expect(gatePendente({ papel: Papel.SUPER_ADMIN, deveTrocarSenha: true })).toBe(true);
  });

  it('ENFERMEIRO sem termosAceitos => gate pendente', () => {
    expect(gatePendente({ papel: Papel.ENFERMEIRO, termosAceitos: null })).toBe(true);
    expect(gatePendente({ papel: Papel.ENFERMEIRO })).toBe(true);
  });

  it('ADMIN sem termosAceitos => gate pendente (amendment 2026-09-10)', () => {
    expect(gatePendente({ papel: Papel.ADMIN, termosAceitos: null })).toBe(true);
    expect(gatePendente({ papel: Papel.ADMIN })).toBe(true);
  });

  it('ENFERMEIRO com versão de termo defasada => gate pendente', () => {
    expect(
      gatePendente({
        papel: Papel.ENFERMEIRO,
        termosAceitos: { versao: '0.9', dataAceite: new Date('2026-01-01') },
      }),
    ).toBe(true);
  });

  it('ADMIN com versão de termo defasada => gate pendente', () => {
    expect(
      gatePendente({
        papel: Papel.ADMIN,
        termosAceitos: { versao: '0.9', dataAceite: new Date('2026-01-01') },
      }),
    ).toBe(true);
  });

  it('ENFERMEIRO com a versão atual aceita => nenhum gate pendente', () => {
    expect(
      gatePendente({
        papel: Papel.ENFERMEIRO,
        deveTrocarSenha: false,
        termosAceitos: { versao: TERMOS_DE_USO_VERSAO_ATUAL, dataAceite: new Date() },
      }),
    ).toBe(false);
  });

  it('ADMIN com a versão atual aceita => nenhum gate pendente', () => {
    expect(
      gatePendente({
        papel: Papel.ADMIN,
        deveTrocarSenha: false,
        termosAceitos: { versao: TERMOS_DE_USO_VERSAO_ATUAL, dataAceite: new Date() },
      }),
    ).toBe(false);
  });

  it('o gate de termos é para ENFERMEIRO e ADMIN — SECRETARIA e PACIENTE nunca são barrados por termo (amendment 2026-09-10)', () => {
    expect(gatePendente({ papel: Papel.SECRETARIA, termosAceitos: null })).toBe(false);
    expect(gatePendente({ papel: Papel.PACIENTE, termosAceitos: null })).toBe(false);
  });

  it('conta comum sem nada pendente => false', () => {
    expect(
      gatePendente({ papel: Papel.SECRETARIA, deveTrocarSenha: false, termosAceitos: null }),
    ).toBe(false);
  });
});

describe('gatePendente — clínica em fase de teste exige o Termo de Teste (C3, 2026-10-15)', () => {
  const aceite = (versao: string) => ({ versao, dataAceite: new Date('2026-10-30T12:00:00Z') });

  it('faseTeste + Termo de Teste aceito => nenhum gate', () => {
    expect(
      gatePendente({ papel: Papel.ADMIN, faseTeste: true, termosAceitos: aceite(TERMO_DE_TESTE_VERSAO_ATUAL) }),
    ).toBe(false);
  });

  it('faseTeste + só os Termos de Uso aceitos => gate pendente (precisa aceitar o Termo de Teste)', () => {
    expect(
      gatePendente({ papel: Papel.ENFERMEIRO, faseTeste: true, termosAceitos: aceite(TERMOS_DE_USO_VERSAO_ATUAL) }),
    ).toBe(true);
  });

  it('saiu da fase de teste com o Termo de Teste aceito => gate pendente (aceitar os Termos de Uso no lançamento)', () => {
    expect(
      gatePendente({ papel: Papel.ENFERMEIRO, faseTeste: false, termosAceitos: aceite(TERMO_DE_TESTE_VERSAO_ATUAL) }),
    ).toBe(true);
  });

  it('faseTeste ausente = fora do teste (usuários antigos seguem nos Termos de Uso)', () => {
    expect(
      gatePendente({ papel: Papel.ADMIN, termosAceitos: aceite(TERMOS_DE_USO_VERSAO_ATUAL) }),
    ).toBe(false);
  });
});
