import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/Logo';
import { LoginForm } from '@/components/LoginForm';
import { HeroVideo } from '@/components/HeroVideo';
import { useGoogleAnalytics } from '@/lib/analytics';

const ESTOMOTERAPIA_URL = 'https://estomoterapia.nuvita.app.br';
const PSICOLOGIA_URL = 'https://psi.nuvita.app.br';

const produtos = [
  { titulo: 'Urologia', descricao: 'Placeholder: descrição do produto de Urologia.' },
  { titulo: 'Estomoterapia', descricao: 'Placeholder: descrição do produto de Estomoterapia.' },
  { titulo: 'Psicologia', descricao: 'Placeholder: descrição do produto de Psicologia.' },
];

function irParaLoginUrologia() {
  document.getElementById('entrar-urologia')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Scaffold da landing page (conteúdo, vídeo e visual final ainda pendentes).
export function LandingPage() {
  useGoogleAnalytics();
  return (
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
            <DropdownMenuItem onSelect={irParaLoginUrologia}>Urologia</DropdownMenuItem>
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
        <section className="relative isolate flex min-h-[70vh] items-center overflow-hidden bg-bg-dark px-6 py-20 text-white">
          {/* Vídeo decorativo de fundo: mudo, em loop, sem controles e sem interação. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 [container-type:size]">
            <HeroVideo />
            <div className="absolute inset-0 bg-gradient-to-br from-bg-dark/85 to-brand-cobalt/70" />
          </div>
          <div className="mx-auto w-full max-w-6xl">
            <h1 className="mb-4 max-w-2xl text-4xl font-medium leading-tight lg:text-5xl">
              Título do hero <span className="text-accent-gold">(placeholder)</span>
            </h1>
            <p className="max-w-xl text-lg text-blue-100/90">
              Subtítulo do hero: texto de apoio a ser definido.
            </p>
          </div>
        </section>

        {/* 3 produtos */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-10 text-center text-3xl font-semibold">Nossos produtos</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {produtos.map((p) => (
                <Card key={p.titulo}>
                  <CardHeader>
                    <CardTitle>{p.titulo}</CardTitle>
                    <CardDescription>{p.descricao}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-24 rounded-lg bg-secondary" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Login Urologia (âncora do dropdown "Entrar") */}
        <section id="entrar-urologia" className="scroll-mt-16 bg-secondary/40 px-6 py-20">
          <div className="mx-auto w-full max-w-md">
            <LoginForm />
          </div>
        </section>
      </main>
    </div>
  );
}
