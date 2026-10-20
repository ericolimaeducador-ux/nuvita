import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentoTimbre, DocumentoRodape } from '@/components/DocumentoTimbre';
import { GateCrpEmissao } from '@/components/GateCrpEmissao';

/**
 * Moldura de impressão compartilhada pelos documentos clínicos gerados
 * (atestado, laudo, encaminhamento, prescrição) — mesmo padrão de
 * ProntuarioImpressaoPage.tsx (timbre/rodapé + window.print()), só extraída
 * porque aqui são 4 páginas repetindo o mesmo chrome.
 */
export function DocumentoClinicoLayout({
  rotulo, onVoltar, children,
}: { rotulo: string; onVoltar: () => void; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <GateCrpEmissao>
      <div className="print:hidden flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Prévia — {rotulo}</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={onVoltar}>Voltar e editar</Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      <div className="documento-clinico-print max-w-3xl mx-auto p-8 text-gray-900 bg-white min-h-screen print:min-h-0 print:max-w-full text-sm">
        <DocumentoTimbre />
        {children}
        <DocumentoRodape />
      </div>

      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          .documento-clinico-print {
            color: #111 !important;
            background: white !important;
            font-size: 10pt;
            padding: 10mm 14mm !important;
            min-height: auto !important;
          }
        }
      `}</style>
    </GateCrpEmissao>
  );
}
