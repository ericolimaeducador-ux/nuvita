import { Activity, Brain, ChevronDown, HeartPulse, type LucideIcon } from 'lucide-react';
import { MotionConfig } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/Logo';
import { LoginForm } from '@/components/LoginForm';
import { HeroVideo } from '@/components/HeroVideo';
import { CookieBanner } from '@/components/landing/CookieBanner';
import { PrecosEstomoterapia } from '@/components/landing/PrecosEstomoterapia';
import { PrecosPsicologia } from '@/components/landing/PrecosPsicologia';
import { Reveal } from '@/components/landing/Reveal';
import { RodapeLanding } from '@/components/landing/RodapeLanding';
import { useConsentimentoCookies, useGoogleAnalytics } from '@/lib/analytics';

const ESTOMOTERAPIA_URL = 'https://estomoterapia.nuvita.app.br';
const PSICOLOGIA_URL = 'https://psi.nuvita.app.br';

function rolarPara(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

interface Produto {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  cta: string;
  alvo: string; // id da âncora da seção de destino
}

const produtos: Produto[] = [
  {
    titulo: 'Urologia',
    descricao:
      'Gestão completa de consultório urológico — prontuário, agenda e histórico de acompanhamento, com acesso direto abaixo.',
    icone: Activity,
    cta: 'Acessar',
    alvo: 'entrar-urologia',
  },
  {
    titulo: 'Estomoterapia',
    descricao:
      'Prontuário especializado em cuidado de feridas, com registro fotográfico de evolução de lesão e armazenamento dedicado na nuvem.',
    icone: HeartPulse,
    cta: 'Ver planos',
    alvo: 'precos-estomoterapia',
  },
  {
    titulo: 'Psicologia',
    descricao:
      'Prontuário eletrônico para psicólogos — sessões, evolução clínica e agenda, com segurança e privacidade de dados.',
    icone: Brain,
    cta: 'Ver plano',
    alvo: 'precos-psicologia',
  },
];

export function LandingPage() {
  const { pathname } = useLocation();
  const { consentimento, aceitar, recusar } = useConsentimentoCookies();
  // Camada 1: consentimento. As demais (allowlist, denylist, opt-out) ficam no hook.
  useGoogleAnalytics(consentimento);
  const mostrarBanner = pathname === '/' && consentimento === null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background text-foreground">
        {/* Header fixo */}
        <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-brand-cobalt px-6">
          <Logo width={140} iconColor="#FFB800" textColor="#FFFFFF" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                Entrar <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => rolarPara('entrar-urologia')}>Urologia</DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={ESTOMOTERAPIA_URL} target="_blank" rel="noopener noreferrer">Estomoterapia</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={PSICOLOGIA_URL} target="_blank" rel="noopener noreferrer">Psicologia</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="pt-16">
          {/* Hero */}
          <section className="relative isolate flex min-h-[70vh] items-center overflow-hidden bg-bg-dark px-6 py-24 text-white">
            {/* Vídeo decorativo de fundo: mudo, em loop, sem controles e sem interação. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 [container-type:size]">
              <HeroVideo />
              <div className="absolute inset-0 bg-gradient-to-br from-bg-dark/85 to-brand-cobalt/70" />
            </div>
            <div className="mx-auto w-full max-w-6xl">
              <h1 className="mb-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Seu portal de saúde <span className="text-accent-gold">na nuvem</span>
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-blue-100/95 sm:text-xl">
                Prontuário eletrônico completo para profissionais de saúde — urologia, estomoterapia e psicologia
                em um só lugar, com segurança e conformidade com a LGPD.
              </p>
            </div>
          </section>

          {/* Produtos */}
          <section className="px-6 py-20">
            <div className="mx-auto max-w-6xl">
              <Reveal className="mb-12 text-center">
                <h2 className="text-3xl font-semibold">Nossos produtos</h2>
                <p className="mt-2 text-muted-foreground">Uma plataforma para cada especialidade.</p>
              </Reveal>
              <div className="grid gap-6 md:grid-cols-3">
                {produtos.map((p, i) => (
                  <Reveal key={p.titulo} delay={i * 0.1}>
                    <Card className="flex h-full flex-col">
                      <CardHeader>
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-cobalt/10 text-brand-cobalt">
                          <p.icone className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <CardTitle className="text-xl">{p.titulo}</CardTitle>
                        <CardDescription className="pt-1 leading-relaxed">{p.descricao}</CardDescription>
                      </CardHeader>
                      <CardContent className="mt-auto">
                        <Button className="w-full" onClick={() => rolarPara(p.alvo)}>{p.cta}</Button>
                      </CardContent>
                    </Card>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          <PrecosPsicologia />
          <PrecosEstomoterapia />

          {/* Login Urologia (âncora do dropdown "Entrar" e do card de Urologia) */}
          <section id="entrar-urologia" className="scroll-mt-16 bg-secondary/40 px-6 py-20">
            <Reveal className="mx-auto w-full max-w-md">
              <LoginForm />
            </Reveal>
          </section>
        </main>

        <RodapeLanding comBanner={mostrarBanner} />
        {/* Só em "/" (o GA, por sua vez, só carrega após "Aceitar"). */}
        {mostrarBanner && <CookieBanner onAceitar={aceitar} onRecusar={recusar} />}
      </div>
    </MotionConfig>
  );
}
