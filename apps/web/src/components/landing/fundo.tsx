import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { cn } from '@/lib/utils';

const BASE = import.meta.env.BASE_URL;

// Cada fundo tem duas larguras em public/landing/ (srcset + sizes). width/height seguem a
// proporção real dos arquivos (evita layout shift); a versão sem sufixo, de largura única, não é mais usada.
const FUNDOS = {
  especialidades: { base: 'specialties-glow-bg', pequena: 1280, grande: 2560, largura: 1280, altura: 543, sizes: '100vw' },
  psicologia: { base: 'psicologia-accent-bg', pequena: 1280, grande: 2560, largura: 1280, altura: 698, sizes: '(min-width: 1024px) 640px, 100vw' },
  estomoterapia: { base: 'estomaterapia-soon-bg', pequena: 1280, grande: 2560, largura: 1280, altura: 698, sizes: '(min-width: 1024px) 640px, 100vw' },
  cifragem: { base: 'bento-encryption-bg', pequena: 600, grande: 1200, largura: 600, altura: 600, sizes: '(min-width: 640px) 576px, 100vw' },
  doisFatores: { base: 'bento-2fa-bg', pequena: 600, grande: 1200, largura: 600, altura: 600, sizes: '(min-width: 640px) 576px, 100vw' },
  nuvem: { base: 'bento-cloud-bg', pequena: 1280, grande: 2560, largura: 1280, altura: 698, sizes: '(min-width: 1152px) 1152px, 100vw' },
  planos: { base: 'pricing-glow-bg', pequena: 1280, grande: 2560, largura: 1280, altura: 543, sizes: '100vw' },
  cta: { base: 'cta-band-bg', pequena: 1280, grande: 2560, largura: 1280, altura: 543, sizes: '(min-width: 1152px) 1152px, 100vw' },
} as const;

// Máscaras: o -webkit- ainda é necessário no Safari.
function mascara(imagem: string, composicao?: 'intersect'): CSSProperties {
  return {
    maskImage: imagem,
    WebkitMaskImage: imagem,
    ...(composicao && { maskComposite: composicao, WebkitMaskComposite: 'source-in' }),
  };
}

/** Centro claro: apaga as bordas para o brilho não "recortar" na seção. */
export const MASCARA_RADIAL = mascara('radial-gradient(ellipse at center, #000 30%, transparent 72%)');
/** Fade nas quatro bordas: o acento da Psicologia não "recorta" no painel. */
export const MASCARA_BORDAS = mascara(
  'linear-gradient(to right, transparent, #000 18%, #000 82%, transparent), linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent)',
  'intersect',
);
/** Some até transparente nas bordas inferior e direita. */
export const MASCARA_INFERIOR_DIREITA = mascara(
  'linear-gradient(to bottom, #000 55%, transparent), linear-gradient(to right, #000 55%, transparent)',
  'intersect',
);

// Só libera o fundo depois do `load` e perto da viewport. O loading="lazy" sozinho não
// basta: em rede lenta o Chrome antecipa imagens a ~2500px e elas disputavam banda com o
// poster do vídeo da hero (elemento de LCP), atrasando o LCP no Lighthouse mobile.
function useLiberarDepoisDoLoad(ref: RefObject<Element | null>) {
  const [liberado, setLiberado] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let observador: IntersectionObserver | undefined;
    const observar = () => {
      observador = new IntersectionObserver(
        ([entrada]) => {
          if (entrada.isIntersecting) {
            setLiberado(true);
            observador?.disconnect();
          }
        },
        { rootMargin: '400px 0px' },
      );
      observador.observe(el);
    };
    if (document.readyState === 'complete') observar();
    else window.addEventListener('load', observar, { once: true });
    return () => {
      window.removeEventListener('load', observar);
      observador?.disconnect();
    };
  }, [ref]);
  return liberado;
}

/** Fundo decorativo: sempre alt="" e fora da árvore de acessibilidade. */
export function Fundo({
  nome,
  className,
  style,
}: {
  nome: keyof typeof FUNDOS;
  className?: string;
  style?: CSSProperties;
}) {
  const f = FUNDOS[nome];
  const marcador = useRef<HTMLSpanElement>(null);
  const liberado = useLiberarDepoisDoLoad(marcador);

  if (!liberado) {
    return <span ref={marcador} aria-hidden="true" className={cn('pointer-events-none absolute inset-0', className)} />;
  }
  return (
    <img
      src={`${BASE}landing/${f.base}-${f.pequena}.webp`}
      srcSet={`${BASE}landing/${f.base}-${f.pequena}.webp ${f.pequena}w, ${BASE}landing/${f.base}-${f.grande}.webp ${f.grande}w`}
      sizes={f.sizes}
      alt=""
      aria-hidden="true"
      width={f.largura}
      height={f.altura}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn('pointer-events-none absolute inset-0 h-full w-full select-none object-cover', className)}
      style={style}
    />
  );
}

// Fade-up em cascata ao entrar na viewport. O MotionConfig reducedMotion="user" da página
// desliga o deslocamento quando o sistema pede menos movimento.
export const cascata = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
export const subir = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};
export const naViewport = { once: true, amount: 0.2 } as const;
