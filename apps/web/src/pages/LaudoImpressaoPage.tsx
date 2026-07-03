import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { laudoMedicoApi, pacientesApi } from '@/api/resources';
import { formatData } from '@/utils';
import { DocumentoTimbre, DocumentoRodape } from '@/components/DocumentoTimbre';

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

  if (laudoQ.isLoading || pacienteQ.isLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 w-full" /></div>;
  }

  return (
    <>
      {/* Botões só na tela, não imprimem */}
      <div className="print:hidden flex items-center gap-3 p-4 border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Prévia do Laudo Médico</span>
        <Button size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Conteúdo imprimível */}
      <div className="laudo-print max-w-3xl mx-auto p-8 text-gray-900 bg-white min-h-screen print:p-0 print:max-w-full">
        {/* Timbre Nuvita */}
        <DocumentoTimbre />

        {/* Cabeçalho */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-xl font-bold uppercase tracking-wide">LAUDO MÉDICO</h1>
          <p className="text-sm text-gray-600 mt-1">Solicitação de Material junto ao SUS — Lei nº 8.080/90</p>
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

        {/* Assinatura */}
        <div className="mt-16 flex justify-between items-end">
          <div className="text-center min-w-52">
            {laudo?.assinado && (
              <div className="border border-gray-400 rounded px-3 py-1 text-xs text-gray-600 mb-2 inline-block">
                ✓ Assinado digitalmente em {laudo.assinado.dataAssinatura ? dayjs(laudo.assinado.dataAssinatura).format('DD/MM/YYYY HH:mm') : '—'}
              </div>
            )}
            <div className="border-t-2 border-gray-800 pt-1">
              <p className="text-sm font-semibold">___________________________</p>
              <p className="text-xs text-gray-600">Médico Responsável (CRM: ___________)</p>
            </div>
          </div>
          <div className="text-sm text-gray-500 text-right">
            <p>Local e data:</p>
            <p>_____________________________</p>
          </div>
        </div>

        <DocumentoRodape />
      </div>

      <style>{`
        @media print {
          .laudo-print { color: #111 !important; background: white !important; }
          body { margin: 0; }
        }
      `}</style>
    </>
  );
}
