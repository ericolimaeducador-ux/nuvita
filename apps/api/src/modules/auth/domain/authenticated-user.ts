import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { TermosAceitos } from './user.entity';

/**
 * O que fica em `request.user` depois de `AuthService.validateAccessPayload`:
 * o payload do access token mais os campos de estado de conta que a cadeia de
 * gates pós-login precisa. Carregados do mesmo `findById` que a validação de
 * token já faz — sem round-trip extra.
 */
export type AuthenticatedUser = AuthTokenPayload & {
  deveTrocarSenha: boolean;
  termosAceitos: TermosAceitos | null;
  /** Clínica em fase de teste: o termo exigido é o Termo de Teste. */
  faseTeste: boolean;
};
