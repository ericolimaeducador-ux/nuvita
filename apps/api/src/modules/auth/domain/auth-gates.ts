import { Papel } from '../../../../../../packages/shared/src/auth';
import { versaoTermosExigida } from '../../../../../../packages/shared/src/termos';
import { TermosAceitos } from './user.entity';

/** Subconjunto de AuthenticatedUser que o predicado da cadeia de gates avalia. */
export interface GateAvaliavel {
  papel: Papel;
  deveTrocarSenha?: boolean;
  termosAceitos?: TermosAceitos | null;
  /** Clínica em fase de teste: o termo exigido é o Termo de Teste. */
  faseTeste?: boolean;
}

/**
 * `true` quando há algum gate pós-login pendente para este usuário.
 *
 * O frontend decide QUAL tela mostrar (ordem definida: termos → senha); o
 * backend (AuthGatesGuard) só precisa saber que HÁ um gate pendente para
 * barrar toda rota não marcada com @GateExempt().
 *
 * ⚠️ SINCRONIA MANUAL com `gateAtivo()` do web
 * (apps/web/src/auth/GateChain.tsx): a CONDIÇÃO de cada gate e a ORDEM entre
 * eles precisam bater nos dois. Não há teste automatizado que pegue os dois
 * divergindo. Ao mexer num, mexer no outro.
 *
 * Gates:
 * - troca de senha obrigatória: `deveTrocarSenha === true`, qualquer papel
 *   (feature-forced-password-change)
 * - aceite dos Termos de Uso: ENFERMEIRO e ADMIN, quando a versão aceita
 *   difere da vigente — inclui "nunca aceitou"
 *   (feature-terms-of-service-acceptance, amendment 2026-09-10: escopo
 *   estendido de "só ENFERMEIRO" para "ENFERMEIRO e ADMIN"). A versão exigida é
 *   a do Termo de Teste quando `faseTeste` (teste beta, 2026-10-15) e a dos
 *   Termos de Uso fora dela — ver versaoTermosExigida().
 */
export function gatePendente(user: GateAvaliavel): boolean {
  if (user.deveTrocarSenha === true) {
    return true;
  }

  if (user.papel === Papel.ENFERMEIRO || user.papel === Papel.ADMIN) {
    return user.termosAceitos?.versao !== versaoTermosExigida(user.faseTeste);
  }

  return false;
}
