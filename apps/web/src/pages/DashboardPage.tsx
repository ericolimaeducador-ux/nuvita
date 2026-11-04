import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { Users, Calendar, CheckCircle, FileText, AlertTriangle, Brain } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  agendaApi, pacientesApi, psicoFinanceiroApi,
} from '@/api/resources';
import { toItems } from '@/utils';
import { ErroConsulta } from '@/components/ErroConsulta';
import { useAuth } from '@/auth/AuthContext';
import {
  StatusAgendamento,
  STATUS_AGENDAMENTO_LABEL,
  StatusCiclo,
  STATUS_CICLO_LABEL,
  TIPO_AGENDAMENTO_LABEL,
  Modulo,
  rotuloProximaSessao,
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
  const podeVerPsicologia = permissoes.includes(Modulo.FINANCEIRO_PSICOLOGIA);

  const painelPsiQ = useQuery({
    queryKey: ['painel-psicologia'],
    queryFn: () => psicoFinanceiroApi.painel(),
    enabled: podeVerPsicologia,
    retry: false,
  });

  const hojeIni = dayjs().startOf('day').toISOString();
  const hojeFim = dayjs().endOf('day').toISOString();

  const pacientesQ = useQuery({
    queryKey: ['pacientes', 'count'],
    queryFn: () => pacientesApi.list({ limit: 1 }),
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
  // Em erro o cartão mostra "—": zero seria um número inventado.
    { title: 'Pacientes ativos', value: totalPacientes, icon: Users, loading: pacientesQ.isLoading, erro: pacientesQ.isError },
    { title: 'Agendamentos hoje', value: agendamentos.length, icon: Calendar, loading: agendaHojeQ.isLoading, erro: agendaHojeQ.isError },
    { title: 'Atendimentos realizados', value: realizados, icon: CheckCircle, loading: agendaHojeQ.isLoading, erro: agendaHojeQ.isError },
    { title: 'Prontuários', value: '—', icon: FileText, loading: false, erro: false },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={`Olá, ${user?.nome ?? user?.email ?? ''}`}
        subtitle={dayjs().format('dddd, DD [de] MMMM [de] YYYY')}
      />

      {podeVerPsicologia && painelPsiQ.isError && (
        <ErroConsulta
          className="mb-6"
          erro={painelPsiQ.error}
          refetch={painelPsiQ.refetch}
          recurso="a situação de sessões e ciclos da psicoterapia"
        />
      )}
      {pacientesQ.isError && (
        <ErroConsulta className="mb-6" erro={pacientesQ.error} refetch={pacientesQ.refetch} recurso="o total de pacientes" />
      )}

      {/* Psicoterapia: em que sessão cada paciente está e como está o ciclo de cobrança */}
      {podeVerPsicologia && painelPsiQ.data && painelPsiQ.data.pacientes.length > 0 && (
        <Card className="mb-6 border-brand-cobalt/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent-gold-hover" />
              <CardTitle className="text-sm font-semibold">Psicoterapia — sessões e ciclos</CardTitle>
            </div>
            <Link to="/financeiro-psicologia" className="text-xs font-medium text-primary hover:underline">
              Ver financeiro →
            </Link>
          </CardHeader>
          <CardContent>
            {(painelPsiQ.data.ciclosFechadosARenovar ?? 0) > 0 && (
              <p className="mb-3 flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {painelPsiQ.data.ciclosFechadosARenovar === 1
                  ? 'Um paciente fechou o ciclo de 4 sessões — hora de renovar o pagamento.'
                  : `${painelPsiQ.data.ciclosFechadosARenovar} pacientes fecharam o ciclo de 4 sessões — hora de renovar o pagamento.`}
              </p>
            )}
            {(painelPsiQ.data.ciclosSemCobranca ?? 0) > 0 && (
              <p className="mb-3 flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {painelPsiQ.data.ciclosSemCobranca === 1
                  ? 'Um paciente está sem cobrança no ciclo atual.'
                  : `${painelPsiQ.data.ciclosSemCobranca} pacientes estão sem cobrança no ciclo atual.`}
              </p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Próximo atendimento</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {painelPsiQ.data.pacientes.slice(0, 8).map((p) => (
                  <TableRow key={p.pacienteId}>
                    <TableCell className="font-medium">
                      <Link to={`/pacientes/${p.pacienteId}`} className="hover:underline">
                        {p.pacienteNome ?? p.pacienteId}
                      </Link>
                    </TableCell>
                    <TableCell>{rotuloProximaSessao(p)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      Ciclo {p.cicloAtual} · {p.sessoesNoCiclo}/{painelPsiQ.data!.sessoesPorCiclo} sessões
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.statusCiclo === StatusCiclo.EM_DIA ? 'success' : 'warning'}>
                        {STATUS_CICLO_LABEL[p.statusCiclo]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
                      <p className="text-2xl font-bold text-white">{s.erro ? '—' : s.value}</p>
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
          ) : agendaHojeQ.isError ? (
            <ErroConsulta erro={agendaHojeQ.error} refetch={agendaHojeQ.refetch} recurso="a agenda de hoje" />
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
