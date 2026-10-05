import { motion } from 'framer-motion';
import { Fundo, cascata, naViewport, subir } from './fundo';

// Faixa final antes do rodapé: leva ao plano de Psicologia.
export function CtaFinal({ onVerPlanos }: { onVerPlanos: () => void }) {
  return (
    <section aria-label="Chamada final" className="bg-noite px-6 py-16 text-quente">
      <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 px-8 py-14 sm:px-12">
        <Fundo nome="cta" className="-z-20" />
        {/* Véu escuro atrás do texto: o brilho teal da faixa fica à esquerda. */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-noite/90 via-noite/75 to-noite/35" />
        <motion.div
          className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center"
          variants={cascata}
          initial="hidden"
          whileInView="show"
          viewport={naViewport}
        >
          <motion.div variants={subir}>
            <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Pronto para começar?</h2>
            <p className="mt-2 text-quente/85">Escolha seu plano e receba o acesso em até 24h úteis.</p>
          </motion.div>
          <motion.div variants={subir}>
            <button
              type="button"
              onClick={onVerPlanos}
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-turquesa px-8 text-sm font-semibold text-noite transition-[transform,background-color] hover:bg-[#5EEAD4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quente focus-visible:ring-offset-2 focus-visible:ring-offset-noite motion-safe:hover:-translate-y-0.5"
            >
              Ver plano
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
