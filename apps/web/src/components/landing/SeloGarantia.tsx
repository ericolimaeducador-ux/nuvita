import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

export function SeloGarantia({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-start gap-1.5 rounded-md bg-petroleo-medio/10 px-3 py-1.5 text-xs font-semibold leading-snug text-petroleo">
      <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-petroleo-medio" aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}
