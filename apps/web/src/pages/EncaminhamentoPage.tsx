import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { DocumentoClinicoLayout } from '@/components/DocumentoClinicoLayout';
import { DocumentoAssinatura } from '@/components/DocumentoAssinatura';
import { pacientesApi, prontuariosApi } from '@/api/resources';
import { toItems } from '@/utils';
import { ErroConsulta } from '@/components/ErroConsulta';
import { primeiraFalha } from '@/lib/consulta';
import { TipoAtendimento, type Prontuario } from '@/types';

export function EncaminhamentoPage() {
  const { id: pacienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modo, setModo] = useState<'compor' | 'imprimir'>('compor');
  const [destino, setDestino] = useState('');
  const [motivo, setMotivo] = useState('');
  const [motivoAplicado, setMotivoAplicado] = useState(false);

  const pacienteQ = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesApi.get(pacienteId!),
    enabled: !!pacienteId,
  });
  const sessoesQ = useQuery({
    queryKey: ['sessoes-psicologia', pacienteId],
    queryFn: () => prontuariosApi.list({ pacienteId: pacienteId! }),
    enabled: !!pacienteId,
  });
  const sessoes = toItems<Prontuario>(sessoesQ.data)
    .filter((p) => p.tipo === TipoAtendimento.PSICOTERAPIA)
    .sort((a, b) => dayjs(b.dataAtendimento).valueOf() - dayjs(a.dataAtendimento).valueOf());

  useEffect(() => {
    if (motivoAplicado || sessoesQ.isLoading || sessoesQ.isError) return;
    const comEncaminhamento = sessoes.find((s) => s.registroPsicologico?.encaminhamentos?.trim());
    if (comEncaminhamento) setMotivo(comEncaminhamento.registroPsicologico!.encaminhamentos!);
    setMotivoAplicado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessoesQ.isLoading, sessoesQ.isError]);

  const paciente = pacienteQ.data;
  const carregando = pacienteQ.isLoading || sessoesQ.isLoading;
  // Sem paciente e histórico não se emite documento: nada de nome em branco nem de histórico vazio.
  const falha = primeiraFalha(pacienteQ, sessoesQ);

  if (modo === 'imprimir' && !falha) {
    return (
      <DocumentoClinicoLayout rotulo="Encaminhamento" onVoltar={() => setModo('compor')}>
        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-base font-bold uppercase tracking-wide">Encaminhamento</h1>
          <p className="text-xs text-gray-500">{dayjs().format('DD/MM/YYYY')}</p>
        </div>

        <p className="text-xs text-gray-500 mb-1">Ao(À) profissional / serviço:</p>
        <p className="font-semibold mb-4">{destino}</p>

        <p className="leading-relaxed whitespace-pre-wrap">
          Encaminho o(a) paciente <strong>{paciente?.nome}</strong>, em acompanhamento psicoterápico
          nesta clínica, para avaliação/acompanhamento complementar.
          {motivo && <><br /><br />Motivo: {motivo}</>}
        </p>

        <DocumentoAssinatura />
      </DocumentoClinicoLayout>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Encaminhamento a outro profissional"
        subtitle={paciente ? `Paciente: ${paciente.nome}` : falha ? 'Dados indisponíveis' : 'Carregando…'}
        extra={
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        }
      />

      {carregando ? (
        <Skeleton className="h-64 w-full" />
      ) : falha ? (
        <ErroConsulta erro={falha.error} refetch={falha.refetch} recurso="os dados do paciente e o histórico de sessões" />
      ) : (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destino">Profissional / especialidade de destino</Label>
              <Input
                id="destino" placeholder="Ex.: Psiquiatra, Neurologista, Assistência Social…"
                value={destino} onChange={(e) => setDestino(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo do encaminhamento</Label>
              <Textarea id="motivo" rows={6} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>

            <Button onClick={() => setModo('imprimir')} disabled={!destino.trim()}>
              <FileText className="mr-2 h-4 w-4" /> Gerar encaminhamento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
