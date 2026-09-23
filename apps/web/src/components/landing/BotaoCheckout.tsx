import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

// Botão de checkout/contato que consome PRICING_LINKS. Sem link configurado
// (string vazia), fica desabilitado como "Em breve" — nunca um href="" clicável.
export function BotaoCheckout({
  href,
  children,
  variant = 'default',
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: 'default' | 'outline';
  className?: string;
}) {
  if (!href) {
    return (
      <Button variant="outline" disabled className={className} title="Em breve">
        Em breve
      </Button>
    );
  }
  return (
    <Button asChild variant={variant} className={className}>
      <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    </Button>
  );
}
