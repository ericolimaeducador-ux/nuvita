import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { versaoTermosExigida } from '@/legal/termos';
import { Papel, type AuthUser } from '@/types';

export const ROTA_ACEITAR_TERMOS = '/aceitar-termos';
export const ROTA_DEFINIR_SENHA = '/definir-senha';

const ROTAS_DE_GATE = [ROTA_ACEITAR_TERMOS, ROTA_DEFINIR_SENHA];

/**
 * Camada de UX da cadeia de gates pós-login (a garantia real é o
 * AuthGatesGuard no backend — ver §2.6/§9 do TDD). Ordem fixa: termos → senha.
 *
 * ⚠️ SINCRONIA MANUAL com `gatePendente()` do backend
 * (apps/api/src/modules/auth/domain/auth-gates.ts): a CONDIÇÃO de cada gate e a
 * ORDEM entre eles precisam bater com os dois. Não há teste automatizado que
 * pegue os dois divergindo — o web espelha `packages/shared` à mão (como
 * `Papel`), não importa. Ao mexer num, mexer no outro.
 */
export function gateAtivo(user: AuthUser | null): string | null {
  if (!user) return null;

  const termosDefasados =
    (user.papel === Papel.PSICOLOGO || user.papel === Papel.ADMIN) &&
    user.termosAceitos?.versao !== versaoTermosExigida(user.faseTeste);
  if (termosDefasados) return ROTA_ACEITAR_TERMOS;

  if (user.deveTrocarSenha) return ROTA_DEFINIR_SENHA;

  return null;
}

/**
 * Roda depois do ProtectedRoute (já garante token+user) e antes de qualquer
 * rota de feature. Enquanto houver gate pendente, só a tela daquele gate
 * (e o logout) é alcançável — inclusive contra navegação direta por URL.
 */
export function GateChain() {
  const { user } = useAuth();
  const location = useLocation();

  const rotaGate = gateAtivo(user);
  const emRotaDeGate = ROTAS_DE_GATE.includes(location.pathname);

  // Há gate pendente e o usuário não está na tela certa → manda pra ela.
  if (rotaGate && location.pathname !== rotaGate) {
    return <Navigate to={rotaGate} replace />;
  }

  // Nenhum gate pendente, mas o usuário está parado numa tela de gate → libera.
  if (!rotaGate && emRotaDeGate) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
