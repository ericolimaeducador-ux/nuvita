import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ErroConsulta } from '@/components/ErroConsulta';
import { AvaliacaoIUDialog } from '@/components/AvaliacaoIUDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { apiErrorMessage } from '@/api/client';
import { avaliacaoIUApi, produtosApi } from '@/api/resources';
import { toItems } from '@/utils';
import { LOCAL_LABEL, TIPO_IU_LABEL, type AvaliacaoIU, type Produto } from '@/types';

/**
 * Avaliações de incontinência urinária do paciente. Registrar/editar/excluir: enfermeiro e admin; a secretaria só lê.
 * Registrar pode levar o paciente elegível ao passo "Avaliação de IU" do fluxo clínico — a decisão é do servidor.
 * TODO(conteudo): a ficha inteira (campos, rótulos, textos) é de incontinência urinária — revisar.
 */
export function AvaliacaoIuSecao({
  pacienteId, podeEscrever, enfermeiroRegistro,
}: { pacienteId: string; podeEscrever: boolean; enfermeiroRegistro?: string }) {
  const qc = useQueryClient();
  const [dialogo, setDialogo] = useState<{ aberto: boolean; avaliacao?: AvaliacaoIU }>({ aberto: false });
  const [excluindo, setExcluindo] = useState<AvaliacaoIU | null>(null);

  const listQ = useQuery({
    queryKey: ['avaliacao-iu', pacienteId],
    queryFn: () => avaliacaoIUApi.listByPaciente(pacienteId),
  });
  const produtosQ = useQuery({ queryKey: ['produtos', false], queryFn: () => produtosApi.list(), enabled: dialogo.aberto });
  const avaliacoes = toItems<AvaliacaoIU>(listQ.data as never);
  const produtos = toItems<Produto>(produtosQ.data as never);

  const revalidar = () => {
    void qc.invalidateQueries({ queryKey: ['avaliacao-iu', pacienteId] });
    // Registrar a avaliação pode ter movido a etapa do fluxo clínico do paciente.
    void qc.invalidateQueries({ queryKey: ['paciente', pacienteId] });
    void qc.invalidateQueries({ queryKey: ['pacientes-fluxo'] });
  };

  const excluirMut = useMutation({
    mutationFn: (id: string) => avaliacaoIUApi.excluir(id),
    onSuccess: () => { toast.success('Avaliação excluída.'); setExcluindo(null); revalidar(); },
    onError: (e) => toast.error('Erro ao excluir a avaliação', apiErrorMessage(e)),
  });

  return (
    <section aria-label="Avaliação de IU" className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 p-4">
        <span className="font-semibold text-foreground">Avaliação de IU</span>
        {!listQ.isError && <Badge variant="secondary">{avaliacoes.length}</Badge>}
        <div className="flex-1" />
        {podeEscrever && (
          <Button size="sm" variant="outline" onClick={() => setDialogo({ aberto: true })}>
            <Plus className="mr-2 h-4 w-4" /> Nova avaliação
          </Button>
        )}
      </div>

      <div className="px-4 pb-4">
        {listQ.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : listQ.isError ? (
          <ErroConsulta erro={listQ.error} refetch={listQ.refetch} recurso="as avaliações" />
        ) : avaliacoes.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Nenhuma avaliação registrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Tipos de IU</TableHead>
                <TableHead>Profissional</TableHead>
                {podeEscrever && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {avaliacoes.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{dayjs(a.dataAtendimento).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>{LOCAL_LABEL[a.local] ?? a.local}</TableCell>
                  <TableCell className="text-sm">{(a.tiposIU ?? []).map((t) => TIPO_IU_LABEL[t] ?? t).join(', ') || '—'}</TableCell>
                  <TableCell className="text-sm">{a.enfermeiroNome ?? '—'}</TableCell>
                  {podeEscrever && (
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" size="icon" aria-label={`Editar avaliação de ${dayjs(a.dataAtendimento).format('DD/MM/YYYY')}`}
                        onClick={() => setDialogo({ aberto: true, avaliacao: a })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Excluir avaliação de ${dayjs(a.dataAtendimento).format('DD/MM/YYYY')}`}
                        onClick={() => setExcluindo(a)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AvaliacaoIUDialog
        open={dialogo.aberto}
        onOpenChange={(aberto) => { if (!aberto) setDialogo({ aberto: false }); }}
        pacienteId={pacienteId}
        produtos={produtos}
        avaliacao={dialogo.avaliacao}
        enfermeiroRegistro={enfermeiroRegistro}
        onCreated={revalidar}
      />

      <Dialog open={excluindo !== null} onOpenChange={(aberto) => { if (!aberto) setExcluindo(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Excluir avaliação?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            A avaliação sai da lista (fica registrado quem excluiu). Não desfaz a etapa do fluxo clínico já alcançada.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={excluirMut.isPending} onClick={() => excluindo && excluirMut.mutate(excluindo.id)}>
              {excluirMut.isPending ? 'Excluindo…' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
