import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { avaliacaoIUApi, pacientesApi } from '@/api/resources';
import {
  LOCAL_LABEL, PERFIL_LABEL, DESTREZA_LABEL, TIPO_IU_LABEL, ENCAMINHAMENTO_LABEL,
} from '@/types';

export function AvaliacaoImpressaoPage() {
  const { id: pacienteId, avaliacaoId } = useParams<{ id: string; avaliacaoId: string }>();
  const navigate = useNavigate();

  const pacienteQ = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesApi.get(pacienteId!),
    enabled: !!pacienteId,
  });
  const avaliacaoQ = useQuery({
    queryKey: ['avaliacao-iu-single', avaliacaoId],
    queryFn: () => avaliacaoIUApi.get(avaliacaoId!),
    enabled: !!avaliacaoId,
  });

  const paciente = pacienteQ.data;
  const av = avaliacaoQ.data;

  if (avaliacaoQ.isLoading || pacienteQ.isLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  function check(val: boolean | undefined) {
    return val ? '☑' : '☐';
  }

  return (
    <>
      <div className="print:hidden flex items-center gap-3 p-4 border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Ficha de Avaliação — Hollister VaPro</span>
        <Button size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="avaliacao-print max-w-3xl mx-auto p-8 text-gray-900 bg-white min-h-screen print:p-0 print:max-w-full text-sm">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
          <div>
            <h1 className="text-base font-bold uppercase tracking-wide">Ficha de Avaliação de Incontinência Urinária</h1>
            <p className="text-xs text-gray-500 mt-0.5">Produto VaPro Hollister — Uso exclusivo para cateterismo intermitente</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Data: {av?.dataAtendimento ? dayjs(av.dataAtendimento).format('DD/MM/YYYY') : '—'}</p>
            <p>Local: {av?.local ? LOCAL_LABEL[av.local] : '—'}</p>
          </div>
        </div>

        {/* Dados do paciente */}
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Paciente</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <div><span className="font-semibold">Nome:</span> {paciente?.nome ?? '—'}</div>
            <div><span className="font-semibold">CPF:</span> {paciente?.cpf ?? '—'}</div>
            <div><span className="font-semibold">Data de Nascimento:</span> {paciente?.dataNascimento ? dayjs(paciente.dataNascimento).format('DD/MM/YYYY') : '—'}</div>
            <div><span className="font-semibold">Sexo:</span> {paciente?.sexo ?? '—'}</div>
            {av?.planoSaude && <div><span className="font-semibold">Plano de Saúde:</span> {av.planoSaude}</div>}
            {av?.hospitalReferencia && <div><span className="font-semibold">Hospital Ref.:</span> {av.hospitalReferencia}</div>}
          </div>
        </section>

        {/* Quadro clínico */}
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Quadro Clínico</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <div><span className="font-semibold">Motivo / Diagnóstico:</span> {av?.motivoIU ?? '—'}</div>
            <div><span className="font-semibold">Início dos sintomas:</span> {av?.inicioSintomas ?? '—'}</div>
            <div><span className="font-semibold">Perfil do cliente:</span> {av?.perfilCliente ? PERFIL_LABEL[av.perfilCliente] : '—'}</div>
            <div><span className="font-semibold">Destreza:</span> {av?.destreza ? DESTREZA_LABEL[av.destreza] : '—'}</div>
          </div>
        </section>

        {/* Tipos de IU */}
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Tipo de Incontinência Urinária</h2>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            {Object.entries(TIPO_IU_LABEL).map(([k, v]) => (
              <div key={k}>{(av?.tiposIU ?? []).includes(k as never) ? '☑' : '☐'} {v}</div>
            ))}
          </div>
          {av?.dntui && <p className="mt-1 text-xs text-gray-600">DNTUI confirmada</p>}
        </section>

        {/* Cateterismo */}
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Cateterismo</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <div>{check(av?.miccaoEspontanea)} Micção espontânea &nbsp;&nbsp; {check(av?.realizaCateterismo)} Realiza cateterismo</div>
            <div><span className="font-semibold">Cateterismos/dia:</span> {av?.cateterismosDia ?? '—'}</div>
            <div><span className="font-semibold">Catéter atual:</span> {av?.cateterUtilizado ?? '—'}</div>
            <div><span className="font-semibold">Volume drenado:</span> {av?.volumeDrenadoMl ?? '—'} mL</div>
            <div><span className="font-semibold">Responsável:</span> {av?.responsavelCateterismo ?? '—'}</div>
            {av?.outrasIntercorrencias && (
              <div className="col-span-2"><span className="font-semibold">Intercorrências / Medicamentos:</span> {av.outrasIntercorrencias}</div>
            )}
          </div>
        </section>

        {/* Produto indicado */}
        {av?.produtoIndicado && (
          <section className="mb-5">
            <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Produto Indicado</h2>
            <div className="grid grid-cols-3 gap-x-8 gap-y-1">
              <div><span className="font-semibold">Código:</span> {av.produtoIndicado.codigo}</div>
              <div><span className="font-semibold">Sexo:</span> {av.produtoIndicado.sexo}</div>
              <div><span className="font-semibold">French:</span> {av.produtoIndicado.french} Fr</div>
            </div>
          </section>
        )}

        {/* Encaminhamento */}
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Encaminhamento</h2>
          <p>{av?.encaminhamento ? ENCAMINHAMENTO_LABEL[av.encaminhamento] : '—'}</p>
          {av?.localEncaminhamento && <p className="text-gray-600">Local: {av.localEncaminhamento}</p>}
        </section>

        {/* Consentimento */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Consentimento</h2>
          <p>{check(av?.autorizaPesquisa)} Autoriza uso de dados para pesquisa (Hollister)</p>
          <p>{check(av?.aceitaInformacoes)} Aceita receber informações por e-mail / WhatsApp</p>
          {av?.emailContato && <p className="mt-1 text-gray-600">E-mail: {av.emailContato}</p>}
          {av?.whatsappContato && <p className="text-gray-600">WhatsApp: {av.whatsappContato}</p>}
        </section>

        {/* Assinatura enfermeiro */}
        <div className="mt-12 flex justify-between items-end">
          <div className="text-center min-w-52">
            <div className="border-t-2 border-gray-800 pt-1">
              <p className="font-semibold">Enfermeiro(a) Responsável</p>
              <p className="text-xs text-gray-600">COREN: {av?.coren ?? '___________'}</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Assinatura do Paciente / Responsável:</p>
            <p className="mt-6 border-t border-gray-400 pt-1">_____________________________</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .avaliacao-print { color: #111 !important; background: white !important; font-size: 11pt; }
          body { margin: 0; }
        }
      `}</style>
    </>
  );
}
