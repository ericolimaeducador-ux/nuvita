import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import { ErroConsulta } from '@/components/ErroConsulta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { apiErrorMessage } from '@/api/client';
import { consultasApi } from '@/api/resources';
import { toItems } from '@/utils';
import { STATUS_COBRANCA_CONSULTA_LABEL, StatusConsulta, type ConsultaEnfermagem } from '@/types';

/**
 * Consultas de enfermagem do paciente, em ordem cronológica (somente leitura aqui; abrir leva à tela da consulta).
 * Visível só para ENFERMEIRO: o conteúdo clínico não é mostrado a secretaria/admin.
 */
export function ConsultasSecao({ pacienteId }: { pacienteId: string }) {
  const navigate = useNavigate();
  const listQ = useQuery({ queryKey: ['consultas', pacienteId], queryFn: () => consultasApi.listByPaciente(pacienteId) });
  const consultas = toItems<ConsultaEnfermagem>(listQ.data as never);

  const novaMut = useMutation({
    mutationFn: () => consultasApi.create(pacienteId),
    onSuccess: (c) => navigate(`/pacientes/${pacienteId}/consultas/${c.id}`),
    onError: (e) => toast.error('Erro ao iniciar a consulta', apiErrorMessage(e)),
  });

  return (
    <section aria-label="Consultas de enfermagem" className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 p-4">
        <span className="font-semibold text-foreground">Consultas de enfermagem</span>
        {!listQ.isError && <Badge variant="secondary">{consultas.length}</Badge>}
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => novaMut.mutate()} disabled={novaMut.isPending}>
          <Plus className="mr-2 h-4 w-4" /> Nova consulta
        </Button>
      </div>
      <div className="px-4 pb-4">
        {listQ.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : listQ.isError ? (
          <ErroConsulta erro={listQ.error} refetch={listQ.refetch} recurso="as consultas" />
        ) : consultas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma consulta registrada.</p>
        ) : (
          <ol className="space-y-2">
            {consultas.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                <span className="w-32">{dayjs(c.assinatura?.dataAssinatura ?? c.criadoEm).format('DD/MM/YYYY HH:mm')}</span>
                <Badge variant={c.status === StatusConsulta.ASSINADA ? 'secondary' : 'outline'}>
                  {c.status === StatusConsulta.ASSINADA ? 'Assinada' : 'Rascunho'}
                </Badge>
                {c.cobranca && <span className="text-xs text-muted-foreground">{STATUS_COBRANCA_CONSULTA_LABEL[c.cobranca.status]}</span>}
                <div className="flex-1" />
                <Link className="font-medium hover:underline" to={`/pacientes/${pacienteId}/consultas/${c.id}`}>Abrir</Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
