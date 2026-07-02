import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Activity, ClipboardList, UserCheck, Scale, Package } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { pacientesApi, avaliacaoIUApi, followUpApi, laudoMedicoApi, processoJuridicoApi, entregasApi } from '@/api/resources';
import { toItems, idade } from '@/utils';
import type { Paciente, AvaliacaoIU, FollowUp, LaudoMedico, ProcessoJuridico, Entrega } from '@/types';
import { StatusElegibilidade, StatusEntrega, STATUS_ELEGIBILIDADE_LABEL, STATUS_PROCESSO_LABEL } from '@/types';
import { cn } from '@/lib/utils';

const ETAPAS = [
  { key: 'todos', label: 'Todos', icon: Activity },
  { key: 'avaliacao', label: 'Avaliação IU', icon: ClipboardList },
  { key: 'followup', label: 'Aguardando Relatório Médico', icon: UserCheck },
  { key: 'laudo', label: 'Laudo Médico', icon: Activity },
  { key: 'processo', label: 'Processo Jurídico', icon: Scale },
  { key: 'entrega', label: 'Entrega', icon: Package },
];

function EtapaChip({ etapa }: { etapa: string }) {
  const map: Record<string, { label: string; color: string }> = {
    avaliacao: { label: 'Avaliação', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    followup: { label: 'Aguardando Relatório', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    laudo: { label: 'Laudo', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    processo: { label: 'Processo', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    entrega: { label: 'Entregue', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  };
  const info = map[etapa] ?? { label: etapa, color: 'bg-muted/10 text-muted-foreground' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', info.color)}>
      {info.label}
    </span>
  );
}

function detectarEtapa(
  avaliacoes: AvaliacaoIU[],
  followups: FollowUp[],
  laudos: LaudoMedico[],
  processos: ProcessoJuridico[],
  entregas: Entrega[],
): string {
  if (entregas.some((e) => e.status === StatusEntrega.ENTREGUE)) return 'entrega';
  if (processos.length > 0) return 'processo';
  if (laudos.length > 0) return 'laudo';
  // Só o followup MAIS RECENTE decide a elegibilidade (a lista já vem ordenada
  // desc por dataFollowup) — um followup antigo elegível não conta se o mais
  // novo mudou de ideia.
  if (followups[0]?.statusElegibilidade === StatusElegibilidade.ELEGIVEL) return 'followup';
  if (avaliacoes.length > 0) return 'avaliacao';
  return 'avaliacao';
}

export function FluxoClinicoPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('todos');
  const [soPrograma, setSoPrograma] = useState(true);

  const pacientesQ = useQuery({
    queryKey: ['pacientes-fluxo', busca, soPrograma],
    queryFn: () => pacientesApi.list({ nome: busca || undefined, limit: 50, programaIU: soPrograma || undefined }),
  });

  const pacientes = toItems<Paciente>(pacientesQ.data as never);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Fluxo Clínico"
        subtitle="Pipeline completo: avaliação → follow-up → laudo → processo → entrega"
      />

      {/* Toggle do programa de acompanhamento de IU */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSoPrograma(!soPrograma)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
            soPrograma
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-card/40 text-muted-foreground border-white/5 hover:bg-white/5'
          )}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-current" />
          {soPrograma ? 'Apenas programa de acompanhamento' : 'Todos os pacientes'}
        </button>
      </div>

      {/* Filtros de etapa */}
      <div className="flex gap-2 flex-wrap">
        {ETAPAS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFiltroEtapa(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
              filtroEtapa === key
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card/40 text-muted-foreground border-white/5 hover:bg-white/5'
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
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacientes.map((p) => (
                  <PacienteRow
                    key={p.id}
                    paciente={p}
                    filtroEtapa={filtroEtapa}
                    onClick={() => navigate(`/fluxo-clinico/${p.id}`)}
                  />
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

function PacienteRow({
  paciente,
  filtroEtapa,
  onClick,
}: {
  paciente: Paciente;
  filtroEtapa: string;
  onClick: () => void;
}) {
  const avaliacoesQ = useQuery({
    queryKey: ['avaliacao-iu', paciente.id],
    queryFn: () => avaliacaoIUApi.listByPaciente(paciente.id),
  });
  const followupsQ = useQuery({
    queryKey: ['followup', paciente.id],
    queryFn: () => followUpApi.listByPaciente(paciente.id),
    enabled: (avaliacoesQ.data?.length ?? 0) > 0,
  });
  const laudosQ = useQuery({
    queryKey: ['laudo-medico', paciente.id],
    queryFn: () => laudoMedicoApi.listByPaciente(paciente.id),
    enabled: (avaliacoesQ.data?.length ?? 0) > 0,
  });
  const processosQ = useQuery({
    queryKey: ['processo-juridico', paciente.id],
    queryFn: () => processoJuridicoApi.listByPaciente(paciente.id),
    enabled: (laudosQ.data?.length ?? 0) > 0,
  });
  const entregasQ = useQuery({
    queryKey: ['entregas', paciente.id],
    queryFn: () => entregasApi.listByPaciente(paciente.id),
    enabled: (processosQ.data?.length ?? 0) > 0,
  });

  const avaliacoes = avaliacoesQ.data ?? [];
  const followups = followupsQ.data ?? [];
  const laudos = laudosQ.data ?? [];
  const processos = processosQ.data ?? [];
  const entregas = entregasQ.data ?? [];

  const etapa = detectarEtapa(avaliacoes, followups, laudos, processos, entregas);
  const temAvaliacao = avaliacoes.length > 0;

  if (filtroEtapa !== 'todos' && filtroEtapa !== etapa) return null;
  if (!temAvaliacao && filtroEtapa !== 'todos' && filtroEtapa !== 'avaliacao') return null;

  const ultimoProcesso = processos[0];
  const ultimaEntrega = entregas[0];

  let situacao = '—';
  if (ultimaEntrega) situacao = STATUS_ENTREGA_LABEL[ultimaEntrega.status as keyof typeof STATUS_ENTREGA_LABEL] ?? '—';
  else if (ultimoProcesso) situacao = STATUS_PROCESSO_LABEL[ultimoProcesso.status] ?? '—';
  else if (followups.length > 0) situacao = STATUS_ELEGIBILIDADE_LABEL[followups[0].statusElegibilidade] ?? '—';
  else if (temAvaliacao) situacao = 'Aguardando follow-up';

  return (
    <TableRow className="cursor-pointer hover:bg-white/5" onClick={onClick}>
      <TableCell className="font-medium">{paciente.nome}</TableCell>
      <TableCell>{paciente.dataNascimento ? idade(paciente.dataNascimento) : '—'}</TableCell>
      <TableCell><EtapaChip etapa={etapa} /></TableCell>
      <TableCell className="text-muted-foreground text-sm">{situacao}</TableCell>
    </TableRow>
  );
}

const STATUS_ENTREGA_LABEL = {
  pendente: 'Pendente',
  enviada: 'Enviada',
  entregue: 'Entregue',
  devolvida: 'Devolvida',
} as const;
