import { motion } from 'framer-motion';
import { Fundo, cascata, naViewport, subir } from './fundo';

// Faixa final antes do rodapé: leva ao plano de Psicologia.
export function CtaFinal({ onVerPlanos }: { onVerPlanos: () => void }) {
  return (
    <section aria-label="Chamada final" className="faixa-escura px-6 py-16 text-quente">
      <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[22px] border border-linha bg-gradient-to-br from-navy-600 to-navy-700 px-8 py-14 shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:px-12">
        <Fundo nome="cta" className="-z-20" />
        <motion.div
          className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center"
          variants={cascata}
          initial="hidden"
          whileInView="show"
          viewport={naViewport}
        >
          <motion.div variants={subir}>
            <h2 className="font-display text-3xl font-extrabold leading-tight tracking-[-0.02em] text-white sm:text-4xl">Pronto para começar?</h2>
            <p className="mt-2 text-quente/85">Escolha seu plano e receba o acesso em até 24h úteis.</p>
          </motion.div>
          <motion.div variants={subir}>
            <button
              type="button"
              onClick={onVerPlanos}
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-ambar px-8 text-sm font-extrabold text-navy-900 transition-[transform,background-color] hover:bg-ambar-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quente focus-visible:ring-offset-2 focus-visible:ring-offset-noite motion-safe:hover:-translate-y-0.5"
            >
              Ver plano
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
