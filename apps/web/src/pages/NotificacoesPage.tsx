import { useQuery } from '@tanstack/react-query';
import { Send, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { notificacoesApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';

interface DashboardData {
  enviadas?: number;
  entregues?: number;
  pendentes?: number;
  falhas?: number;
  recentes?: Array<Record<string, unknown>>;
  [k: string]: unknown;
}

export function NotificacoesPage() {
  const q = useQuery({
    queryKey: ['notificacoes', 'dashboard'],
    queryFn: () => notificacoesApi.dashboard() as Promise<DashboardData>,
  });

  const d = q.data ?? {};

  const cards = [
    { title: 'Enviadas', value: d.enviadas ?? 0, icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Entregues', value: d.entregues ?? 0, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Pendentes', value: d.pendentes ?? 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { title: 'Falhas', value: d.falhas ?? 0, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  ];

  const recentes = Array.isArray(d.recentes) ? d.recentes : [];

  return (
    <div className="p-6">
      <PageHeader
        title="Notificações"
        subtitle="Lembretes e comunicações automáticas (fila de processamento)"
      />

      {q.isError && (
        <div className="flex items-center gap-2 glass rounded-xl p-4 mb-4 text-amber-400 border-amber-500/20">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-sm">Não foi possível carregar o painel de notificações. {apiErrorMessage(q.error)}</p>
        </div>
      )}

      {q.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.title}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${c.bg}`}>
                      <Icon className={`h-5 w-5 ${c.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{c.title}</p>
                      <p className="text-2xl font-bold text-foreground">{c.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Envios recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Send className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sem envios recentes</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentes.map((r, i) => (
                  <TableRow key={String(r.id ?? i)}>
                    <TableCell>{String(r.canal ?? '—')}</TableCell>
                    <TableCell>{String(r.destino ?? '—')}</TableCell>
                    <TableCell>{String(r.status ?? '—')}</TableCell>
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
