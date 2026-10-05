/// <reference types="vite/client" />

/** Definido em vite.config.ts: quais screenshots de public/landing/shots/ existem. */
declare const __SHOTS_PSICOLOGIA__: { desktop: boolean; mobile: boolean };

interface ImportMetaEnv {
  /** Public Key do Mercado Pago (TEST-... em dev). Sem ela, o checkout embutido não aparece. */
  readonly VITE_MERCADO_PAGO_PUBLIC_KEY?: string;
}
