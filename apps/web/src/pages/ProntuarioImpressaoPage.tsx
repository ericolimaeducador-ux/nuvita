import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { prontuariosApi, pacientesApi } from '@/api/resources';
import { formatData, formatEndereco } from '@/utils';
import { DocumentoTimbre, DocumentoRodape } from '@/components/DocumentoTimbre';
import { TipoAtendimento, TIPO_ATENDIMENTO_LABEL, REGISTRO_PSICOLOGICO_CAMPOS, type ExameSegmentar } from '@/types';

const EXAME_SEGMENTAR_CAMPOS: { key: keyof ExameSegmentar; label: string }[] = [
  { key: 'cabecaPescoco', label: 'Cabeça e pescoço' },
  { key: 'cardiovascular', label: 'Cardiovascular' },
  { key: 'respiratorio', label: 'Respiratório' },
  { key: 'abdome', label: 'Abdome' },
  { key: 'geniturinario', label: 'Geniturinário' },
  { key: 'neurologico', label: 'Neurológico' },
  { key: 'extremidades', label: 'Extremidades' },
  { key: 'pele', label: 'Pele e mucosas' },
];

function Campo({ label, children }: { label: string; children?: React.ReactNode }) {
  if (children === undefined || children === null || children === '' ||
      (Array.isArray(children) && children.length === 0)) return null;
  return (
    <div>
      <span className="font-semibold">{label}:</span> {children}
    </div>
  );
}

