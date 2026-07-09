import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Scale, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { processoJuridicoApi, pacientesApi } from '@/api/resources';
import { STATUS_PROCESSO_LABEL, type ProcessoJuridico } from '@/types';

const STATUS_COLOR: Record<string, string> = {
  em_preparacao: 'outline',
  protocolado: 'secondary',
  em_andamento: 'default',
  ganho: 'success',
  perdido: 'destructive',
  arquivado: 'secondary',
};

export function MeusProcessosPage() {
  const navigate = useNavigate();

  const processosQ = useQuery({
    queryKey: ['processo-juridico', 'meus'],
    queryFn: () => processoJuridicoApi.meus(),
  });

  const processos = processosQ.data ?? [];

  const resumo = {
    total: processos.length,
    emAndamento: processos.filter((p) => p.status === 'em_andamento' || p.status === 'protocolado').length,
    ganhos: processos.filter((p) => p.status === 'ganho').length,
    emPreparacao: processos.filter((p) => p.status === 'em_preparacao').length,
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Meus Processos"
        subtitle="Processos jurídicos sob sua responsabilidade"
      />

      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: resumo.total, color: 'text-foreground', bg: 'bg-muted' },
          { label: 'Em preparação', value: resumo.emPreparacao, color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
          { label: 'Em andamento', value: resumo.emAndamento, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'Ganhos', value: resumo.ganhos, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
        ].map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {processosQ.isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : processos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Scale className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhum processo atribuído a você</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Nº Processo</TableHead>
                  <TableHead>Tribunal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Docs</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {processos.map((p) => (
                  <ProcessoRow key={p.id} processo={p} onOpen={() => navigate(`/fluxo-clinico/${p.pacienteId}`)} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProcessoRow({ processo, onOpen }: { processo: ProcessoJuridico; onOpen: () => void }) {
  const pacienteQ = useQuery({
    queryKey: ['paciente', processo.pacienteId],
    queryFn: () => pacientesApi.get(processo.pacienteId),
  });

  return (
    <TableRow className="cursor-pointer hover:bg-secondary" onClick={onOpen}>
      <TableCell className="font-medium">
        {pacienteQ.isLoading
          ? <Skeleton className="h-4 w-32" />
          : pacienteQ.data?.nome ?? processo.pacienteId}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {processo.numeroProcesso ?? '—'}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {processo.tribunal ?? '—'}
      </TableCell>
      <TableCell>
        <Badge variant={(STATUS_COLOR[processo.status] as 'outline' | 'secondary' | 'default' | 'success' | 'destructive') ?? 'outline'} className="text-xs">
          {STATUS_PROCESSO_LABEL[processo.status] ?? processo.status}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {processo.dataProtocolo ? dayjs(processo.dataProtocolo).format('DD/MM/YYYY') : '—'}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {processo.documentos?.length ?? 0}
      </TableCell>
      <TableCell>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
