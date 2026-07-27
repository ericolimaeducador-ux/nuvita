import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Users, UserPlus, Syringe, FileClock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { analyticsApi } from '@/api/resources';
import { formatData } from '@/utils';
import { ETAPA_FLUXO_LABEL, type EtapaFluxoClinico } from '@/types';

// Todo gráfico aqui é uma série única (contagem por categoria) — por isso uma
// única cor (o azul primário do app), sem necessidade de paleta categórica.
// Ver skill `dataviz`: "uma série → uma cor (slot 1) para toda barra".
const BAR_COLOR = 'hsl(var(--primary))';
const GRID_COLOR = 'hsl(var(--border))';
const TICK_STYLE = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };

const MAX_REPRESENTANTES_EXIBIDOS = 8;

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
}: {
  title: string;
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
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
  const porEtapaQ = useQuery({
    queryKey: ['analytics', 'pacientes-por-etapa'],
    queryFn: () => analyticsApi.pacientesPorEtapa(),
  });
  const porRepresentanteQ = useQuery({
    queryKey: ['analytics', 'pacientes-por-representante'],
    queryFn: () => analyticsApi.pacientesPorRepresentante(),
  });
  const porCateterQ = useQuery({
    queryKey: ['analytics', 'pacientes-por-cateter'],
    queryFn: () => analyticsApi.pacientesPorCateter(),
  });
  const entregasQ = useQuery({
    queryKey: ['analytics', 'entregas-no-mes', periodo],
    queryFn: () => analyticsApi.entregasNoMes(periodo),
  });
  const sondasQ = useQuery({
    queryKey: ['analytics', 'sondas-no-mes', periodo],
    queryFn: () => analyticsApi.sondasNoMes(periodo),
  });
  const aguardandoRelatorioQ = useQuery({
    queryKey: ['analytics', 'aguardando-relatorio'],
    queryFn: () => analyticsApi.aguardandoRelatorio(),
  });

  const dadosEtapa = useMemo(
    () =>
      (porEtapaQ.data ?? []).map((d) => ({
        etapa: ETAPA_FLUXO_LABEL[d.etapa as EtapaFluxoClinico] ?? d.etapa,
        total: d.total,
      })),
    [porEtapaQ.data],
  );

  // Mais de ~8 categorias num gráfico de barras vira ilegível — dobra a
  // cauda em "Outros" em vez de listar todo mundo (ver skill `dataviz`,
  // anti-padrão "cycling hues past 8" aplicado aqui a contagem de barras).
  const dadosRepresentante = useMemo(() => {
    const bruto = (porRepresentanteQ.data ?? []).map((d) => ({ nome: d._id, total: d.total }));
    if (bruto.length <= MAX_REPRESENTANTES_EXIBIDOS) return bruto;
    const principais = bruto.slice(0, MAX_REPRESENTANTES_EXIBIDOS);
    const outros = bruto.slice(MAX_REPRESENTANTES_EXIBIDOS).reduce((soma, d) => soma + d.total, 0);
    return [...principais, { nome: 'Outros', total: outros }];
  }, [porRepresentanteQ.data]);

  const dadosCateter = useMemo(
    () => (porCateterQ.data ?? []).map((d) => ({ french: `Fr ${d._id}`, total: d.total })),
    [porCateterQ.data],
  );

  const novosNoPeriodo = (pacientesQ.data?.novosPorMes ?? []).reduce((soma, m) => soma + m.total, 0);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Relatórios Gerenciais"
        subtitle="Visão consolidada de pacientes, representantes e insumos para a gestão da unidade"
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
            Afeta: novos pacientes, entregas e sondas do período. Os demais gráficos mostram o quadro atual.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={<Users className="h-5 w-5" />} label="Pacientes ativos" value={pacientesQ.data?.totalAtivos ?? '—'} />
        <StatTile icon={<UserPlus className="h-5 w-5" />} label="Novos no período" value={novosNoPeriodo} />
        <StatTile icon={<Syringe className="h-5 w-5" />} label="Sondas entregues no período" value={sondasQ.data?.totalQuantidade ?? 0} />
        <StatTile icon={<FileClock className="h-5 w-5" />} label="Aguardando relatório médico" value={aguardandoRelatorioQ.data?.length ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Pacientes por etapa do fluxo clínico" loading={porEtapaQ.isLoading} empty={dadosEtapa.every((d) => d.total === 0)}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dadosEtapa} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
              <XAxis type="number" allowDecimals={false} tick={TICK_STYLE} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <YAxis type="category" dataKey="etapa" width={180} tick={TICK_STYLE} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <Tooltip {...tooltipStyle()} />
              <Bar dataKey="total" name="Pacientes" fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pacientes por representante" loading={porRepresentanteQ.isLoading} empty={dadosRepresentante.length === 0}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dadosRepresentante} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
              <XAxis type="number" allowDecimals={false} tick={TICK_STYLE} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={140} tick={TICK_STYLE} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <Tooltip {...tooltipStyle()} />
              <Bar dataKey="total" name="Pacientes" fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pacientes por calibre de cateter (French)" loading={porCateterQ.isLoading} empty={dadosCateter.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dadosCateter} margin={{ top: 8 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} />
              <XAxis dataKey="french" tick={TICK_STYLE} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <YAxis allowDecimals={false} tick={TICK_STYLE} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <Tooltip {...tooltipStyle()} />
              <Bar dataKey="total" name="Pacientes" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pacientes que receberam insumo em casa no período</CardTitle>
        </CardHeader>
        <CardContent>
          {entregasQ.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entregasQ.data ?? []).map((e, i) => (
                  <TableRow key={`${e.pacienteId}-${i}`}>
                    <TableCell className="font-medium">{e.pacienteNome}</TableCell>
                    <TableCell>{formatData(e.dataEntrega)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.itens.map((it) => `${it.descricao} (${it.quantidade}x)`).join(', ')}
                    </TableCell>
                    <TableCell>{e.status}</TableCell>
                  </TableRow>
                ))}
                {(entregasQ.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhuma entrega no período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pacientes aguardando relatório médico</CardTitle>
        </CardHeader>
        <CardContent>
          {aguardandoRelatorioQ.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Pendente desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(aguardandoRelatorioQ.data ?? []).map((p) => (
                  <TableRow key={p.pacienteId}>
                    <TableCell className="font-medium">{p.pacienteNome}</TableCell>
                    <TableCell>{formatData(p.criadoEm)}</TableCell>
                  </TableRow>
                ))}
                {(aguardandoRelatorioQ.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                      Nenhum paciente aguardando relatório médico.
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
