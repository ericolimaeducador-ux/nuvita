import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft, FileDown } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { laudoMedicoApi, pacientesApi, produtosApi } from '@/api/resources';
import { montarLaudoNarrativa, type LaudoNode, type Run } from '@/utils/laudoMedicoTexto';

function runsToDocxTextRuns(runs: Run[]): TextRun[] {
  return runs.map((r) => new TextRun({ text: r.text, bold: r.bold, italics: r.missing }));
}

/** Monta o .docx do relatório — mesmo texto narrativo da tela, sem logo/rodapé, assinatura em branco. */
async function gerarDocxLaudo(nodes: LaudoNode[]) {
  const linhas: Paragraph[] = [];

  for (const node of nodes) {
    if (node.type === 'heading') {
      linhas.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: node.text, bold: true })], spacing: { after: 300 } }));
    } else if (node.type === 'objetivoBox') {
      linhas.push(new Paragraph({ children: runsToDocxTextRuns(node.runs), spacing: { after: 200 }, border: { top: { style: 'single', size: 4, color: 'AAAAAA' }, bottom: { style: 'single', size: 4, color: 'AAAAAA' }, left: { style: 'single', size: 4, color: 'AAAAAA' }, right: { style: 'single', size: 4, color: 'AAAAAA' } } }));
    } else if (node.type === 'subheading') {
      linhas.push(new Paragraph({ children: [new TextRun({ text: node.text, bold: true })], spacing: { before: 200, after: 100 } }));
    } else if (node.type === 'paragraph') {
      linhas.push(new Paragraph({ children: runsToDocxTextRuns(node.runs), alignment: AlignmentType.JUSTIFIED, spacing: { after: 150 } }));
    } else if (node.type === 'list') {
      for (const item of node.items) {
        linhas.push(new Paragraph({ children: runsToDocxTextRuns(item), bullet: { level: 0 }, spacing: { after: 100 } }));
      }
    } else if (node.type === 'signature') {
      linhas.push(
        new Paragraph({ text: '', spacing: { before: 600 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: runsToDocxTextRuns(node.local) }),
        new Paragraph({ text: '_____________________________________', alignment: AlignmentType.CENTER }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: node.nomeMedico.map((r) => new TextRun({ text: r.text, bold: true, italics: r.missing })) }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: runsToDocxTextRuns(node.especialidadeCrm) }),
      );
    }
  }

  const doc = new Document({ sections: [{ children: linhas }] });
  return Packer.toBlob(doc);
}

function RunsView({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <span key={i} className={r.missing ? 'bg-amber-100 text-amber-800 italic px-0.5 print:bg-transparent print:text-inherit print:not-italic' : undefined}>
          {r.bold ? <strong>{r.text}</strong> : r.text}
        </span>
      ))}
    </>
  );
}

function LaudoNodeView({ node }: { node: LaudoNode }) {
  if (node.type === 'heading') {
    return <h2 className="text-center text-lg tracking-widest border-b-2 border-gray-800 pb-2 mb-6 font-semibold">{node.text}</h2>;
  }
  if (node.type === 'objetivoBox') {
    return (
      <p className="text-sm border border-gray-300 bg-gray-50 rounded p-3 mb-4">
        <RunsView runs={node.runs} />
      </p>
    );
  }
  if (node.type === 'subheading') {
    return <h3 className="text-sm font-bold uppercase mt-6 mb-2">{node.text}</h3>;
  }
  if (node.type === 'paragraph') {
    return (
      <p className={`text-sm leading-relaxed text-justify my-3 ${node.noIndent ? '' : 'indent-8'}`}>
        <RunsView runs={node.runs} />
      </p>
    );
  }
  if (node.type === 'list') {
    return (
      <ul className="list-disc ml-8 my-3 space-y-2">
        {node.items.map((item, i) => (
          <li key={i} className="text-sm text-justify"><RunsView runs={item} /></li>
        ))}
      </ul>
    );
  }
  // signature
  return (
    <div className="mt-16 text-center break-inside-avoid">
      <p className="text-sm mb-8"><RunsView runs={node.local} /></p>
      <div className="border-t border-gray-800 w-80 mx-auto mb-1" />
      <p className="text-sm font-semibold"><RunsView runs={node.nomeMedico} /></p>
      <p className="text-xs text-gray-600"><RunsView runs={node.especialidadeCrm} /></p>
    </div>
  );
}

export function LaudoImpressaoPage() {
  const { id: pacienteId, laudoId } = useParams<{ id: string; laudoId: string }>();
  const navigate = useNavigate();

  const pacienteQ = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesApi.get(pacienteId!),
    enabled: !!pacienteId,
  });
  const laudoQ = useQuery({
    queryKey: ['laudo-medico-single', laudoId],
    queryFn: () => laudoMedicoApi.get(laudoId!),
    enabled: !!laudoId,
  });
  const produtosQ = useQuery({
    queryKey: ['produtos'],
    queryFn: () => produtosApi.list(),
  });

  const paciente = pacienteQ.data;
  const laudo = laudoQ.data;
  const produtos = produtosQ.data ?? [];

  const nodes = laudo && paciente ? montarLaudoNarrativa(laudo, paciente, produtos) : [];

  async function baixarDocx() {
    const blob = await gerarDocxLaudo(nodes);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-medico-${paciente?.nome?.replace(/\s+/g, '-').toLowerCase() ?? pacienteId}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (laudoQ.isLoading || pacienteQ.isLoading || produtosQ.isLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 w-full" /></div>;
  }

  return (
    <>
      {/* Botões só na tela, não imprimem */}
      <div className="print:hidden flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Prévia do Relatório Médico Judiciário</span>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => void baixarDocx()}>
          <FileDown className="h-4 w-4 mr-2" /> Baixar .doc
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Conteúdo imprimível */}
      <div className="laudo-print max-w-3xl mx-auto p-8 text-gray-900 bg-white min-h-screen print:min-h-0 print:max-w-full">
        {nodes.map((node, i) => <LaudoNodeView key={i} node={node} />)}
      </div>

      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          .laudo-print {
            color: #111 !important;
            background: white !important;
            padding: 12mm 14mm !important;
            min-height: auto !important;
          }
        }
      `}</style>
    </>
  );
}
