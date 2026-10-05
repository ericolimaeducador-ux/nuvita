import type { CSSProperties } from 'react';
// Títulos da landing em Plus Jakarta Sans (600/700/800 já vêm do main.tsx); itálico só aqui.
import '@fontsource/plus-jakarta-sans/latin-600-italic.css';
// Fraunces: só o H1 do hero usa essa fonte (decisão do usuário); o resto da landing ficou em Jakarta.
import '@fontsource-variable/fraunces';
import { ChevronDown } from 'lucide-react';
import { MotionConfig, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoginForm } from '@/components/LoginForm';
import { HeroVideo } from '@/components/HeroVideo';
import logoDourado from '@/assets/logo-dourado.png';
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

// Paleta da landing aplicada aos tokens de cor (Tailwind v4: --color-*) só dentro deste wrapper
// (petróleo #0F3D3E como primária, branco quente #F7F5F0 de fundo, texto #2B2B28).
const tema = {
  '--color-background': '#F7F5F0',
  '--color-foreground': '#2B2B28',
  '--color-card': '#FBFAF7',
  '--color-card-foreground': '#2B2B28',
  '--color-primary': '#0F3D3E',
  '--color-primary-foreground': '#F7F5F0',
  '--color-secondary': '#ECE7DC',
  '--color-secondary-foreground': '#2B2B28',
  '--color-muted': '#ECE7DC',
  // #8FA69E não passa contraste como texto sobre o fundo claro; versão escurecida do mesmo matiz.
  '--color-muted-foreground': '#4F625B',
  '--color-accent': '#ECE7DC',
  '--color-accent-foreground': '#2B2B28',
  '--color-border': '#D6DCD7',
  '--color-input': '#C9D1CC',
  '--color-ring': '#1B5E5A',
  // Componentes legados (ex.: LoginForm) usam brand-cobalt: dentro da landing, viram petróleo.
  '--color-brand-cobalt': '#0F3D3E',
  '--color-brand-cobalt-dark': '#0B2E2F',
  '--font-display': '"Plus Jakarta Sans", Inter, system-ui, sans-serif',
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
      <div style={tema} className="min-h-screen bg-background font-body text-foreground">
        {/* Header fixo */}
        <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/10 bg-petroleo">
          {/* Mesmo container das seções (max-w-6xl + px-6): logo e botão alinham com o conteúdo e não estouram a viewport. */}
          <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-4 px-6">
          <img src={logoDourado} alt="Nuvita — gestão de saúde na nuvem" className="h-10 w-auto shrink-0" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 shrink-0 items-center rounded-md border border-ouro/70 px-4 text-sm font-medium text-quente transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ouro"
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
          <section className="relative isolate flex min-h-[72vh] items-center overflow-hidden bg-petroleo px-6 py-24 text-quente">
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
                style={{ fontFamily: '"Fraunces Variable", Georgia, serif' }}
                className="mb-6 max-w-3xl text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
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
          <section id="entrar-urologia" className="scroll-mt-16 bg-petroleo-medio px-6 py-24">
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
