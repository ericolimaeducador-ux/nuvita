import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Users, UserPlus, DollarSign, AlertTriangle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { analyticsApi } from '@/api/resources';
import { formatBRL } from '@/utils';

// Todo gráfico aqui é uma série única (contagem por categoria) — por isso uma
// única cor (o azul primário do app), sem necessidade de paleta categórica.
// Ver skill `dataviz`: "uma série → uma cor (slot 1) para toda barra".
const BAR_COLOR = 'hsl(var(--primary))';
const GRID_COLOR = 'hsl(var(--border))';
const TICK_STYLE = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };


function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="rounded-full bg-primary/10 p-3 text-primary">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  loading,
  empty,
  children,
  className,
}: {
  title: string;
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : empty ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Sem dados no período.</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function tooltipStyle() {
  return {
    contentStyle: {
      background: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 8,
      fontSize: 12,
    },
    cursor: { fill: 'hsl(var(--muted))' },
  };
}

export function RelatoriosGerenciaisPage() {
  // Sem valor inicial: o backend aplica a janela padrão (2 meses atrás até o
  // próximo mês) quando dataInicio/dataFim vêm vazios — mesmo padrão dos
  // relatórios que já existem.
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const periodo = { dataInicio: dataInicio || undefined, dataFim: dataFim || undefined };

  const pacientesQ = useQuery({
    queryKey: ['analytics', 'pacientes', periodo],
    queryFn: () => analyticsApi.pacientes(periodo),
  });
  const agendamentosQ = useQuery({
    queryKey: ['analytics', 'agendamentos', periodo],
    queryFn: () => analyticsApi.agendamentos(periodo),
  });
  const financeiroQ = useQuery({
    queryKey: ['analytics', 'financeiro', periodo],
    queryFn: () => analyticsApi.financeiro(periodo),
  });
  const cobrancasQ = useQuery({
    queryKey: ['analytics', 'cobrancas-psicologia'],
    queryFn: () => analyticsApi.cobrancasPsicologia(),
  });
  const perdaSeguimentoQ = useQuery({
    queryKey: ['analytics', 'perda-seguimento'],
    queryFn: () => analyticsApi.perdaSeguimento(),
  });

  // Horários vagos: janela ajustável na hora de consultar, não persistida
  // (não existe cadastro de expediente no sistema hoje).
  const [diaVagos, setDiaVagos] = useState(dayjs().format('YYYY-MM-DD'));
  const [horaInicioVagos, setHoraInicioVagos] = useState(8);
  const [horaFimVagos, setHoraFimVagos] = useState(19);
  const horariosVagosQ = useQuery({
    queryKey: ['analytics', 'horarios-vagos', diaVagos, horaInicioVagos, horaFimVagos],
    queryFn: () => analyticsApi.horariosVagos({ data: diaVagos, horaInicio: horaInicioVagos, horaFim: horaFimVagos }),
  });

  const novosNoPeriodo = (pacientesQ.data?.novosPorMes ?? []).reduce((soma, m) => soma + m.total, 0);

  const dadosPorDia = useMemo(
    () => (agendamentosQ.data?.porDia ?? []).map((d) => ({ nome: dayjs(d._id).format('DD/MM'), total: d.total })),
    [agendamentosQ.data],
  );
  const dadosPorSemana = useMemo(
    () => (agendamentosQ.data?.porSemana ?? []).map((d) => ({ nome: `Sem. ${d._id.semana}/${d._id.ano}`, total: d.total })),
    [agendamentosQ.data],
  );
  const dadosPorMesAtendimentos = useMemo(
    () => (agendamentosQ.data?.porMes ?? []).map((d) => ({ nome: `${d._id.mes}/${d._id.ano}`, total: d.total })),
    [agendamentosQ.data],
  );
  const dadosReceitaPorMes = useMemo(
    () => (financeiroQ.data?.receitasPorMes ?? []).map((d) => ({ nome: `${d._id.mes}/${d._id.ano}`, total: d.total })),
    [financeiroQ.data],
  );
  const receitaTotalNoPeriodo = (financeiroQ.data?.receitasPorMes ?? []).reduce((soma, m) => soma + m.total, 0);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Relatórios Gerenciais"
        subtitle="Visão consolidada de pacientes e atendimentos para a gestão da clínica"
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-6">
          <div className="space-y-1">
            <Label htmlFor="relDataInicio">Período — de</Label>
            <Input id="relDataInicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="relDataFim">até</Label>
            <Input id="relDataFim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <p className="pb-2 text-xs text-muted-foreground">
            Afeta: novos pacientes no período. Os demais gráficos mostram o quadro atual.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile icon={<Users className="h-5 w-5" />} label="Pacientes ativos" value={pacientesQ.data?.totalAtivos ?? '—'} />
        <StatTile icon={<UserPlus className="h-5 w-5" />} label="Novos no período" value={novosNoPeriodo} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Atendimentos por mês" loading={agendamentosQ.isLoading} empty={dadosPorMesAtendimentos.length === 0}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dadosPorMesAtendimentos} margin={{ left: 8 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} />
              <XAxis dataKey="nome" tick={TICK_STYLE} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <YAxis allowDecimals={false} tick={TICK_STYLE} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <Tooltip {...tooltipStyle()} />
              <Bar dataKey="total" name="Atendimentos" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Atendimentos por semana" loading={agendamentosQ.isLoading} empty={dadosPorSemana.length === 0}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dadosPorSemana} margin={{ left: 8 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} />
              <XAxis dataKey="nome" tick={TICK_STYLE} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <YAxis allowDecimals={false} tick={TICK_STYLE} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <Tooltip {...tooltipStyle()} />
              <Bar dataKey="total" name="Atendimentos" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Atendimentos por dia" loading={agendamentosQ.isLoading} empty={dadosPorDia.length === 0} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dadosPorDia} margin={{ left: 8 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} />
              <XAxis dataKey="nome" tick={TICK_STYLE} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <YAxis allowDecimals={false} tick={TICK_STYLE} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <Tooltip {...tooltipStyle()} />
              <Bar dataKey="total" name="Atendimentos" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile icon={<DollarSign className="h-5 w-5" />} label="Receita recebida no período" value={formatBRL(receitaTotalNoPeriodo)} />
        <StatTile
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Cobranças vencidas"
          value={`${cobrancasQ.data?.vencidas.length ?? 0} · ${formatBRL(cobrancasQ.data?.totalVencido ?? 0)}`}
        />
      </div>

      <ChartCard title="Receita recebida por mês" loading={financeiroQ.isLoading} empty={dadosReceitaPorMes.length === 0}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dadosReceitaPorMes} margin={{ left: 8 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis dataKey="nome" tick={TICK_STYLE} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
            <YAxis tick={TICK_STYLE} axisLine={{ stroke: GRID_COLOR }} tickLine={false} tickFormatter={(v) => formatBRL(v)} />
            <Tooltip {...tooltipStyle()} formatter={(v) => formatBRL(Number(v))} />
            <Bar dataKey="total" name="Receita" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cobranças a vencer / vencidas</CardTitle>
        </CardHeader>
        <CardContent>
          {cobrancasQ.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (cobrancasQ.data?.vencidas.length ?? 0) + (cobrancasQ.data?.aVencer.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma cobrança pendente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...(cobrancasQ.data?.vencidas ?? []), ...(cobrancasQ.data?.aVencer ?? [])].map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.pacienteNome ?? c.pacienteId ?? '—'}</TableCell>
                    <TableCell>{c.vencimento ? dayjs(c.vencimento).format('DD/MM/YYYY') : '—'}</TableCell>
                    <TableCell>{formatBRL(c.valor)}</TableCell>
                    <TableCell>
                      <Badge variant={c.vencimento && dayjs(c.vencimento).isBefore(dayjs(), 'day') ? 'destructive' : 'warning'}>
                        {c.vencimento && dayjs(c.vencimento).isBefore(dayjs(), 'day') ? 'Vencida' : 'A vencer'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perda de seguimento / absenteísmo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Pacientes sem sessão concluída há mais de 30 dias, ou com alta proporção de faltas.
          </p>
          {perdaSeguimentoQ.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (perdaSeguimentoQ.data ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum sinal de perda de seguimento.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Última sessão concluída</TableHead>
                  <TableHead>Faltas</TableHead>
                  <TableHead>Total de agendamentos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(perdaSeguimentoQ.data ?? []).map((p) => (
                  <TableRow key={p.pacienteId}>
                    <TableCell className="font-medium">{p.pacienteNome ?? p.pacienteId ?? '—'}</TableCell>
                    <TableCell>{p.ultimaSessaoConcluidaEm ? dayjs(p.ultimaSessaoConcluidaEm).format('DD/MM/YYYY') : 'Nunca'}</TableCell>
                    <TableCell>{p.faltas}</TableCell>
                    <TableCell>{p.totalAgendamentos}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Horários vagos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="diaVagos">Dia</Label>
              <Input id="diaVagos" type="date" value={diaVagos} onChange={(e) => setDiaVagos(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="horaInicioVagos">Início do expediente</Label>
              <Input
                id="horaInicioVagos" type="number" min={0} max={23} className="w-24"
                value={horaInicioVagos} onChange={(e) => setHoraInicioVagos(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="horaFimVagos">Fim do expediente</Label>
              <Input
                id="horaFimVagos" type="number" min={1} max={24} className="w-24"
                value={horaFimVagos} onChange={(e) => setHoraFimVagos(Number(e.target.value))}
              />
            </div>
            <p className="pb-2 text-xs text-muted-foreground">
              Janela informada aqui, não é salva — não há cadastro de expediente no sistema.
            </p>
          </div>

          {horariosVagosQ.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (horariosVagosQ.data ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Sem horários livres nessa janela.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(horariosVagosQ.data ?? []).map((s) => (
                <Badge key={s.inicio} variant="secondary">
                  {dayjs(s.inicio).format('HH:mm')}–{dayjs(s.fim).format('HH:mm')}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