export function ProntuarioImpressaoPage() {
  const { id: pacienteId, prontuarioId } = useParams<{ id: string; prontuarioId: string }>();
  const navigate = useNavigate();

  const pacienteQ = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesApi.get(pacienteId!),
    enabled: !!pacienteId,
  });
  const prontuarioQ = useQuery({
    queryKey: ['prontuario', prontuarioId],
    queryFn: () => prontuariosApi.get(prontuarioId!),
    enabled: !!prontuarioId,
  });

  const paciente = pacienteQ.data;
  const pr = prontuarioQ.data;

  if (prontuarioQ.isLoading || pacienteQ.isLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  const isEnfermagem = pr?.tipo === TipoAtendimento.CONSULTA_ENFERMAGEM;
  const isPsicoterapia = pr?.tipo === TipoAtendimento.PSICOTERAPIA;
  const sv = pr?.objetivo?.sinaisVitais;
  const sinais = sv
    ? [
        sv.pressaoArterial && `PA ${sv.pressaoArterial}`,
        sv.frequenciaCardiaca && `FC ${sv.frequenciaCardiaca} bpm`,
        sv.frequenciaRespiratoria && `FR ${sv.frequenciaRespiratoria} irpm`,
        sv.temperatura && `Tax ${sv.temperatura} °C`,
        sv.saturacaoO2 && `SatO₂ ${sv.saturacaoO2}%`,
        sv.peso && `Peso ${sv.peso} kg`,
        sv.altura && `Altura ${sv.altura} cm`,
        sv.escalaDor !== undefined && `Dor ${sv.escalaDor}/10`,
      ].filter(Boolean).join('  ·  ')
    : '';
  const seg = pr?.objetivo?.exameSegmentar;

  return (
    <>
      {/* Botões só na tela, não imprimem */}
      <div className="print:hidden flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          Prévia do {isEnfermagem ? 'Registro de Enfermagem' : isPsicoterapia ? 'Registro de Atendimento Psicológico' : 'Prontuário (SOAP)'}
        </span>
        <Button size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Conteúdo imprimível */}
      <div className="prontuario-print max-w-3xl mx-auto p-8 text-gray-900 bg-white min-h-screen print:min-h-0 print:max-w-full text-sm">
        <DocumentoTimbre />

        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
          <div>
            <h1 className="text-base font-bold uppercase tracking-wide">
              {isEnfermagem ? 'Registro de Enfermagem' : isPsicoterapia ? 'Registro de Atendimento Psicológico' : 'Prontuário — SOAP'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">{pr ? (TIPO_ATENDIMENTO_LABEL[pr.tipo] ?? pr.tipo) : '—'}</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Data do atendimento: {pr?.dataAtendimento ? dayjs(pr.dataAtendimento).format('DD/MM/YYYY HH:mm') : '—'}</p>
          </div>
        </div>

        {/* Dados do paciente */}
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Paciente</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <div><span className="font-semibold">Nome:</span> {paciente?.nome ?? '—'}</div>
            <div><span className="font-semibold">CPF:</span> {paciente?.cpf ?? '—'}</div>
            <div><span className="font-semibold">Data de Nascimento:</span> {formatData(paciente?.dataNascimento)}</div>
            <div><span className="font-semibold">Sexo:</span> {paciente?.sexo ?? '—'}</div>
            {paciente?.telefone && <div><span className="font-semibold">Telefone:</span> {paciente.telefone}</div>}
            <div className="col-span-2"><span className="font-semibold">Endereço:</span> {formatEndereco(paciente?.endereco)}</div>
          </div>
        </section>

        {isEnfermagem ? (
          <section className="mb-5">
            <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Registro de Enfermagem</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-2">
              <Campo label="Ligação ao paciente">{pr?.registroEnfermagem?.dataLigacao && formatData(pr.registroEnfermagem.dataLigacao)}</Campo>
              <Campo label="Chegada da sonda">{pr?.registroEnfermagem?.sondaChegouEm && formatData(pr.registroEnfermagem.sondaChegouEm)}</Campo>
            </div>
            <p className="whitespace-pre-line">{pr?.registroEnfermagem?.observacoes || '—'}</p>
          </section>
        ) : isPsicoterapia ? (
          <section className="mb-5">
            <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Registro de Atendimento Psicológico</h2>
            <div className="space-y-1.5">
              {REGISTRO_PSICOLOGICO_CAMPOS.map(([key, label]) => (
                <Campo key={key} label={label}>{pr?.registroPsicologico?.[key]}</Campo>
              ))}
            </div>
          </section>
        ) : (
          <>
            <section className="mb-5">
              <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">S — Subjetivo / Anamnese</h2>
              <div className="space-y-1">
                <Campo label="Queixa principal">{pr?.subjetivo?.queixaPrincipal}</Campo>
                <Campo label="História da doença atual">{pr?.subjetivo?.hda}</Campo>
                <Campo label="Antecedentes pessoais">{pr?.subjetivo?.antecedentesPessoais}</Campo>
                <Campo label="Antecedentes cirúrgicos">{pr?.subjetivo?.antecedentesCirurgicos}</Campo>
                <Campo label="Medicamentos em uso">{pr?.subjetivo?.medicamentosEmUso}</Campo>
                <Campo label="Alergias">{pr?.subjetivo?.alergias}</Campo>
                <Campo label="História familiar">{pr?.subjetivo?.historiaFamiliar}</Campo>
                <Campo label="História social">{pr?.subjetivo?.historiaSocial}</Campo>
                <Campo label="Revisão de sistemas">{pr?.subjetivo?.revisaoSistemas}</Campo>
              </div>
            </section>

            <section className="mb-5">
              <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">O — Objetivo / Exame físico</h2>
              <div className="space-y-1">
                <Campo label="Estado geral">{pr?.objetivo?.estadoGeral}</Campo>
                <Campo label="Sinais vitais">{sinais}</Campo>
                {seg && Object.values(seg).some(Boolean) && (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                    {EXAME_SEGMENTAR_CAMPOS.map(({ key, label }) => (
                      <Campo key={key} label={label}>{seg[key]}</Campo>
                    ))}
                  </div>
                )}
                <Campo label="Outros achados">{pr?.objetivo?.exameFisico}</Campo>
              </div>
            </section>

            <section className="mb-5">
              <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">A — Avaliação</h2>
              <div className="space-y-1">
                <Campo label="Hipóteses diagnósticas">{pr?.avaliacao?.hipotesesDiagnosticas?.join(', ')}</Campo>
                <Campo label="CID-10">{pr?.avaliacao?.cid10?.join(', ')}</Campo>
                <Campo label="Diagnóstico definitivo">{pr?.avaliacao?.diagnosticoDefinitivo}</Campo>
                <Campo label="Evolução">{pr?.avaliacao?.evolucao}</Campo>
              </div>
            </section>

            <section className="mb-6">
              <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">P — Plano</h2>
              <div className="space-y-1">
                <Campo label="Conduta">{pr?.plano?.conduta}</Campo>
                <Campo label="Prescrição">{pr?.plano?.prescricao}</Campo>
                <Campo label="Exames solicitados">{pr?.plano?.examesSolicitados?.join(', ')}</Campo>
                <Campo label="Orientações">{pr?.plano?.orientacoes}</Campo>
                <Campo label="Encaminhamentos">{pr?.plano?.encaminhamentos}</Campo>
                <Campo label="Retorno">{pr?.plano?.retorno}</Campo>
              </div>
            </section>
          </>
        )}

        {/* Assinatura */}
        <div className="mt-12 print:mt-8 flex justify-between items-end break-inside-avoid">
          <div className="text-center min-w-52">
            {pr?.assinado && (
              <div className="border border-gray-400 rounded px-3 py-1 text-xs text-gray-600 mb-2 inline-block">
                ✓ Assinado digitalmente em {pr.assinado.dataAssinatura ? dayjs(pr.assinado.dataAssinatura).format('DD/MM/YYYY HH:mm') : '—'}
              </div>
            )}
            <div className="border-t-2 border-gray-800 pt-1">
              <p className="text-sm font-semibold">Profissional Responsável</p>
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
        @page { size: A4; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          .prontuario-print {
            color: #111 !important;
            background: white !important;
            font-size: 10pt;
            padding: 10mm 14mm !important;
            min-height: auto !important;
          }
        }
      `}</style>
    </>
  );
}
