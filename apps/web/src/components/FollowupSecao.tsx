import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import { ErroConsulta } from '@/components/ErroConsulta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { apiErrorMessage } from '@/api/client';
import { avaliacaoIUApi, followupApi } from '@/api/resources';
import { useSaidaProtegida } from '@/lib/saida-protegida';
import { toItems } from '@/utils';
import { LOCAL_LABEL, STATUS_ELEGIBILIDADE_LABEL, StatusElegibilidade, type AvaliacaoIU, type FollowUp } from '@/types';

const SEM_AVALIACAO = 'nenhuma';

/**
 * Follow-up de elegibilidade. Registrar (enfermeiro/admin) pode mover a etapa do fluxo clínico de um paciente elegível:
 * "Elegível" -> contato; "Não elegível" -> fim do fluxo. A decisão é do servidor; a secretaria só consulta.
 * TODO(conteudo): "elegível" aqui é a elegibilidade ao insumo do fluxo de incontinência urinária (SUS/laudo) — revisar.
 */
export function FollowupSecao({ pacienteId, podeDecidir }: { pacienteId: string; podeDecidir: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [status, setStatus] = useState<StatusElegibilidade | ''>('');
  const [observacoes, setObservacoes] = useState('');
  const [proximo, setProximo] = useState('');
  const [avaliacaoId, setAvaliacaoId] = useState(SEM_AVALIACAO);

  const sujo = !!status || !!observacoes.trim() || !!proximo || avaliacaoId !== SEM_AVALIACAO;
  const reset = () => {
    setOpen(false);
    setData(dayjs().format('YYYY-MM-DD'));
    setStatus('');
    setObservacoes('');
    setProximo('');
    setAvaliacaoId(SEM_AVALIACAO);
  };
  const saida = useSaidaProtegida(sujo, reset);

  const listQ = useQuery({ queryKey: ['followup', pacienteId], queryFn: () => followupApi.listByPaciente(pacienteId) });
  const registros = toItems<FollowUp>(listQ.data as never);
  // Avaliações do paciente para escolher a de origem (opcional; o servidor valida que é deste paciente/clínica).
  const avaliacoesQ = useQuery({
    queryKey: ['avaliacao-iu', pacienteId],
    queryFn: () => avaliacaoIUApi.listByPaciente(pacienteId),
    enabled: open,
  });
  const avaliacoes = toItems<AvaliacaoIU>(avaliacoesQ.data as never);

  const criarMut = useMutation({
    mutationFn: () =>
      followupApi.create({
        pacienteId,
        dataFollowup: data,
        statusElegibilidade: status as string,
        observacoes: observacoes.trim(),
        proximoFollowup: proximo || undefined,
        avaliacaoIuId: avaliacaoId !== SEM_AVALIACAO ? avaliacaoId : undefined,
      }),
    onSuccess: () => {
      toast.success('Follow-up registrado.');
      reset();
      void qc.invalidateQueries({ queryKey: ['followup', pacienteId] });
      // A decisão pode ter movido a etapa do fluxo clínico do paciente.
      void qc.invalidateQueries({ queryKey: ['paciente', pacienteId] });
      void qc.invalidateQueries({ queryKey: ['pacientes-fluxo'] });
    },
    onError: (e) => toast.error('Erro ao registrar o follow-up', apiErrorMessage(e)),
  });

  return (
    <section aria-label="Follow-up" className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 p-4">
        <span className="font-semibold text-foreground">Follow-up de elegibilidade</span>
        {!listQ.isError && <Badge variant="secondary">{registros.length}</Badge>}
        <div className="flex-1" />
        {podeDecidir && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Registrar follow-up
          </Button>
        )}
      </div>

      <div className="px-4 pb-4">
        {listQ.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : listQ.isError ? (
          <ErroConsulta erro={listQ.error} refetch={listQ.refetch} recurso="os follow-ups" />
        ) : registros.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Nenhum follow-up registrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead>Próximo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{dayjs(f.dataFollowup).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>
                    <Badge variant={f.statusElegibilidade === StatusElegibilidade.ELEGIVEL ? 'secondary' : 'outline'}>
                      {STATUS_ELEGIBILIDADE_LABEL[f.statusElegibilidade] ?? f.statusElegibilidade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{f.observacoes}</TableCell>
                  <TableCell>{f.proximoFollowup ? dayjs(f.proximoFollowup).format('DD/MM/YYYY') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={saida.onOpenChange}>
        <DialogContent className="max-w-lg" {...saida.contentProps}>
          <DialogHeader><DialogTitle>Registrar follow-up</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fuData">Data</Label>
                <Input id="fuData" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Situação *</Label>
                <Select value={status || undefined} onValueChange={(v) => setStatus(v as StatusElegibilidade)}>
                  <SelectTrigger aria-label="Situação"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.values(StatusElegibilidade).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_ELEGIBILIDADE_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuObs">Observações *</Label>
              <Textarea id="fuObs" rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Avaliação de origem (opcional)</Label>
              <Select value={avaliacaoId} onValueChange={setAvaliacaoId}>
                <SelectTrigger aria-label="Avaliação de origem"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_AVALIACAO}>Nenhuma</SelectItem>
                  {avaliacoes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {dayjs(a.dataAtendimento).format('DD/MM/YYYY')} — {LOCAL_LABEL[a.local] ?? a.local}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuProx">Próximo follow-up (opcional)</Label>
              <Input id="fuProx" type="date" value={proximo} onChange={(e) => setProximo(e.target.value)} />
            </div>
            {(status === StatusElegibilidade.ELEGIVEL || status === StatusElegibilidade.NAO_ELEGIVEL) && (
              <p className="text-xs text-muted-foreground">
                Para um paciente no fluxo clínico de IU, esta decisão atualiza a etapa do fluxo.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={saida.solicitarFechar}>Cancelar</Button>
            <Button onClick={() => criarMut.mutate()} disabled={!status || !data || !observacoes.trim() || criarMut.isPending}>
              {criarMut.isPending ? 'Salvando…' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
