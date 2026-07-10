import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft, FileDown } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { laudoMedicoApi, pacientesApi } from '@/api/resources';
import { formatData } from '@/utils';
import type { LaudoMedico, Paciente } from '@/types';

/** Monta o .docx do relatório médico — mesmo conteúdo da tela, sem logo/rodapé, assinatura em branco. */
async function gerarDocxLaudo(laudo: LaudoMedico | undefined, paciente: Paciente | undefined) {
  const rotulo = (texto: string) => new TextRun({ text: texto, bold: true });

  const linhas: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: '================== RELATÓRIO MÉDICO ======================', bold: true, font: 'Courier New' })],
      spacing: { after: 300 },
    }),
    new Paragraph({ children: [rotulo('Nome: '), new TextRun(paciente?.nome ?? '—')] }),
    new Paragraph({ children: [rotulo('CPF: '), new TextRun(paciente?.cpf ?? '—')] }),
    new Paragraph({ children: [rotulo('Data de Nascimento: '), new TextRun(formatData(paciente?.dataNascimento))] }),
    new Paragraph({ children: [rotulo('Sexo: '), new TextRun(paciente?.sexo ?? '—')], spacing: { after: 200 } }),
    new Paragraph({ children: [rotulo('Data do Laudo: '), new TextRun(formatData(laudo?.dataLaudo))] }),
    new Paragraph({ children: [rotulo('CID-10: '), new TextRun(laudo?.cid10?.join(', ') ?? '—')], spacing: { after: 200 } }),
    new Paragraph({ children: [rotulo('Justificativa Médica')], spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun(laudo?.justificativaMedica ?? '—')], spacing: { after: 200 } }),
    new Paragraph({ children: [rotulo('Fundamento Legal')], spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun(laudo?.fundamentoLegal ?? '—')], spacing: { after: 200 } }),
  ];

  if (laudo?.produtosSolicitados && laudo.produtosSolicitados.length > 0) {
    const celula = (texto: string, negrito = false) =>
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: texto, bold: negrito })] })] });

    linhas.push(
      new Paragraph({ children: [rotulo('Produtos Solicitados')], spacing: { before: 100, after: 100 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [celula('Descrição', true), celula('Código SIAFISICO', true), celula('Quantidade', true), celula('Unidade', true)],
          }),
          ...laudo.produtosSolicitados.map(
            (p) => new TableRow({ children: [celula(p.descricao), celula(p.codigoSiafisico != null ? String(p.codigoSiafisico) : '—'), celula(String(p.quantidade)), celula(p.unidade)] }),
          ),
        ],
      }),
    );
  }

  linhas.push(
    new Paragraph({ text: '', spacing: { before: 800 } }),
    new Paragraph({ text: '_____________________________________' }),
    new Paragraph({ children: [new TextRun({ text: 'Médico Responsável', bold: true })] }),
    new Paragraph({ text: 'CRM: ___________' }),
  );

  const doc = new Document({ sections: [{ children: linhas }] });
  return Packer.toBlob(doc);
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

  const paciente = pacienteQ.data;
  const laudo = laudoQ.data;

  async function baixarDocx() {
    const blob = await gerarDocxLaudo(laudo, paciente);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-medico-${paciente?.nome?.replace(/\s+/g, '-').toLowerCase() ?? pacienteId}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (laudoQ.isLoading || pacienteQ.isLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 w-full" /></div>;
  }

  return (
    <>
      {/* Botões só na tela, não imprimem */}
      <div className="print:hidden flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Prévia do Laudo Médico</span>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => void baixarDocx()}>
          <FileDown className="h-4 w-4 mr-2" /> Baixar .doc
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Conteúdo imprimível */}
      <div className="laudo-print max-w-3xl mx-auto p-8 text-gray-900 bg-white min-h-screen print:min-h-0 print:max-w-full">
        {/* Cabeçalho — sem logo nem dados da clínica, apenas o título do documento */}
        <div className="text-center pb-4 mb-6">
          <p className="font-mono font-bold text-sm tracking-wide whitespace-pre">
            ================== RELATÓRIO MÉDICO ======================
          </p>
        </div>

        {/* Dados do paciente */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">
            Identificação do Paciente
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div><span className="font-semibold">Nome:</span> {paciente?.nome ?? '—'}</div>
            <div><span className="font-semibold">CPF:</span> {paciente?.cpf ?? '—'}</div>
            <div><span className="font-semibold">Data de Nascimento:</span> {formatData(paciente?.dataNascimento)}</div>
            <div><span className="font-semibold">Sexo:</span> {paciente?.sexo ?? '—'}</div>
          </div>
        </section>

        {/* Dados do laudo */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">
            Dados do Laudo
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-3">
            <div><span className="font-semibold">Data:</span> {formatData(laudo?.dataLaudo)}</div>
            <div><span className="font-semibold">CID-10:</span> {laudo?.cid10?.join(', ') ?? '—'}</div>
          </div>
        </section>

        {/* Justificativa */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">
            Justificativa Médica
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-line">{laudo?.justificativaMedica ?? '—'}</p>
        </section>

        {/* Fundamento legal */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">
            Fundamento Legal
          </h2>
          <p className="text-sm leading-relaxed">{laudo?.fundamentoLegal ?? '—'}</p>
        </section>

        {/* Produtos */}
        {laudo?.produtosSolicitados && laudo.produtosSolicitados.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">
              Produtos Solicitados
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2 font-semibold">Descrição</th>
                  <th className="text-center p-2 font-semibold">Código SIAFISICO</th>
                  <th className="text-center p-2 font-semibold">Quantidade</th>
                  <th className="text-right p-2 font-semibold">Unidade</th>
                </tr>
              </thead>
              <tbody>
                {laudo.produtosSolicitados.map((p, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="p-2">{p.descricao}</td>
                    <td className="p-2 text-center">{p.codigoSiafisico ?? '—'}</td>
                    <td className="p-2 text-center">{p.quantidade}</td>
                    <td className="p-2 text-right">{p.unidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Assinatura — em branco para carimbo e assinatura física do médico */}
        <div className="mt-24 print:mt-20 flex justify-between items-end break-inside-avoid">
          <div className="text-center min-w-52">
            <div className="border-t-2 border-gray-800 pt-1">
              <p className="text-sm font-semibold">Médico Responsável</p>
              <p className="text-xs text-gray-600">CRM: ___________</p>
            </div>
          </div>
          <div className="text-sm text-gray-500 text-right">
            <p>Local e data:</p>
            <p>_____________________________</p>
          </div>
        </div>
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
