export enum Papel {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MEDICO = 'MEDICO',
  ENFERMEIRO = 'ENFERMEIRO',
  ADVOGADO = 'ADVOGADO',
  PSICOLOGO = 'PSICOLOGO',
  SECRETARIA = 'SECRETARIA',
  PACIENTE = 'PACIENTE',
}

/**
 * Papeis que prestam atendimento direto (cada um vinculado a uma modalidade).
 * Usado para autorizacao em agenda, prontuario e telemedicina.
 */
export const PAPEIS_PROFISSIONAIS = [
  Papel.MEDICO,
  Papel.ENFERMEIRO,
  Papel.ADVOGADO,
  Papel.PSICOLOGO,
] as const;

export const PAPEIS_COM_2FA_OBRIGATORIO = [
  Papel.SUPER_ADMIN,
  Papel.ADMIN,
  Papel.MEDICO,
  Papel.ENFERMEIRO,
  Papel.ADVOGADO,
  Papel.PSICOLOGO,
] as const;

export function exigeTwoFactor(papel: Papel): boolean {
  return (PAPEIS_COM_2FA_OBRIGATORIO as readonly Papel[]).includes(papel);
}

export function ehProfissional(papel: Papel): boolean {
  return (PAPEIS_PROFISSIONAIS as readonly Papel[]).includes(papel);
}
