import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Activity, Clock, ClipboardList, UserCheck, CalendarClock,
  FileText, Stethoscope, Send, Scale, XCircle, CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { pacientesApi } from '@/api/resources';
import { toItems, idade } from '@/utils';
import type { Paciente } from '@/types';
import { EtapaFluxoClinico, ETAPA_FLUXO_LABEL, calcularPrazoEtapa } from '@/types';
import { cn } from '@/lib/utils';

const ETAPAS: Array<{ key: 'todos' | EtapaFluxoClinico; label: string; icon: React.ElementType }> = [
  { key: 'todos', label: 'Todos', icon: Activity },
  { key: EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO, label: ETAPA_FLUXO_LABEL[EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO], icon: Clock },
  { key: EtapaFluxoClinico.AVALIACAO_IU, label: ETAPA_FLUXO_LABEL[EtapaFluxoClinico.AVALIACAO_IU], icon: ClipboardList },
  { key: EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO, label: ETAPA_FLUXO_LABEL[EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO], icon: UserCheck },
  { key: EtapaFluxoClinico.ENTREVISTA_AGENDADA, label: ETAPA_FLUXO_LABEL[EtapaFluxoClinico.ENTREVISTA_AGENDADA], icon: CalendarClock },
  { key: EtapaFluxoClinico.AGUARDANDO_DOCUMENTOS, label: ETAPA_FLUXO_LABEL[EtapaFluxoClinico.AGUARDANDO_DOCUMENTOS], icon: FileText },
  { key: EtapaFluxoClinico.AGUARDANDO_CONSULTA_MEDICA, label: ETAPA_FLUXO_LABEL[EtapaFluxoClinico.AGUARDANDO_CONSULTA_MEDICA], icon: Stethoscope },
  { key: EtapaFluxoClinico.AGUARDANDO_ENVIO_JURIDICO, label: ETAPA_FLUXO_LABEL[EtapaFluxoClinico.AGUARDANDO_ENVIO_JURIDICO], icon: Send },
  { key: EtapaFluxoClinico.PROCESSO_JURIDICO, label: ETAPA_FLUXO_LABEL[EtapaFluxoClinico.PROCESSO_JURIDICO], icon: Scale },
  { key: EtapaFluxoClinico.NAO_ELEGIVEL, label: ETAPA_FLUXO_LABEL[EtapaFluxoClinico.NAO_ELEGIVEL], icon: XCircle },
  { key: EtapaFluxoClinico.CONCLUIDO, label: ETAPA_FLUXO_LABEL[EtapaFluxoClinico.CONCLUIDO], icon: CheckCircle2 },
];

const ETAPA_COLOR: Record<EtapaFluxoClinico, string> = {
  [EtapaFluxoClinico.AGUARDANDO_ATENDIMENTO]: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  [EtapaFluxoClinico.AVALIACAO_IU]: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  [EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO]: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  [EtapaFluxoClinico.ENTREVISTA_AGENDADA]: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  [EtapaFluxoClinico.AGUARDANDO_DOCUMENTOS]: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  [EtapaFluxoClinico.AGUARDANDO_CONSULTA_MEDICA]: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  [EtapaFluxoClinico.AGUARDANDO_ENVIO_JURIDICO]: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  [EtapaFluxoClinico.PROCESSO_JURIDICO]: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  [EtapaFluxoClinico.NAO_ELEGIVEL]: 'bg-red-500/10 text-red-600 border-red-500/20',
  [EtapaFluxoClinico.CONCLUIDO]: 'bg-accent-gold/15 text-amber-700 border-accent-gold/30',
};

function EtapaChip({ etapa }: { etapa: EtapaFluxoClinico }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', ETAPA_COLOR[etapa])}>
      {ETAPA_FLUXO_LABEL[etapa]}
    </span>
  );
}

function PrazoBadge({ paciente }: { paciente: Paciente }) {
  if (!paciente.etapaFluxo || !paciente.etapaFluxoDesde) return <span className="text-muted-foreground text-sm">—</span>;
  const info = calcularPrazoEtapa(paciente.etapaFluxo, paciente.etapaFluxoDesde);
  if (info.diasLimite === undefined) return <span className="text-muted-foreground text-sm">—</span>;

  if (info.atrasado) {
    return <span className="text-red-600 text-sm font-medium">Atrasado {Math.abs(info.diasRestantes!)}d</span>;
  }
  if ((info.diasRestantes ?? 99) <= 3) {
    return <span className="text-amber-600 text-sm font-medium">{info.diasRestantes}d restantes</span>;
  }
  return <span className="text-muted-foreground text-sm">{info.diasRestantes}d restantes</span>;
}

export function FluxoClinicoPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<'todos' | EtapaFluxoClinico>('todos');

  const pacientesQ = useQuery({
    queryKey: ['pacientes-fluxo', busca, filtroEtapa],
    queryFn: () => pacientesApi.list({
      nome: busca || undefined,
      limit: 50,
      etapaFluxo: filtroEtapa !== 'todos' ? filtroEtapa : undefined,
    }),
  });

  const pacientes = toItems<Paciente>(pacientesQ.data as never);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Fluxo Clínico"
        subtitle="Pipeline completo: aguardando atendimento → avaliação → follow-up → entrevista → documentos → consulta → jurídico → entrega"
      />

      <div className="flex gap-2 flex-wrap">
        {ETAPAS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFiltroEtapa(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
              filtroEtapa === key
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card text-muted-foreground border-border hover:bg-secondary'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar paciente..."
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          {pacientesQ.isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Etapa atual</TableHead>
                  <TableHead>Prazo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacientes.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-secondary" onClick={() => navigate(`/fluxo-clinico/${p.id}`)}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>{p.dataNascimento ? idade(p.dataNascimento) : '—'}</TableCell>
                    <TableCell>{p.etapaFluxo ? <EtapaChip etapa={p.etapaFluxo} /> : '—'}</TableCell>
                    <TableCell><PrazoBadge paciente={p} /></TableCell>
                  </TableRow>
                ))}
                {pacientes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum paciente encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
