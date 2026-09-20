import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  titulo: string;
  descricao: string;
  /** Bloco de destaque opcional (diferencial da especialidade). */
  destaque?: ReactNode;
  cta: string;
  onCta: () => void;
  ilustracao: ReactNode;
  /** true: ilustração à esquerda no desktop. */
  invertido?: boolean;
  /** Classes da seção (fundo). */
  fundo: string;
  /** Classes da moldura da ilustração (fundo e formato do painel). */
  painel: string;
}

// Seção de largura total: texto de um lado, painel ilustrado do outro, alternando o lado.
export function SecaoEspecialidade({ titulo, descricao, destaque, cta, onCta, ilustracao, invertido, fundo, painel }: Props) {
  return (
    <section className={cn('px-6 py-24', fundo)}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className={cn(invertido && 'lg:order-2')}>
          <h2 className="font-display text-4xl font-medium leading-tight text-petroleo sm:text-5xl">{titulo}</h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">{descricao}</p>
          {destaque}
          <button
            type="button"
            onClick={onCta}
            className="mt-9 inline-flex h-11 items-center justify-center rounded-md bg-petroleo px-7 text-sm font-semibold text-quente transition-colors hover:bg-petroleo-medio focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petroleo-medio focus-visible:ring-offset-2"
          >
            {cta}
          </button>
        </div>
        <div className={cn('flex aspect-[4/3] items-center justify-center overflow-hidden p-6', painel, invertido && 'lg:order-1')}>
          {ilustracao}
        </div>
      </div>
    </section>
  );
}
