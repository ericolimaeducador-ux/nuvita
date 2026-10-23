import { useAuth } from '@/auth/AuthContext';
import { preenchido } from '@/lib/timbre';

/** Quem assina/emite: nome e CRP vêm da conta logada (user.crp), nunca de campo digitável. */
export function useEmissor() {
  const { user } = useAuth();
  const nome = preenchido(user?.nome);
  const crp = preenchido(user?.crp);
  return { nome, crp, identificacao: [nome, crp && `CRP ${crp}`].filter(Boolean).join(' — ') };
}

/**
 * Bloco de assinatura dos documentos clínicos: "<nome> — CRP <crp>". Com `emissor` (documento emitido pelo
 * servidor), usa os dados que vieram dele; sem, usa a conta logada.
 */
export function DocumentoAssinatura({ emissor }: { emissor?: { nome: string; crp?: string } }) {
  const logado = useEmissor();
  const identificacao = emissor
    ? [emissor.nome, emissor.crp && `CRP ${emissor.crp}`].filter(Boolean).join(' — ')
    : logado.identificacao;
  return (
    <div className="mt-16 flex flex-col items-center gap-1 text-sm" data-testid="assinatura">
      <p>_____________________________________</p>
      {identificacao && <p className="font-semibold">{identificacao}</p>}
    </div>
  );
}
