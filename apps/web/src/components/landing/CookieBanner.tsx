import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// Banner fixo no rodapé (só na landing "/"). A escolha é persistida por
// useConsentimentoCookies; o GA só carrega após "Aceitar".
export function CookieBanner({ onAceitar, onRecusar }: { onAceitar: () => void; onRecusar: () => void }) {
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-card px-4 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm text-foreground">
          Usamos cookies para entender como você usa nosso site e melhorar sua experiência. Ao continuar, você
          concorda com nossa{' '}
          <Link to="/privacidade" className="font-medium text-brand-cobalt underline underline-offset-2">
            Política de Privacidade
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={onRecusar}>Recusar</Button>
          <Button size="sm" onClick={onAceitar}>Aceitar</Button>
        </div>
      </div>
    </div>
  );
}
