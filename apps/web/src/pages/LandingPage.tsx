import type { CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import { MotionConfig, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoginForm } from '@/components/LoginForm';
import { HeroVideo } from '@/components/HeroVideo';
import { Logo } from '@/components/Logo';
import { CtaFinal } from '@/components/landing/CtaFinal';
import { ComoFunciona } from '@/components/landing/ComoFunciona';
import { CookieBanner } from '@/components/landing/CookieBanner';
import { EspecialidadesAbas } from '@/components/landing/EspecialidadesAbas';
import { FaqLanding } from '@/components/landing/FaqLanding';
import { GridConfianca } from '@/components/landing/GridConfianca';
import { PrecosPsicologia } from '@/components/landing/PrecosPsicologia';
import { RodapeLanding } from '@/components/landing/RodapeLanding';
import { useConsentimentoCookies, useGoogleAnalytics } from '@/lib/analytics';

const ESTOMOTERAPIA_URL = 'https://estomoterapia.nuvita.app.br';
const PSICOLOGIA_URL = 'https://psi.nuvita.app.br';

// Identidade navy + âmbar. Os tokens da marca ficam em index.css (@theme); aqui os tokens
// semânticos e os legados (petroleo, ouro, turquesa...) são reapontados para eles, só dentro do wrapper.
const tema = {
  '--color-background': 'var(--color-navy-800)',
  '--color-foreground': '#13233f',
  '--color-card': '#ffffff',
  '--color-card-foreground': '#13233f',
  '--color-primary': 'var(--color-ambar)',
  '--color-primary-foreground': 'var(--color-navy-900)',
  '--color-secondary': 'var(--color-gelo)',
  '--color-secondary-foreground': '#13233f',
  '--color-muted': 'var(--color-gelo)',
  '--color-muted-foreground': 'var(--color-ink-claro-2)',
  '--color-accent': 'var(--color-gelo)',
  '--color-accent-foreground': '#13233f',
  '--color-border': 'var(--color-linha)',
  '--color-input': '#c9d3e6',
  '--color-ring': 'var(--color-ambar)',
  '--color-petroleo': 'var(--color-navy-800)',
  '--color-petroleo-medio': 'var(--color-navy-700)',
  '--color-noite': 'var(--color-navy-900)',
  '--color-ouro': 'var(--color-ambar)',
  '--color-turquesa': 'var(--color-ambar)',
  '--color-quente': 'var(--color-texto)',
  '--color-sage': 'var(--color-texto-2)',
  '--color-ink': 'var(--color-ink-claro)',
  // Componentes legados (ex.: LoginForm) usam brand-cobalt: dentro da landing, viram navy.
  '--color-brand-cobalt': 'var(--color-navy-700)',
  '--color-brand-cobalt-dark': 'var(--color-navy-800)',
  '--font-display': 'var(--font-landing)',
  '--font-body': 'var(--font-landing)',
} as CSSProperties;

function rolarPara(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Única entrada orquestrada da página: o hero, em cascata.
const heroContainer = { hidden: {}, show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } } };
const heroItem = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

export function LandingPage() {
  const { pathname } = useLocation();
  const { consentimento, aceitar, recusar } = useConsentimentoCookies();
  // Camada 1: consentimento. As demais (allowlist, denylist, opt-out) ficam no hook.
  useGoogleAnalytics(consentimento);
  const mostrarBanner = pathname === '/' && consentimento === null;

  return (
    <MotionConfig reducedMotion="user">
      <div
        style={{ ...tema, background: 'linear-gradient(180deg, var(--color-navy-800), var(--color-navy-700)) fixed' }}
        className="landing-tema min-h-screen font-body text-quente"
      >
        {/* Header fixo */}
        <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-linha bg-navy-900">
          {/* Mesmo container das seções (max-w-6xl + px-6): logo e botão alinham com o conteúdo e não estouram a viewport. */}
          <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-4 px-6">
          <Logo width={144} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 shrink-0 items-center rounded-full border border-ouro/70 px-4 text-sm font-medium text-quente transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ouro"
              >
                Entrar <ChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-white/10 bg-petroleo text-quente">
              <DropdownMenuItem asChild className="text-quente focus:bg-white/10 focus:text-quente data-[highlighted]:bg-white/10 data-[highlighted]:text-quente data-[highlighted]:underline data-[highlighted]:decoration-ouro data-[highlighted]:underline-offset-4">
                <a href={ESTOMOTERAPIA_URL} target="_blank" rel="noopener noreferrer">Estomoterapia</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-quente focus:bg-white/10 focus:text-quente data-[highlighted]:bg-white/10 data-[highlighted]:text-quente data-[highlighted]:underline data-[highlighted]:decoration-ouro data-[highlighted]:underline-offset-4">
                <a href={PSICOLOGIA_URL} target="_blank" rel="noopener noreferrer">Psicologia</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>

        <main className="pt-16">
          {/* Hero */}
          <section className="relative isolate flex min-h-[72vh] items-center overflow-hidden bg-navy-900 px-6 py-24 text-quente">
            {/* Vídeo decorativo de fundo: mudo, em loop, sem controles e sem interação. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 [container-type:size]">
              <HeroVideo />
              <div className="absolute inset-0 bg-gradient-to-r from-petroleo/95 via-petroleo/80 to-petroleo-medio/55" />
            </div>
            <motion.div
              className="mx-auto w-full max-w-6xl"
              variants={heroContainer}
              initial="hidden"
              animate="show"
            >
              <motion.h1
                variants={heroItem}
                className="mb-6 max-w-3xl text-[clamp(2.1rem,5.2vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.02em] text-white"
              >
                Seu portal de saúde <span className="italic text-ouro">na nuvem</span>
              </motion.h1>
              <motion.p variants={heroItem} className="max-w-xl text-lg leading-relaxed text-quente/85 sm:text-xl">
                Prontuário eletrônico completo para profissionais de saúde — estomoterapia e psicologia
                em um só lugar, com segurança e conformidade com a LGPD.
              </motion.p>
            </motion.div>
          </section>

          <EspecialidadesAbas onVerPlano={() => rolarPara('precos-psicologia')} />
          <GridConfianca />

          <ComoFunciona />
          <PrecosPsicologia />

          {/* Login Urologia (âncora do link "Urologia" do rodapé) */}
          <section id="entrar-urologia" className="faixa-escura scroll-mt-16 px-6 py-24">
            <div className="mx-auto w-full max-w-md">
              <LoginForm />
            </div>
          </section>

          <FaqLanding />
          <CtaFinal onVerPlanos={() => rolarPara('precos-psicologia')} />
        </main>

        <RodapeLanding comBanner={mostrarBanner} onEntrarUrologia={() => rolarPara('entrar-urologia')} />
        {/* Só em "/" (o GA, por sua vez, só carrega após "Aceitar"). */}
        {mostrarBanner && <CookieBanner onAceitar={aceitar} onRecusar={recusar} />}
      </div>
    </MotionConfig>
  );
}
