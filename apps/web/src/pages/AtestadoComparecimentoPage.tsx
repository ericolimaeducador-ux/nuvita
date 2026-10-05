import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export function AtestadoComparecimentoPage() {
  const { id: pacienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modo, setModo] = useState<'compor' | 'imprimir'>('compor');

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
  const ultimaSessao = sessoes[0];

  const [dataAtendimento, setDataAtendimento] = useState('');

  useEffect(() => {
    setDataAtendimento(
      ultimaSessao ? dayjs(ultimaSessao.dataAtendimento).format('YYYY-MM-DDTHH:mm') : dayjs().format('YYYY-MM-DDTHH:mm'),
    );
  }, [ultimaSessao]);

  const paciente = pacienteQ.data;
  const carregando = pacienteQ.isLoading || sessoesQ.isLoading;
  // Sem paciente e histórico não se emite documento: nada de nome em branco nem de histórico vazio.
  const falha = primeiraFalha(pacienteQ, sessoesQ);

  if (modo === 'imprimir' && !falha) {
    return (
      <DocumentoClinicoLayout rotulo="Atestado de Comparecimento" onVoltar={() => setModo('compor')}>
        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-base font-bold uppercase tracking-wide">Atestado de Comparecimento</h1>
          <p className="text-xs text-gray-500">Emitido em {dayjs().format('DD/MM/YYYY')}</p>
        </div>

        <p className="leading-relaxed">
          Atesto para os devidos fins que <strong>{paciente?.nome}</strong> compareceu a atendimento
          psicológico em <strong>{dayjs(dataAtendimento).format('DD/MM/YYYY')}</strong>, às{' '}
          <strong>{dayjs(dataAtendimento).format('HH:mm')}</strong>.
        </p>

        <DocumentoAssinatura />
      </DocumentoClinicoLayout>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Atestado de Comparecimento"
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dataAtendimento">Data e horário do atendimento</Label>
                <Input
                  id="dataAtendimento" type="datetime-local"
                  value={dataAtendimento} onChange={(e) => setDataAtendimento(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={() => setModo('imprimir')} disabled={!dataAtendimento}>
              <FileText className="mr-2 h-4 w-4" /> Gerar atestado
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
