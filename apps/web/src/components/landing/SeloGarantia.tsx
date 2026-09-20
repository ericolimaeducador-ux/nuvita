import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

// Contraste: emerald-900 sobre emerald-100 (~9:1).
export function SeloGarantia({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-start gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold leading-snug text-emerald-900">
      <ShieldCheck className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}
