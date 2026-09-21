/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public Key do Mercado Pago (TEST-... em dev). Sem ela, o checkout embutido não aparece. */
  readonly VITE_MERCADO_PAGO_PUBLIC_KEY?: string;
}
