// Carregamento sob demanda do SDK MercadoPago.js V2 e criação de preferência no backend.
// O SDK é parte funcional do checkout (não é rastreamento): só é carregado quando o
// visitante escolhe pagar direto na página, nunca no carregamento inicial da landing.

const SDK_URL = 'https://sdk.mercadopago.com/js/v2';

export const MERCADO_PAGO_PUBLIC_KEY: string | undefined = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || undefined;

export interface WalletBrickController {
  unmount(): void;
}
interface BricksBuilder {
  create(
    tipo: 'wallet',
    idContainer: string,
    config: {
      initialization: { preferenceId: string };
      customization?: { texts?: { valueProp?: 'smart_option' | 'security_details' } };
      callbacks?: { onError?: (erro: unknown) => void };
    },
  ): Promise<WalletBrickController>;
}
export interface MercadoPagoInstance {
  bricks(): BricksBuilder;
}
type MercadoPagoCtor = new (publicKey: string, opcoes?: { locale?: string }) => MercadoPagoInstance;
type JanelaMP = Window & { MercadoPago?: MercadoPagoCtor };

let sdkPromise: Promise<MercadoPagoCtor> | null = null;

export function carregarSdkMercadoPago(): Promise<MercadoPagoCtor> {
  const w = window as JanelaMP;
  if (w.MercadoPago) return Promise.resolve(w.MercadoPago);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<MercadoPagoCtor>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => (w.MercadoPago ? resolve(w.MercadoPago) : reject(new Error('SDK do Mercado Pago sem construtor')));
    s.onerror = () => {
      sdkPromise = null; // permite nova tentativa
      reject(new Error('Falha ao carregar o SDK do Mercado Pago'));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export type PlanoCheckout = 'psicologia-vista' | 'psicologia-parcelado';

/** Pede ao backend a preferência do plano. O preço é decidido no servidor. */
export async function criarPreferencia(plano: PlanoCheckout): Promise<string> {
  // fetch simples (e não o axios da app): sem interceptor de refresh/redirect de sessão.
  const base = import.meta.env.VITE_API_URL ?? '';
  const resp = await fetch(`${base}/pagamentos/preferencia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plano }),
  });
  if (!resp.ok) throw new Error(`preferencia: HTTP ${resp.status}`);
  const dados = (await resp.json()) as { id?: string };
  if (!dados.id) throw new Error('preferencia: resposta sem id');
  return dados.id;
}
