import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { cn } from '@/lib/utils';

const BASE = import.meta.env.BASE_URL;

// Dimensões reais dos arquivos em public/landing/ (evita layout shift).
const FUNDOS = {
  especialidades: { arquivo: 'specialties-glow-bg.webp', largura: 2560, altura: 1086 },
  psicologia: { arquivo: 'psicologia-accent-bg.webp', largura: 1600, altura: 873 },
  estomoterapia: { arquivo: 'estomaterapia-soon-bg.webp', largura: 1600, altura: 873 },
  cifragem: { arquivo: 'bento-encryption-bg.webp', largura: 900, altura: 900 },
  doisFatores: { arquivo: 'bento-2fa-bg.webp', largura: 900, altura: 900 },
  nuvem: { arquivo: 'bento-cloud-bg.webp', largura: 1600, altura: 873 },
  planos: { arquivo: 'pricing-glow-bg.webp', largura: 2560, altura: 1086 },
  cta: { arquivo: 'cta-band-bg.webp', largura: 2560, altura: 1086 },
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
      src={`${BASE}landing/${f.arquivo}`}
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
