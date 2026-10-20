import { useAuth } from '@/auth/AuthContext';
import { preenchido } from '@/lib/timbre';

/** Quem assina/emite: nome e CRP vêm da conta logada (user.crp), nunca de campo digitável. */
export function useEmissor() {
  const { user } = useAuth();
  const nome = preenchido(user?.nome);
  const crp = preenchido(user?.crp);
  return { nome, crp, identificacao: [nome, crp && `CRP ${crp}`].filter(Boolean).join(' — ') };
}

/** Bloco de assinatura dos documentos clínicos: "<nome> — CRP <crp>". */
export function DocumentoAssinatura() {
  const { identificacao } = useEmissor();
  return (
    <div className="mt-16 flex flex-col items-center gap-1 text-sm" data-testid="assinatura">
      <p>_____________________________________</p>
      {identificacao && <p className="font-semibold">{identificacao}</p>}
    </div>
  );
}
