import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';

// Blocos de conteúdo: string = parágrafo; string[] = lista com marcadores.
export type BlocoLegal = string | string[];
export interface SecaoLegal {
  titulo?: string;
  blocos: BlocoLegal[];
}

// Marcadores de pendência jurídica/contábil ([A CONFIRMAR: ...], [A CONFIRMAR COM
// ADVOGADO ...], [EM CONVERSÃO: ...]). O texto é mantido EXATAMENTE como escrito;
// só recebem destaque visual para não passarem despercebidos na revisão.
const MARCADOR = /(\[(?:A CONFIRMAR|EM CONVERSÃO)[^\]]*\])/g;

function comPendencias(texto: string): ReactNode {
  return texto.split(MARCADOR).map((parte, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded bg-amber-100 px-1 font-medium text-amber-900">{parte}</mark>
    ) : (
      <Fragment key={i}>{parte}</Fragment>
    ),
  );
}

export function PaginaLegal({
  titulo,
  atualizacao,
  secoes,
}: {
  titulo: string;
  atualizacao: string;
  secoes: SecaoLegal[];
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex h-16 items-center bg-brand-cobalt px-6">
        <Link to="/" aria-label="Voltar ao início">
          <Logo width={140} iconColor="#FFB800" textColor="#FFFFFF" />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="mb-2 text-3xl font-semibold">{titulo}</h1>
        <p className="mb-10 text-sm text-muted-foreground">{comPendencias(atualizacao)}</p>

        <div className="space-y-8">
          {secoes.map((s, i) => (
            <section key={s.titulo ?? i} className="space-y-3">
              {s.titulo && <h2 className="text-xl font-semibold">{s.titulo}</h2>}
              {s.blocos.map((b, j) =>
                Array.isArray(b) ? (
                  <ul key={j} className="list-disc space-y-1.5 pl-6 leading-relaxed">
                    {b.map((item) => <li key={item}>{comPendencias(item)}</li>)}
                  </ul>
                ) : (
                  <p key={j} className="leading-relaxed">{comPendencias(b)}</p>
                ),
              )}
            </section>
          ))}
        </div>

        <nav className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm">
          <Link to="/" className="font-medium text-brand-cobalt underline underline-offset-2">Voltar ao início</Link>
          <Link to="/privacidade" className="text-muted-foreground underline underline-offset-2">Política de Privacidade</Link>
          <Link to="/termos" className="text-muted-foreground underline underline-offset-2">Termos de Uso</Link>
        </nav>
      </main>
    </div>
  );
}
