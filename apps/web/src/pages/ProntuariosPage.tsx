import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PenLine } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { prontuariosApi, pacientesApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toItems } from '@/utils';
import { ErroConsulta } from '@/components/ErroConsulta';
import { toast } from '@/components/ui/use-toast';
import { ProntuarioDetailDialog } from '@/components/ProntuarioDialogs';
import { TIPO_ATENDIMENTO_LABEL, type Prontuario, type Paciente } from '@/types';
import { RECURSOS_LEGADO } from '@/lib/recursos-legado';

export function ProntuariosPage() {
  const qc = useQueryClient();
  const [viewId, setViewId] = useState<string | null>(null);

  const listQ = useQuery({ queryKey: ['prontuarios'], queryFn: () => prontuariosApi.list() });
  const pacientesQ = useQuery({ queryKey: ['pacientes', 'select'], queryFn: () => pacientesApi.list({ limit: 100 }) });

  const assinarMut = useMutation({
    mutationFn: (id: string) => prontuariosApi.assinar(id),
    onSuccess: () => { toast.success('Prontuário assinado.'); void qc.invalidateQueries({ queryKey: ['prontuarios'] }); },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const prontuarios = toItems<Prontuario>(listQ.data as never);
  const pacientes = toItems<Paciente>(pacientesQ.data as never);
  const nomePaciente = (pacienteId: string) => pacientes.find((p) => p.id === pacienteId)?.nome ?? pacienteId;

  return (
    <div className="p-6">
      <PageHeader
        title="Prontuários"
        subtitle="Registros de atendimento — criados a partir do Atendimento Psicológico"
      />

      <Card>
        <CardContent className="p-6">
          {/* Sem os nomes, a coluna Paciente mostraria só IDs. */}
          {pacientesQ.isError && (
            <ErroConsulta
              className="mb-4"
              erro={pacientesQ.error}
              refetch={pacientesQ.refetch}
              recurso="os nomes dos pacientes"
            />
          )}
          {listQ.isLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : listQ.isError ? (
            <ErroConsulta erro={listQ.error} refetch={listQ.refetch} recurso="os prontuários" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {prontuarios.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => setViewId(p.id)}>
                    <TableCell>{p.dataAtendimento ? dayjs(p.dataAtendimento).format('DD/MM/YYYY HH:mm') : '—'}</TableCell>
                    <TableCell className="font-medium">{nomePaciente(p.pacienteId)}</TableCell>
                    <TableCell>{TIPO_ATENDIMENTO_LABEL[p.tipo] ?? p.tipo}</TableCell>
                    <TableCell>
                      <Badge variant={p.assinado ? 'success' : 'warning'}>{p.assinado ? 'Assinado' : 'Rascunho'}</Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {/* R1: prontuário antigo somente leitura (o servidor responde 403). */}
                      {RECURSOS_LEGADO.escritaProntuarioAntigo && !p.assinado && (
                        <Button size="sm" variant="outline" disabled={assinarMut.isPending} onClick={() => assinarMut.mutate(p.id)}>
                          <PenLine className="mr-1 h-3 w-3" /> Assinar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {prontuarios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum prontuário encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProntuarioDetailDialog
        prontuarioId={viewId}
        open={!!viewId}
        onOpenChange={(o) => { if (!o) setViewId(null); }}
      />
    </div>
  );
}
