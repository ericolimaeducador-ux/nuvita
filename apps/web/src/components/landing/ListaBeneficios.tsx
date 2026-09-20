import { Check } from 'lucide-react';

export function ListaBeneficios({ itens }: { itens: string[] }) {
  return (
    <ul className="space-y-2.5 text-sm text-foreground">
      {itens.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
