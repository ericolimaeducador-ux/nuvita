import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { Users, Calendar, CheckCircle, FileText, Activity, UserCheck, ClipboardList, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { agendaApi, pacientesApi, avaliacaoIUApi, followUpApi, checklistDocumentosApi } from '@/api/resources';
import { toItems } from '@/utils';
import { useAuth } from '@/auth/AuthContext';
import {
  StatusAgendamento,
  STATUS_AGENDAMENTO_LABEL,
  TIPO_AGENDAMENTO_LABEL,
  Modulo,
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
  const { user, permissoes } = useAuth();
  const podeVerChecklist = permissoes.includes(Modulo.DOCUMENTOS);

  const pendentesDocsQ = useQuery({
    queryKey: ['checklist-documentos', 'resumo-pendentes'],
    queryFn: () => checklistDocumentosApi.resumoPendentes(),
    enabled: podeVerChecklist,
  });

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
    { title: 'Pacientes ativos', value: totalPacientes, icon: Users, loading: pacientesQ.isLoading },
    { title: 'Agendamentos hoje', value: agendamentos.length, icon: Calendar, loading: agendaHojeQ.isLoading },
    { title: 'Atendimentos realizados', value: realizados, icon: CheckCircle, loading: agendaHojeQ.isLoading },
    { title: 'Prontuários', value: '—', icon: FileText, loading: false },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={`Olá, ${user?.nome ?? user?.email ?? ''}`}
        subtitle={dayjs().format('dddd, DD [de] MMMM [de] YYYY')}
      />

      {/* Alerta de documentos pendentes (checklist da secretaria/admin) */}
      {podeVerChecklist && !pendentesDocsQ.isLoading && (pendentesDocsQ.data?.pendentes ?? 0) > 0 && (
        <Link to="/pacientes" className="block mb-6">
          <div className="flex items-center gap-3 glass rounded-xl p-4 border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {pendentesDocsQ.data?.pendentes} documento{pendentesDocsQ.data?.pendentes !== 1 ? 's' : ''} pendente{pendentesDocsQ.data?.pendentes !== 1 ? 's' : ''} no checklist
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Abra o cadastro do paciente para ver quais documentos faltam receber.
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Pipeline de Incontinência Urinária */}
      <Card className="mb-6 border-brand-cobalt/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent-gold-hover" />
            <CardTitle className="text-sm font-semibold">Pipeline de Incontinência Urinária</CardTitle>
          </div>
          <Link to="/fluxo-clinico" className="text-xs font-medium text-primary hover:underline">
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
              {[
                { icon: ClipboardList, label: 'Avaliações', value: avaliacaoCountQ.data?.total ?? 0, sub: 'total de fichas' },
                { icon: UserCheck, label: 'Em acompanhamento', value: followupResumoQ.data?.emAvaliacao ?? 0, sub: 'aguardando elegibilidade' },
                { icon: CheckCircle, label: 'Elegíveis', value: followupResumoQ.data?.elegivel ?? 0, sub: 'prontos para laudo' },
              ].map(({ icon: BlocoIcon, label, value, sub }) => (
                <div key={label} className="rounded-xl bg-brand-cobalt p-4 shadow-md shadow-brand-cobalt/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-1.5 rounded-lg bg-accent-gold">
                      <BlocoIcon className="h-4 w-4 text-[#1F2937]" />
                    </span>
                    <span className="text-xs text-blue-100 font-medium">{label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-blue-200/70 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title} className="border-0 bg-brand-cobalt shadow-md shadow-brand-cobalt/20 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                {s.loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24 bg-white/20" />
                    <Skeleton className="h-8 w-16 bg-white/20" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-accent-gold">
                      <Icon className="h-5 w-5 text-[#1F2937]" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-100">{s.title}</p>
                      <p className="text-2xl font-bold text-white">{s.value}</p>
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
          <Link to="/agenda" className="text-sm text-accent-gold hover:text-accent-gold-hover hover:underline">
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
