import { Papel } from './papel.enum';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  papel: Papel;
  clinicaId?: string | null;
  /** Nome do usuário — usado p/ atribuir autoria em documentos (ex.: ficha de avaliação). */
  nome?: string;
  /** Registro do conselho profissional (CRM/COREN/OAB) — evita redigitar em cada documento. */
  registroProfissional?: string;
  jti: string;
  typ: 'access' | 'refresh';
}
