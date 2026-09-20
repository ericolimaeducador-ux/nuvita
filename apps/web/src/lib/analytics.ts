import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Google Analytics SÓ na landing pública e SÓ com consentimento. O app logado e
// a sala de teleatendimento nunca podem enviar URL ao Google: as rotas carregam
// IDs de paciente/prontuário e, em /tele/:token, a própria credencial da sala
// (LGPD). Camadas, em ordem: consentimento → allowlist → denylist → opt-out ao
// desmontar a landing.
const GA_ID = 'G-QCQ6HCX8Q2';

/** Allowlist: caminhos EXATOS onde o GA pode rodar (ver useGoogleAnalytics). */
const ROTAS_PUBLICAS_GA: readonly string[] = ['/'];

/** Denylist nomeada: vence a allowlist, mesmo que um padrão futuro a alcance. */
const ROTAS_NEGADAS_GA: readonly RegExp[] = [/^\/tele(\/|$)/];

export function gaPermitidoEm(pathname: string): boolean {
  if (ROTAS_NEGADAS_GA.some((re) => re.test(pathname))) return false;
  return ROTAS_PUBLICAS_GA.includes(pathname);
}

// ── Consentimento de cookies ────────────────────────────────────────────────
export type ConsentimentoCookies = 'accepted' | 'rejected';
export const CONSENT_KEY = 'cookie-consent';

function lerConsentimento(): ConsentimentoCookies | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'accepted' || v === 'rejected' ? v : null;
  } catch {
    return null; // sem storage: trata como "ainda não escolheu" (GA fica desligado)
  }
}

/** Escolha do usuário persistida no navegador (null = ainda não escolheu). */
export function useConsentimentoCookies() {
  const [consentimento, setConsentimento] = useState<ConsentimentoCookies | null>(lerConsentimento);

  const escolher = useCallback((valor: ConsentimentoCookies) => {
    try {
      localStorage.setItem(CONSENT_KEY, valor);
    } catch {
      /* sem storage: vale só nesta sessão da página */
    }
    setConsentimento(valor);
  }, []);

  return {
    consentimento,
    aceitar: useCallback(() => escolher('accepted'), [escolher]),
    recusar: useCallback(() => escolher('rejected'), [escolher]),
  };
}

// ── Carregamento do GA ──────────────────────────────────────────────────────
type GaWindow = Window & { dataLayer?: unknown[]; [flag: string]: unknown };

let scriptInjetado = false;

// Opt-out oficial do GA por propriedade: com a flag ligada nenhuma chamada
// sai, mesmo com o script já carregado. O login faz navegação de página
// completa, então nenhum timer do gtag.js sobrevive dentro do app logado.
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
 * Use APENAS em telas públicas (hoje, a LandingPage). Só carrega o GA com
 * consentimento "accepted". Ao desmontar (ex.: login levando ao /dashboard) ou
 * em rota fora da allowlist, desativa o GA.
 */
export function useGoogleAnalytics(consentimento: ConsentimentoCookies | null): void {
  const { pathname } = useLocation();
  useEffect(() => {
    if (consentimento !== 'accepted' || !gaPermitidoEm(pathname)) {
      definirDesativado(true);
      return;
    }
    ativar();
    return () => definirDesativado(true);
  }, [pathname, consentimento]);
}
