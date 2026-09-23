const passos = [
  { titulo: 'Escolha seu plano', texto: 'Compare os planos da sua especialidade e selecione o que cabe no seu consultório.' },
  { titulo: 'Pague com Pix, débito ou cartão parcelado', texto: 'À vista no Pix ou débito, ou em até 12x sem juros no cartão.' },
  { titulo: 'Receba seu acesso em até 24h úteis', texto: 'Após a confirmação do pagamento, liberamos o seu acesso.' },
  { titulo: 'Comece a usar — com 14 dias de garantia', texto: 'Se não for o que esperava, devolvemos 100% do valor dentro do prazo.' },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="scroll-mt-16 bg-petroleo-medio px-6 py-24 text-quente">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-xl font-display text-4xl font-medium leading-tight sm:text-5xl">Como funciona</h2>
        <p className="mt-3 max-w-md text-quente/75">Do plano ao primeiro atendimento, em quatro passos.</p>

        {/* Mobile: linha vertical à esquerda. Desktop: linha horizontal atravessando os marcadores. */}
        <ol className="relative mt-14 grid gap-10 lg:grid-cols-4 lg:gap-8">
          <span
            aria-hidden="true"
            className="absolute bottom-2 left-[19px] top-2 w-px bg-sage/50 lg:bottom-auto lg:left-5 lg:right-5 lg:top-[19px] lg:h-px lg:w-auto"
          />
          {passos.map((p, i) => (
            <li key={p.titulo} className="relative flex gap-5 lg:block">
              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ouro bg-petroleo-medio font-display text-lg text-ouro">
                {i + 1}
              </span>
              <div className="lg:mt-6">
                <h3 className="text-lg font-semibold leading-snug">{p.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-quente/75">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
