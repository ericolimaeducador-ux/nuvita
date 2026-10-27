import { useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { DocumentoClinicoLayout } from '@/components/DocumentoClinicoLayout';
import { ErroConsulta } from '@/components/ErroConsulta';
import { agendaApi, pacientesApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { primeiraFalha } from '@/lib/consulta';
import { toItems } from '@/utils';
import { StatusAgendamento, type Agendamento, type DocumentoEmitido } from '@/types';

interface Props {
  titulo: string;
  rotuloBotao: string;
  corpoTestId: string;
  /** Pede o documento ao servidor: só ids, nunca data/hora. */
  emitir: (args: { pacienteId: string; agendamentoId: string }) => Promise<DocumentoEmitido>;
  renderAssinatura: (documento: DocumentoEmitido) => ReactNode;
}

/**
 * Documento de comparecimento. A tela escolhe um atendimento CONCLUÍDO da agenda e pede o documento ao
 * servidor; o texto, a data/hora e os dados de assinatura vêm prontos de lá, e a tela só renderiza.
 * Sem atendimento concluído, não há o que emitir.
 */
export function EmissaoComparecimento({ titulo, rotuloBotao, corpoTestId, emitir, renderAssinatura }: Props) {
  const { id: pacienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [escolhido, setEscolhido] = useState<string>();
  const [documento, setDocumento] = useState<DocumentoEmitido>();

  const pacienteQ = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesApi.get(pacienteId!),
    enabled: !!pacienteId,
  });
  const agendaQ = useQuery({
    queryKey: ['agendamentos-comparecimento', pacienteId],
    queryFn: () => agendaApi.list({ pacienteId: pacienteId!, status: StatusAgendamento.CONCLUIDO }),
    enabled: !!pacienteId,
  });
  const emissao = useMutation({
    mutationFn: () => emitir({ pacienteId: pacienteId!, agendamentoId: escolhido! }),
    onSuccess: setDocumento,
  });

  const concluidos = toItems<Agendamento>(agendaQ.data)
    .filter((a) => a.status === StatusAgendamento.CONCLUIDO)
    .sort((a, b) => dayjs(b.dataHoraInicio).valueOf() - dayjs(a.dataHoraInicio).valueOf());
  const paciente = pacienteQ.data;
  const falha = primeiraFalha(pacienteQ, agendaQ);
  const carregando = pacienteQ.isLoading || agendaQ.isLoading;

  if (documento) {
    return (
      <DocumentoClinicoLayout rotulo={documento.titulo} onVoltar={() => setDocumento(undefined)}>
        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-base font-bold uppercase tracking-wide">{documento.titulo}</h1>
          <p className="text-xs text-gray-500">Emitido em {dayjs(documento.emitidoEm).format('DD/MM/YYYY')}</p>
        </div>
        <p className="leading-relaxed" data-testid={corpoTestId}>{documento.corpo}</p>
        {renderAssinatura(documento)}
        <p className="mt-8 text-center text-xs text-gray-500">Protocolo {documento.protocolo}</p>
      </DocumentoClinicoLayout>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title={titulo}
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
        <ErroConsulta erro={falha.error} refetch={falha.refetch} recurso="os dados do paciente e a agenda" />
      ) : concluidos.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhum atendimento concluído na agenda deste paciente. O documento só é emitido para um atendimento
            concluído. Registre a sessão em Atendimento Psicológico para que o atendimento fique concluído e volte aqui.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium mb-2">Atendimento da agenda</legend>
              {concluidos.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio" name="atendimento" value={a.id}
                    checked={escolhido === a.id} onChange={() => setEscolhido(a.id)}
                  />
                  {dayjs(a.dataHoraInicio).format('DD/MM/YYYY')}, das {dayjs(a.dataHoraInicio).format('HH:mm')} às{' '}
                  {dayjs(a.dataHoraFim).format('HH:mm')}
                </label>
              ))}
            </fieldset>
            {emissao.isError && (
              <p role="alert" className="text-sm text-destructive">
                {apiErrorMessage(emissao.error, 'Não foi possível emitir o documento.')}
              </p>
            )}
            <Button onClick={() => emissao.mutate()} disabled={!escolhido || emissao.isPending}>
              <FileText className="mr-2 h-4 w-4" /> {emissao.isPending ? 'Emitindo…' : rotuloBotao}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
