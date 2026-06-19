import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { Users, Calendar, CheckCircle, FileText, Activity, UserCheck, ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { agendaApi, pacientesApi, avaliacaoIUApi, followUpApi } from '@/api/resources';
import { toItems } from '@/utils';
import { useAuth } from '@/auth/AuthContext';
import {
  StatusAgendamento,
  STATUS_AGENDAMENTO_LABEL,
  TIPO_AGENDAMENTO_LABEL,
  type Agendamento,
} from '@/types';

function statusVariant(s: StatusAgendamento): 'default' | 'success' | 'destructive' | 'warning' | 'secondary' {
  const map: Record<StatusAgendamento, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
    [StatusAgendamento.AGENDADO]: 'default',
    [StatusAgendamento.CONFIRMADO]: 'secondary',
    [StatusAgendamento.CONCLUIDO]: 'success',
    [StatusAgendamento.CANCELADO]: 'destructive',
    [StatusAgendamento.FALTA]: 'warning',
  };
  return map[s] ?? 'secondary';
}

export function DashboardPage() {
  const { user } = useAuth();

  const hojeIni = dayjs().startOf('day').toISOString();
  const hojeFim = dayjs().endOf('day').toISOString();

  const pacientesQ = useQuery({
    queryKey: ['pacientes', 'count'],
    queryFn: () => pacientesApi.list({ limit: 1 }),
  });

  const avaliacaoCountQ = useQuery({
    queryKey: ['avaliacao-iu', 'count'],
    queryFn: () => avaliacaoIUApi.count(),
  });

  const followupResumoQ = useQuery({
    queryKey: ['followup', 'resumo'],
    queryFn: () => followUpApi.resumo(),
  });

  const agendaHojeQ = useQuery({
    queryKey: ['agenda', 'hoje'],
    queryFn: () => agendaApi.list({ dataInicio: hojeIni, dataFim: hojeFim }),
  });

  const agendamentos = toItems<Agendamento>(agendaHojeQ.data as never);
  const realizados = agendamentos.filter((a) => a.status === StatusAgendamento.CONCLUIDO).length;
  const totalPacientes =
    (pacientesQ.data as { total?: number })?.total ?? toItems(pacientesQ.data as never).length;

  const stats = [
    {
      title: 'Pacientes ativos',
      value: totalPacientes,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      loading: pacientesQ.isLoading,
    },
    {
      title: 'Agendamentos hoje',
      value: agendamentos.length,
      icon: Calendar,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      loading: agendaHojeQ.isLoading,
    },
    {
      title: 'Atendimentos realizados',
      value: realizados,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      loading: agendaHojeQ.isLoading,
    },
    {
      title: 'Prontuários',
      value: '—',
      icon: FileText,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      loading: false,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={`Olá, ${user?.nome ?? user?.email ?? ''}`}
        subtitle={dayjs().format('dddd, DD [de] MMMM [de] YYYY')}
      />

      {/* Pipeline VaPro Widget */}
      <Card className="mb-6 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Pipeline VaPro/Hollister</CardTitle>
          </div>
          <Link to="/fluxo-clinico" className="text-xs text-primary hover:underline">
            Ver pipeline completo →
          </Link>
        </CardHeader>
        <CardContent>
          {avaliacaoCountQ.isLoading || followupResumoQ.isLoading ? (
            <div className="flex gap-6">
              {[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-28" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-blue-400 font-medium">Avaliações</span>
                </div>
                <p className="text-2xl font-bold text-blue-300">{avaliacaoCountQ.data?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">total de fichas</p>
              </div>
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs text-yellow-400 font-medium">Em acompanhamento</span>
                </div>
                <p className="text-2xl font-bold text-yellow-300">{followupResumoQ.data?.emAvaliacao ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">aguardando elegibilidade</p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">Elegíveis</span>
                </div>
                <p className="text-2xl font-bold text-emerald-300">{followupResumoQ.data?.elegivel ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">prontos para laudo</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title} className="hover:border-white/10 transition-colors">
              <CardContent className="p-6">
                {s.loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${s.bg}`}>
                      <Icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.title}</p>
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Agenda de hoje</CardTitle>
          <Link to="/agenda" className="text-sm text-primary hover:underline">
            Ver agenda completa
          </Link>
        </CardHeader>
        <CardContent>
          {agendaHojeQ.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : agendamentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum agendamento para hoje</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agendamentos.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm font-medium">
                      {dayjs(a.dataHoraInicio).format('HH:mm')} – {dayjs(a.dataHoraFim).format('HH:mm')}
                    </TableCell>
                    <TableCell>{TIPO_AGENDAMENTO_LABEL[a.tipo] ?? a.tipo}</TableCell>
                    <TableCell>{a.pacienteId}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(a.status)}>
                        {STATUS_AGENDAMENTO_LABEL[a.status] ?? a.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
