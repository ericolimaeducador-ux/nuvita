import { useEffect, useRef } from 'react';

// Vídeo decorativo de fundo do hero (só na landing): autoplay + mudo + sem
// controles, em loop via IFrame API. O loop NÃO usa loop=1&playlist=<ID>: para
// este vídeo o YouTube responde "Este vídeo não está disponível" quando o
// parâmetro playlist está presente (isolado em HTML mínimo). Por isso o
// reinício é manual: onStateChange → ENDED → seekTo(0) + playVideo().
const VIDEO_ID = 'IJLf_-C-M6Q';

interface YTPlayer {
  destroy(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: { events?: { onStateChange?: (e: { data: number }) => void } },
  ) => YTPlayer;
  PlayerState: { ENDED: number };
}
type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };

// Carrega https://www.youtube.com/iframe_api uma única vez e resolve quando
// window.YT.Player existir. Encadeia um onYouTubeIframeAPIReady pré-existente
// e cobre o caso de o script já ter carregado antes do componente montar.
let apiPromise: Promise<YTNamespace> | null = null;
function carregarYouTubeApi(): Promise<YTNamespace> {
  const w = window as YTWindow;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const anterior = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      anterior?.();
      resolve(w.YT!);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => {
      apiPromise = null; // permite nova tentativa numa próxima montagem
      reject(new Error('Falha ao carregar a IFrame API do YouTube'));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

function urlDoEmbed(): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    modestbranding: '1',
    playsinline: '1',
    disablekb: '1',
    rel: '0',
    enablejsapi: '1',
    origin: window.location.origin,
  });
  return `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?${params}`;
}

export function HeroVideo() {
  const montagem = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = montagem.current;
    if (!raiz) return;
    let cancelado = false;
    let player: YTPlayer | null = null;

    // O iframe é criado aqui (e não no JSX) porque player.destroy() o remove do
    // DOM; se o React fosse o dono dele, o desmonte/StrictMode quebraria.
    const iframe = document.createElement('iframe');
    iframe.src = urlDoEmbed();
    iframe.title = 'Vídeo de fundo';
    iframe.tabIndex = -1;
    iframe.allow = 'autoplay; encrypted-media';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.className = 'absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 border-0';
    iframe.style.width = 'max(100cqw, 177.78cqh)';
    iframe.style.height = 'max(100cqh, 56.25cqw)';
    raiz.appendChild(iframe);

    carregarYouTubeApi()
      .then((YT) => {
        if (cancelado) return;
        player = new YT.Player(iframe, {
          events: {
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.ENDED) {
                player?.seekTo(0, true);
                player?.playVideo();
              }
            },
          },
        });
      })
      .catch(() => {
        // Sem a API o vídeo ainda toca uma vez (autoplay por parâmetro); só não repete.
      });

    return () => {
      cancelado = true;
      player?.destroy();
      raiz.replaceChildren();
    };
  }, []);

  return <div ref={montagem} className="absolute inset-0" />;
}
