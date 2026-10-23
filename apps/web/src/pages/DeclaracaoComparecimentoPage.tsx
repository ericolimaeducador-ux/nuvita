import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { DocumentoClinicoLayout } from '@/components/DocumentoClinicoLayout';
import { ErroConsulta } from '@/components/ErroConsulta';
import { agendaApi, pacientesApi } from '@/api/resources';
import { useAuth } from '@/auth/AuthContext';
import { useClinicaMinha } from '@/lib/useClinicaMinha';
import { primeiraFalha } from '@/lib/consulta';
import { preenchido } from '@/lib/timbre';
import { toItems } from '@/utils';
import { StatusAgendamento, type Agendamento } from '@/types';

/**
 * Declaração de comparecimento: documento ADMINISTRATIVO que a secretária emite. Afirma só a PRESENÇA
 * na clínica, sem dizer que houve atendimento psicológico (isso é do atestado clínico, privativo do
 * psicólogo). Data e horário vêm da AGENDA (atendimento concluído), nunca de campo digitável. Sem
 * atendimento concluído na agenda, não emite.
 */
export function DeclaracaoComparecimentoPage() {
  const { id: pacienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modo, setModo] = useState<'compor' | 'imprimir'>('compor');
  const [escolhido, setEscolhido] = useState<string>();

  const pacienteQ = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesApi.get(pacienteId!),
    enabled: !!pacienteId,
  });
  const agendaQ = useQuery({
    queryKey: ['agendamentos-declaracao', pacienteId],
    queryFn: () => agendaApi.list({ pacienteId: pacienteId!, status: StatusAgendamento.CONCLUIDO }),
    enabled: !!pacienteId,
  });
  const clinicaQ = useClinicaMinha();

  const concluidos = toItems<Agendamento>(agendaQ.data)
    .filter((a) => a.status === StatusAgendamento.CONCLUIDO)
    .sort((a, b) => dayjs(b.dataHoraInicio).valueOf() - dayjs(a.dataHoraInicio).valueOf());
  const atendimento = concluidos.find((a) => a.id === escolhido);

  const paciente = pacienteQ.data;
  const falha = primeiraFalha(pacienteQ, agendaQ);
  const carregando = pacienteQ.isLoading || agendaQ.isLoading;

  if (modo === 'imprimir' && atendimento && !falha) {
    const inicio = dayjs(atendimento.dataHoraInicio);
    const fim = dayjs(atendimento.dataHoraFim);
    const emissor = preenchido(user?.nome);
    return (
      <DocumentoClinicoLayout rotulo="Declaração de Comparecimento" onVoltar={() => setModo('compor')}>
        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-base font-bold uppercase tracking-wide">Declaração de Comparecimento</h1>
          <p className="text-xs text-gray-500">Emitida em {dayjs().format('DD/MM/YYYY')}</p>
        </div>

        <p className="leading-relaxed" data-testid="declaracao-corpo">
          Declaro, para os devidos fins, que <strong>{paciente?.nome}</strong> esteve nesta clínica em{' '}
          <strong>{inicio.format('DD/MM/YYYY')}</strong>, das <strong>{inicio.format('HH:mm')}</strong> às{' '}
          <strong>{fim.format('HH:mm')}</strong>.
        </p>

        <div className="mt-16 flex flex-col items-center gap-1 text-sm" data-testid="assinatura-declaracao">
          <p>_____________________________________</p>
          {clinicaQ.data?.nome && <p className="font-semibold">{clinicaQ.data.nome}</p>}
          {emissor && <p>{emissor}</p>}
        </div>
      </DocumentoClinicoLayout>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Declaração de Comparecimento"
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
            Nenhum atendimento concluído na agenda deste paciente. A declaração só é emitida para um atendimento
            concluído; conclua o atendimento na agenda e volte aqui.
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
            <Button onClick={() => setModo('imprimir')} disabled={!atendimento}>
              <FileText className="mr-2 h-4 w-4" /> Gerar declaração
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
