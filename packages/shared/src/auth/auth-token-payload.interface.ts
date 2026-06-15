import { Papel } from './papel.enum';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  papel: Papel;
  clinicaId?: string | null;
  jti: string;
  typ: 'access' | 'refresh';
}
