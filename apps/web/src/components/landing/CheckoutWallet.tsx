import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  MERCADO_PAGO_PUBLIC_KEY,
  carregarSdkMercadoPago,
  criarPreferencia,
  type WalletBrickController,
} from '@/lib/mercado-pago';

const ID_CONTAINER = 'wallet-brick-psicologia';

// Terceira opção de pagamento (versão de teste/validação): Wallet Brick do Mercado Pago.
// Só é montado depois que o visitante pede (clique): assim nenhuma preferência é criada
// nem o SDK é baixado por quem só está lendo a página. Sem Public Key configurada, não aparece.
export function CheckoutWallet() {
  const [estado, setEstado] = useState<'fechado' | 'carregando' | 'pronto' | 'erro'>('fechado');
  const controlador = useRef<WalletBrickController | null>(null);

  useEffect(() => () => controlador.current?.unmount(), []);

  if (!MERCADO_PAGO_PUBLIC_KEY) return null;

  async function abrir() {
    setEstado('carregando');
    try {
      const [MercadoPago, preferenceId] = await Promise.all([
        carregarSdkMercadoPago(),
        criarPreferencia('psicologia-vista'),
      ]);
      const mp = new MercadoPago(MERCADO_PAGO_PUBLIC_KEY!, { locale: 'pt-BR' });
      setEstado('pronto'); // o container precisa existir no DOM antes do create
      await new Promise((r) => requestAnimationFrame(r));
      controlador.current?.unmount();
      controlador.current = await mp.bricks().create('wallet', ID_CONTAINER, {
        initialization: { preferenceId },
        customization: { texts: { valueProp: 'security_details' } },
        callbacks: { onError: () => setEstado('erro') },
      });
    } catch {
      setEstado('erro');
    }
  }

  return (
    <div className="mt-6 border-t border-sage/50 pt-5">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-ink">Ou pague direto aqui</p>
        <span className="rounded bg-ouro/25 px-1.5 py-0.5 text-[11px] font-semibold text-ink">versão de teste</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        R$ 599,90 à vista no Pix ou débito, sem sair da página. Em validação: os botões acima continuam valendo.
      </p>

      {estado === 'fechado' && (
        <button
          type="button"
          onClick={abrir}
          className="mt-3 inline-flex h-10 items-center justify-center rounded-md border border-petroleo/40 px-4 text-sm font-medium text-petroleo transition-colors hover:bg-petroleo/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petroleo-medio"
        >
          Pagar direto aqui
        </button>
      )}
      {estado === 'carregando' && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Preparando o pagamento…
        </p>
      )}
      {estado === 'erro' && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          Não foi possível carregar o pagamento direto agora. Use um dos botões acima.
        </p>
      )}
      <div id={ID_CONTAINER} className={estado === 'pronto' ? 'mt-3' : 'hidden'} />
    </div>
  );
}
