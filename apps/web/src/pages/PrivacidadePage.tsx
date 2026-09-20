import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';

// TODO(jurídico): substituir pelo texto legal completo da Política de
// Privacidade (controlador, finalidades, bases legais da LGPD, cookies,
// direitos do titular, contato do encarregado). Nenhuma cláusula foi inventada.
export function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center bg-brand-cobalt px-6">
        <Link to="/" aria-label="Voltar ao início">
          <Logo width={140} iconColor="#FFB800" textColor="#FFFFFF" />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-4 text-3xl font-semibold">Política de Privacidade</h1>
        <p className="text-muted-foreground">O texto completo desta política está em elaboração.</p>
        <Link to="/" className="mt-8 inline-block font-medium text-brand-cobalt underline underline-offset-2">
          Voltar ao início
        </Link>
      </main>
    </div>
  );
}
