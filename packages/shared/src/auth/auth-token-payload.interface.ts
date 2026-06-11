import { Papel } from './papel.enum';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  papel: Papel;
  clinicaId?: string;
  jti: string;
  typ: 'access' | 'refresh';
}
