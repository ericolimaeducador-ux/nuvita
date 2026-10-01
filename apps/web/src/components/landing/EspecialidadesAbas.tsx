import { motion } from 'framer-motion';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Fundo, MASCARA_INFERIOR_DIREITA, MASCARA_RADIAL, cascata, naViewport, subir } from './fundo';
import { MockupDispositivos } from './MockupDispositivos';

const gatilho =
  'inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-quente/80 transition-colors hover:text-quente focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turquesa data-[state=active]:bg-turquesa data-[state=active]:text-noite';

function SeloEmBreve({ className }: { className?: string }) {
  return (
    <span className={cn('rounded-full border border-current px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', className)}>
      Em breve
    </span>
  );
}

const escalas = ['Escala PUSH 3.0', 'Escala RESVECH 2.0', 'Escala de Braden'];

// Psicologia é o único produto à venda; Estomoterapia aparece só como "Em breve".
export function EspecialidadesAbas({ onVerPlano }: { onVerPlano: () => void }) {
  return (
    <section
      id="especialidades"
      aria-labelledby="especialidades-titulo"
      className="relative isolate scroll-mt-16 overflow-hidden bg-noite px-6 py-24 text-quente"
    >
      <Fundo nome="especialidades" className="-z-10 opacity-40" style={MASCARA_RADIAL} />

      <motion.div
        className="mx-auto max-w-6xl"
        variants={cascata}
        initial="hidden"
        whileInView="show"
        viewport={naViewport}
      >
        <motion.h2
          id="especialidades-titulo"
          variants={subir}
          className="max-w-xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
        >
          Especialidades
        </motion.h2>
        <motion.p variants={subir} className="mt-3 max-w-md text-quente/80">
          Comece pela Psicologia. A Estomoterapia chega em breve.
        </motion.p>

        <motion.div variants={subir}>
          <TabsPrimitive.Root defaultValue="psicologia" className="mt-10">
            <TabsPrimitive.List
              aria-label="Especialidades"
              className="inline-flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1"
            >
              <TabsPrimitive.Trigger value="psicologia" className={gatilho}>
                Psicologia
              </TabsPrimitive.Trigger>
              <TabsPrimitive.Trigger value="estomoterapia" className={gatilho}>
                Estomoterapia <SeloEmBreve />
              </TabsPrimitive.Trigger>
            </TabsPrimitive.List>

            <TabsPrimitive.Content
              value="psicologia"
              className="mt-12 grid items-center gap-12 focus-visible:outline-none lg:grid-cols-[1fr_1.15fr] lg:gap-16 motion-safe:animate-fade-in"
            >
              <div>
                <h3 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Psicologia</h3>
                <p className="mt-5 max-w-lg text-lg leading-relaxed text-quente/80">
                  Prontuário eletrônico para psicólogos — sessões, evolução clínica e agenda, com segurança e privacidade de dados.
                </p>
                <button
                  type="button"
                  onClick={onVerPlano}
                  className="mt-9 inline-flex h-11 items-center justify-center rounded-md bg-turquesa px-7 text-sm font-semibold text-noite transition-[transform,background-color] hover:bg-[#5EEAD4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turquesa focus-visible:ring-offset-2 focus-visible:ring-offset-noite motion-safe:hover:-translate-y-0.5"
                >
                  Ver plano
                </button>
              </div>
              <div className="relative isolate py-6">
                <Fundo nome="psicologia" className="-z-10 rounded-3xl opacity-80" style={MASCARA_INFERIOR_DIREITA} />
                <MockupDispositivos />
              </div>
            </TabsPrimitive.Content>

            <TabsPrimitive.Content
              value="estomoterapia"
              className="mt-12 grid items-center gap-12 focus-visible:outline-none lg:grid-cols-[1fr_1.15fr] lg:gap-16 motion-safe:animate-fade-in"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Estomoterapia</h3>
                  {/* Selo sólido: contorno turquesa sobre o brilho do fundo mediu 3,95:1 (abaixo do AA). */}
                  <SeloEmBreve className="border-turquesa bg-turquesa text-noite" />
                </div>
                <p className="mt-5 max-w-lg text-lg leading-relaxed text-quente/80">
                  Prontuário para o cuidado de feridas, estomias e incontinências, incluindo a dermatite associada à incontinência.
                </p>
                <p className="mt-8 text-sm font-semibold text-quente">Escalas de avaliação</p>
                <ul className="mt-3 space-y-2.5 text-sm text-quente/85">
                  {escalas.map((e) => (
                    <li key={e} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 shrink-0 text-turquesa" aria-hidden="true" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-white/10">
                <Fundo nome="estomoterapia" />
              </div>
            </TabsPrimitive.Content>
          </TabsPrimitive.Root>
        </motion.div>
      </motion.div>
    </section>
  );
}
