// Faixa compacta antes do rodapé: leva à primeira seção de preços.
export function CtaFinal({ onVerPlanos }: { onVerPlanos: () => void }) {
  return (
    <section aria-label="Chamada final" className="border-b border-sage/20 bg-petroleo px-6 py-16 text-quente">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-3xl font-medium leading-tight sm:text-4xl">Pronto para começar?</h2>
          <p className="mt-2 text-quente/75">Escolha seu plano e receba o acesso em até 24h úteis.</p>
        </div>
        <button
          type="button"
          onClick={onVerPlanos}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-ouro px-8 text-sm font-semibold text-ink transition-colors hover:bg-[#d6b170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quente focus-visible:ring-offset-2 focus-visible:ring-offset-petroleo"
        >
          Ver planos
        </button>
      </div>
    </section>
  );
}
