import { useAuth } from '@/auth/AuthContext';

/** Bloco de assinatura dos documentos clínicos: identifica quem emite. */
export function DocumentoAssinatura() {
  const { user } = useAuth();
  const crp = user?.registroProfissional;
  return (
    <div className="mt-16 flex flex-col items-center gap-1 text-sm" data-testid="assinatura">
      <p>_____________________________________</p>
      <p className="font-semibold">{user?.nome ?? 'Psicólogo(a) responsável'}</p>
      <p className="text-gray-600">{crp ? `Psicólogo(a) — CRP ${crp}` : 'Psicólogo(a)'}</p>
    </div>
  );
}
