import { QRCodeSVG } from 'qrcode.react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

interface SegredoDoisFatoresProps {
  /** Chave em texto (base32), para quem prefere digitar no aplicativo. */
  base32: string;
  /** URL otpauth:// gerada pela API — o QR code é desenhado a partir dela. Ausente = só o texto. */
  otpauthUrl?: string | null;
}

/**
 * Segundo fator recém-gerado, exibido UMA vez: QR code para ler no aplicativo
 * autenticador e a mesma chave em texto. As duas formas cadastram o mesmo segredo;
 * quem recebe escolhe (decisão de 15/10/2026, correção C1 do teste beta).
 *
 * O QR fica sobre fundo branco fixo, em qualquer tema: leitores de QR falham em
 * fundo escuro.
 */
export function SegredoDoisFatores({ base32, otpauthUrl }: SegredoDoisFatoresProps) {
  return (
    <div className="space-y-3">
      {otpauthUrl && (
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-lg bg-white p-3" aria-label="QR code do segundo fator">
            <QRCodeSVG value={otpauthUrl} size={176} level="M" marginSize={0} />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            No Google Authenticator ou no Microsoft Authenticator: toque em <b>+</b> e em <b>Ler código QR</b>.
          </p>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">
          {otpauthUrl ? 'Ou digite a chave (Inserir chave de configuração, tipo baseado em tempo)' : 'Chave do segundo fator'}
        </Label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary p-3">
          <code className="flex-1 text-sm font-mono break-all select-all">{base32}</code>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Copiar chave"
            onClick={() => {
              void navigator.clipboard.writeText(base32);
              toast.success('Chave copiada.');
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
