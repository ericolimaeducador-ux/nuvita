import { useSyncExternalStore } from 'react';

// Vídeo decorativo de fundo do hero (só na landing): autoplay + mudo + loop nativos,
// sem controles e sem interação. Auto-hospedado em /public/videos: nenhuma requisição
// a terceiros (YouTube/Google) antes ou depois do consentimento de cookies.
// O enquadramento "cover" é o mesmo de antes: o vídeo preenche o container do hero.
// BASE_URL respeita o `base` do Vite ("/" em produção, "/nuvita/" no build padrão).
const BASE = import.meta.env.BASE_URL;
const POSTER = `${BASE}videos/hero-nuvita-poster.jpg`;
const CLASSE = 'absolute inset-0 h-full w-full object-cover';
const QUERY = '(prefers-reduced-motion: reduce)';

// Lê (prefers-reduced-motion: reduce) e reage à troca em tempo real (o usuário pode
// alternar a configuração do sistema com a aba aberta). O useReducedMotion do
// framer-motion lê o valor mas não re-renderiza quando ele muda, por isso o listener aqui.
function assinar(aoMudar: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', aoMudar);
  return () => mq.removeEventListener('change', aoMudar);
}
const lerPreferencia = () => window.matchMedia(QUERY).matches;

function useReduzirMovimento() {
  return useSyncExternalStore(assinar, lerPreferencia, () => false);
}

export function HeroVideo() {
  const reduzirMovimento = useReduzirMovimento();

  // Com "reduzir movimento" ativo o vídeo nem é montado (não baixa os ~3,6 MB nem toca):
  // fica só o poster estático. Ao desativar, o <video> é montado e volta a tocar.
  if (reduzirMovimento) {
    return <img src={POSTER} alt="" aria-hidden="true" className={CLASSE} />;
  }

  return (
    <video
      className={CLASSE}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={POSTER}
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={`${BASE}videos/hero-nuvita.webm`} type="video/webm" />
      <source src={`${BASE}videos/hero-nuvita.mp4`} type="video/mp4" />
    </video>
  );
}
