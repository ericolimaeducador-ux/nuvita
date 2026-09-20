// Vídeo decorativo de fundo do hero (só na landing): autoplay + mudo + loop nativos,
// sem controles e sem interação. Auto-hospedado em /public/videos: nenhuma requisição
// a terceiros (YouTube/Google) antes ou depois do consentimento de cookies.
// O enquadramento "cover" é o mesmo de antes: o vídeo preenche o container do hero.
// BASE_URL respeita o `base` do Vite ("/" em produção, "/nuvita/" no build padrão).
const BASE = import.meta.env.BASE_URL;

export function HeroVideo() {
  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={`${BASE}videos/hero-nuvita-poster.jpg`}
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={`${BASE}videos/hero-nuvita.webm`} type="video/webm" />
      <source src={`${BASE}videos/hero-nuvita.mp4`} type="video/mp4" />
    </video>
  );
}
