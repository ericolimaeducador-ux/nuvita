import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { ErroConsulta } from '@/components/ErroConsulta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { apiErrorMessage } from '@/api/client';
import { checklistApi } from '@/api/resources';
import { toItems } from '@/utils';
import { StatusChecklistDocumento, type ChecklistItem } from '@/types';

/**
 * Checklist de documentos do paciente (equipe da clínica). Quando o último item é marcado como recebido, o servidor
 * pode levar o paciente elegível à consulta médica no fluxo clínico — esta tela só pede e mostra.
 * TODO(conteudo): a lista padrão (SUS, relatório médico, negativa administrativa) é de incontinência urinária — revisar.
 */
export function ChecklistSecao({ pacienteId }: { pacienteId: string }) {
  const qc = useQueryClient();
  const [novo, setNovo] = useState('');
  const [excluindo, setExcluindo] = useState<ChecklistItem | null>(null);

  const listQ = useQuery({
    queryKey: ['checklist', pacienteId],
    queryFn: () => checklistApi.listByPaciente(pacienteId),
  });
  const itens = toItems<ChecklistItem>(listQ.data as never);
  const recebidos = itens.filter((i) => i.status === StatusChecklistDocumento.RECEBIDO).length;

  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ['checklist', pacienteId] });
    // Receber o último item pode ter movido a etapa do fluxo clínico do paciente.
    void qc.invalidateQueries({ queryKey: ['paciente', pacienteId] });
    void qc.invalidateQueries({ queryKey: ['pacientes-fluxo'] });
  };

  const criarMut = useMutation({
    mutationFn: () => checklistApi.create({ pacienteId, nome: novo.trim() }),
    onSuccess: () => { setNovo(''); invalidar(); },
    onError: (e) => toast.error('Erro ao adicionar o documento', apiErrorMessage(e)),
  });
  const padraoMut = useMutation({
    mutationFn: () => checklistApi.criarPadrao(pacienteId),
    onSuccess: () => { toast.success('Lista padrão aplicada.'); invalidar(); },
    onError: (e) => toast.error('Erro ao aplicar a lista padrão', apiErrorMessage(e)),
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusChecklistDocumento }) => checklistApi.update(id, { status }),
    onSuccess: invalidar,
    onError: (e) => toast.error('Erro ao atualizar o documento', apiErrorMessage(e)),
  });
  const excluirMut = useMutation({
    mutationFn: (id: string) => checklistApi.remove(id),
    onSuccess: () => { setExcluindo(null); invalidar(); },
    onError: (e) => toast.error('Erro ao remover o documento', apiErrorMessage(e)),
  });

  return (
    <section aria-label="Checklist de documentos" className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 p-4">
        <span className="font-semibold text-foreground">Checklist de documentos</span>
        {!listQ.isError && <Badge variant="secondary">{recebidos}/{itens.length}</Badge>}
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => padraoMut.mutate()} disabled={padraoMut.isPending}>
          Aplicar lista padrão
        </Button>
      </div>

      <div className="space-y-3 px-4 pb-4">
        {listQ.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : listQ.isError ? (
          <ErroConsulta erro={listQ.error} refetch={listQ.refetch} recurso="o checklist" />
        ) : itens.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">Nenhum documento no checklist.</p>
        ) : (
          <ul className="divide-y divide-border">
            {itens.map((i) => {
              const recebido = i.status === StatusChecklistDocumento.RECEBIDO;
              return (
                <li key={i.id} className="flex items-center gap-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    aria-label={`Recebido: ${i.nome}`}
                    checked={recebido}
                    disabled={statusMut.isPending}
                    onChange={() =>
                      statusMut.mutate({ id: i.id, status: recebido ? StatusChecklistDocumento.PENDENTE : StatusChecklistDocumento.RECEBIDO })
                    }
                  />
                  <span className={recebido ? 'flex-1 text-muted-foreground line-through' : 'flex-1'}>{i.nome}</span>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${i.nome}`} onClick={() => setExcluindo(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => { e.preventDefault(); if (novo.trim().length >= 2) criarMut.mutate(); }}
        >
          <div className="flex-1 space-y-1">
            <Label htmlFor="checklistNovo">Novo documento</Label>
            <Input id="checklistNovo" value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Ex.: Comprovante de endereço" />
          </div>
          <Button type="submit" variant="outline" disabled={novo.trim().length < 2 || criarMut.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </form>
      </div>

      <Dialog open={excluindo !== null} onOpenChange={(aberto) => { if (!aberto) setExcluindo(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Remover documento?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            O item sai do checklist (fica registrado quem removeu). Não remove arquivos já enviados.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={excluirMut.isPending} onClick={() => excluindo && excluirMut.mutate(excluindo.id)}>
              {excluirMut.isPending ? 'Removendo…' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
