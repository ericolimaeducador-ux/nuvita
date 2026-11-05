import { useAuth } from '@/auth/AuthContext';
import { preenchido } from '@/lib/timbre';

/** Quem assina/emite: nome e COREN vêm da conta logada (user.coren), nunca de campo digitável. */
export function useEmissor() {
  const { user } = useAuth();
  const nome = preenchido(user?.nome);
  const coren = preenchido(user?.coren);
  return { nome, coren, identificacao: [nome, coren && `COREN ${coren}`].filter(Boolean).join(' — ') };
}

/**
 * Bloco de assinatura dos documentos clínicos: "<nome> — COREN <coren>". Com `emissor` (documento emitido pelo
 * servidor), usa os dados que vieram dele; sem, usa a conta logada.
 */
export function DocumentoAssinatura({ emissor }: { emissor?: { nome: string; coren?: string } }) {
  const logado = useEmissor();
  const identificacao = emissor
    ? [emissor.nome, emissor.coren && `COREN ${emissor.coren}`].filter(Boolean).join(' — ')
    : logado.identificacao;
  return (
    <div className="mt-16 flex flex-col items-center gap-1 text-sm" data-testid="assinatura">
      <p>_____________________________________</p>
      {identificacao && <p className="font-semibold">{identificacao}</p>}
    </div>
  );
}
