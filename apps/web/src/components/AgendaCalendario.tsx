import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Calendar, dayjsLocalizer, Views, type View, type Event as RBCEvent } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { agendaApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { toItems } from '@/utils';
import {
  ModalidadeAtendimento, MODALIDADE_LABEL, StatusAgendamento, STATUS_AGENDAMENTO_LABEL,
  TIPO_AGENDAMENTO_LABEL, TIPO_ATENDIMENTO_POR_AGENDAMENTO,
  type Agendamento,
} from '@/types';

const localizer = dayjsLocalizer(dayjs);
const DnDCalendar = withDragAndDrop<RBCEvent>(Calendar<RBCEvent>);

const CORES_MODALIDADE: Record<ModalidadeAtendimento, string> = {
  [ModalidadeAtendimento.MEDICO]: '#2563eb',
  [ModalidadeAtendimento.ENFERMAGEM]: '#059669',
  [ModalidadeAtendimento.JURIDICO]: '#7c3aed',
};

function podeMover(a: Agendamento): boolean {
  return a.status === StatusAgendamento.AGENDADO || a.status === StatusAgendamento.CONFIRMADO;
}

/** Visão em calendário (mês/semana/dia) da Agenda, com cores por modalidade,
 * clique no evento abrindo o detalhe completo e arrastar/redimensionar pra
 * reagendar (reaproveita o PATCH de reagendar que já existia na API). */
export function AgendaCalendario({
  nomePorPacienteId,
  podeConcluir,
  onIniciarAtendimento,
}: {
  nomePorPacienteId: Map<string, string>;
  podeConcluir: boolean;
  onIniciarAtendimento: (a: Agendamento) => void;
}) {
  const qc = useQueryClient();
  const [view, setView] = useState<View>(Views.MONTH);
  const [range, setRange] = useState(() => ({
    start: dayjs().startOf('month').subtract(7, 'day').toISOString(),
    end: dayjs().endOf('month').add(7, 'day').toISOString(),
  }));
  const [selecionado, setSelecionado] = useState<Agendamento | null>(null);

  const listQ = useQuery({
    queryKey: ['agenda', 'calendario', range.start, range.end],
    queryFn: () => agendaApi.list({ dataInicio: range.start, dataFim: range.end }),
  });

  const acaoMut = useMutation({
    mutationFn: (v: { id: string; acao: 'cancelar' | 'concluir' }) =>
      v.acao === 'cancelar' ? agendaApi.cancelar(v.id) : agendaApi.concluir(v.id),
    onSuccess: () => {
      toast.success('Agendamento atualizado.');
      setSelecionado(null);
      void qc.invalidateQueries({ queryKey: ['agenda'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const reagendarMut = useMutation({
    mutationFn: (v: { id: string; inicio: string; fim: string }) => agendaApi.reagendar(v.id, v.inicio, v.fim),
    onSuccess: () => {
      toast.success('Agendamento reagendado.');
      void qc.invalidateQueries({ queryKey: ['agenda'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const agendamentos = toItems<Agendamento>(listQ.data as never);
  const eventos = useMemo<RBCEvent[]>(
    () =>
      agendamentos.map((a) => ({
        title: `${dayjs(a.dataHoraInicio).format('HH:mm')} ${nomePorPacienteId.get(a.pacienteId) ?? ''}`.trim(),
        start: new Date(a.dataHoraInicio),
        end: new Date(a.dataHoraFim),
        resource: a,
      })),
    [agendamentos, nomePorPacienteId],
  );

  function handleRangeChange(r: Date[] | { start: Date; end: Date }) {
    if (Array.isArray(r)) {
      if (r.length === 0) return;
      setRange({ start: r[0].toISOString(), end: r[r.length - 1].toISOString() });
    } else {
      setRange({ start: r.start.toISOString(), end: r.end.toISOString() });
    }
  }

  const selecionadoEncerrado =
    !!selecionado &&
    (selecionado.status === StatusAgendamento.CANCELADO || selecionado.status === StatusAgendamento.CONCLUIDO);
  const podeIniciarSelecionado =
    !!selecionado && podeMover(selecionado) && !!TIPO_ATENDIMENTO_POR_AGENDAMENTO[selecionado.tipo];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {Object.values(ModalidadeAtendimento).map((m) => (
          <span key={m} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CORES_MODALIDADE[m] }} />
            {MODALIDADE_LABEL[m]}
          </span>
        ))}
        <span className="text-muted-foreground/70">Arraste um evento para reagendar.</span>
      </div>

      <div style={{ height: 650 }}>
        <DnDCalendar
          localizer={localizer}
          culture="pt-br"
          events={eventos}
          view={view}
          onView={setView}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          onRangeChange={handleRangeChange}
          onSelectEvent={(e) => setSelecionado((e.resource ?? null) as Agendamento | null)}
          eventPropGetter={(e) => {
            const a = e.resource as Agendamento;
            return {
              style: {
                backgroundColor: CORES_MODALIDADE[a.modalidade] ?? '#64748b',
                opacity: a.status === StatusAgendamento.CANCELADO ? 0.45 : 1,
                textDecoration: a.status === StatusAgendamento.CANCELADO ? 'line-through' : undefined,
                border: 'none',
                cursor: podeMover(a) ? 'move' : 'default',
              },
            };
          }}
          draggableAccessor={(e) => podeMover(e.resource as Agendamento)}
          resizableAccessor={(e) => podeMover(e.resource as Agendamento)}
          onEventDrop={({ event, start, end }) => {
            const a = event.resource as Agendamento;
            reagendarMut.mutate({ id: a.id, inicio: new Date(start).toISOString(), fim: new Date(end).toISOString() });
          }}
          onEventResize={({ event, start, end }) => {
            const a = event.resource as Agendamento;
            reagendarMut.mutate({ id: a.id, inicio: new Date(start).toISOString(), fim: new Date(end).toISOString() });
          }}
          popup
          messages={{
            month: 'Mês', week: 'Semana', day: 'Dia', today: 'Hoje',
            previous: '‹', next: '›',
            noEventsInRange: 'Nenhum agendamento neste período.',
            showMore: (total: number) => `+${total} mais`,
          }}
          style={{ height: '100%' }}
        />
      </div>

      <Dialog open={!!selecionado} onOpenChange={(o) => { if (!o) setSelecionado(null); }}>
        <DialogContent className="max-w-md">
          {selecionado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {nomePorPacienteId.get(selecionado.pacienteId) ?? selecionado.pacienteId}
                  <Badge variant="secondary">{STATUS_AGENDAMENTO_LABEL[selecionado.status]}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Data/hora:</span> {dayjs(selecionado.dataHoraInicio).format('DD/MM/YYYY HH:mm')} – {dayjs(selecionado.dataHoraFim).format('HH:mm')}</p>
                <p><span className="text-muted-foreground">Modalidade:</span> {MODALIDADE_LABEL[selecionado.modalidade]}</p>
                <p><span className="text-muted-foreground">Tipo:</span> {TIPO_AGENDAMENTO_LABEL[selecionado.tipo]}</p>
                {selecionado.observacoes && <p><span className="text-muted-foreground">Observações:</span> {selecionado.observacoes}</p>}
                {selecionado.motivoCancelamento && <p><span className="text-muted-foreground">Motivo do cancelamento:</span> {selecionado.motivoCancelamento}</p>}
              </div>
              <DialogFooter className="flex-wrap gap-2">
                {podeIniciarSelecionado && (
                  <Button variant="outline" onClick={() => { onIniciarAtendimento(selecionado); setSelecionado(null); }}>
                    Iniciar atendimento
                  </Button>
                )}
                {!selecionadoEncerrado && podeConcluir && (
                  <Button variant="outline" disabled={acaoMut.isPending} onClick={() => acaoMut.mutate({ id: selecionado.id, acao: 'concluir' })}>
                    Concluir atendimento
                  </Button>
                )}
                {!selecionadoEncerrado && (
                  <Button variant="outline" className="text-destructive" disabled={acaoMut.isPending} onClick={() => acaoMut.mutate({ id: selecionado.id, acao: 'cancelar' })}>
                    Cancelar
                  </Button>
                )}
                <Button onClick={() => setSelecionado(null)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
