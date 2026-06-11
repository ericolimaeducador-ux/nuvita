export enum Papel {
  ADMIN = 'ADMIN',
  MEDICO = 'MEDICO',
  SECRETARIA = 'SECRETARIA',
  PACIENTE = 'PACIENTE',
}

export const PAPEIS_COM_2FA_OBRIGATORIO = [Papel.ADMIN, Papel.MEDICO] as const;

export function exigeTwoFactor(papel: Papel): boolean {
  return (PAPEIS_COM_2FA_OBRIGATORIO as readonly Papel[]).includes(papel);
}
