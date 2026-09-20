import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Google Analytics SÓ na landing pública. O app logado e a sala de
// teleatendimento nunca podem enviar URL ao Google: as rotas carregam IDs de
// paciente/prontuário e, em /tele/:token, a própria credencial da sala (LGPD).
const GA_ID = 'G-QCQ6HCX8Q2';

/** Allowlist: caminhos EXATOS onde o GA pode rodar (ver useGoogleAnalytics). */
const ROTAS_PUBLICAS_GA: readonly string[] = ['/'];

/** Denylist nomeada: vence a allowlist, mesmo que um padrão futuro a alcance. */
const ROTAS_NEGADAS_GA: readonly RegExp[] = [/^\/tele(\/|$)/];

export function gaPermitidoEm(pathname: string): boolean {
  if (ROTAS_NEGADAS_GA.some((re) => re.test(pathname))) return false;
  return ROTAS_PUBLICAS_GA.includes(pathname);
}

type GaWindow = Window & { dataLayer?: unknown[]; [flag: string]: unknown };

let scriptInjetado = false;

// Opt-out oficial do GA por propriedade: com a flag ligada nenhuma chamada
// sai, mesmo com o script já carregado. Evita que a "medição avançada" de
// histórico do GA4 envie /dashboard, /pacientes/:id... depois do login SPA.
function definirDesativado(desativado: boolean): void {
  (window as unknown as GaWindow)[`ga-disable-${GA_ID}`] = desativado;
}

function ativar(): void {
  definirDesativado(false);
  if (scriptInjetado) return;
  scriptInjetado = true;
  const w = window as unknown as GaWindow;
  w.dataLayer = w.dataLayer ?? [];
  // gtag precisa empurrar o objeto `arguments` (não um array) no dataLayer.
  // eslint-disable-next-line prefer-rest-params
  const gtag = function (..._args: unknown[]) { w.dataLayer!.push(arguments); };
  gtag('js', new Date());
  gtag('config', GA_ID);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

/**
 * Use APENAS em telas públicas (hoje, a LandingPage). Ao desmontar (ex.: login
 * levando ao /dashboard) ou em rota fora da allowlist, desativa o GA.
 */
export function useGoogleAnalytics(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!gaPermitidoEm(pathname)) {
      definirDesativado(true);
      return;
    }
    ativar();
    return () => definirDesativado(true);
  }, [pathname]);
}
