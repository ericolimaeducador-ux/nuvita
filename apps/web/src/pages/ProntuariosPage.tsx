import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Plus, PenLine } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { prontuariosApi, pacientesApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toItems } from '@/utils';
import { useAuth } from '@/auth/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { ProntuarioDetailDialog } from '@/components/ProntuarioDialogs';
import { TipoAtendimento, TIPO_ATENDIMENTO_LABEL, type Prontuario, type Paciente } from '@/types';

export function ProntuariosPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [cidOpts, setCidOpts] = useState<{ value: string; label: string }[]>([]);
  const [cidSearch, setCidSearch] = useState('');
  const [cidSelected, setCidSelected] = useState('');

  // Form state
  const [fPacienteId, setFPacienteId] = useState('');
  const [fData, setFData] = useState(dayjs().format('YYYY-MM-DDTHH:mm'));
  const [fTipo, setFTipo] = useState<TipoAtendimento>(TipoAtendimento.CONSULTA);
  const [fQueixa, setFQueixa] = useState('');
  const [fHistoria, setFHistoria] = useState('');
  const [fExame, setFExame] = useState('');
  const [fAvaliacao, setFAvaliacao] = useState('');
  const [fConduta, setFConduta] = useState('');

  const listQ = useQuery({ queryKey: ['prontuarios'], queryFn: () => prontuariosApi.list() });
  const pacientesQ = useQuery({ queryKey: ['pacientes', 'select'], queryFn: () => pacientesApi.list({ limit: 100 }) });

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => prontuariosApi.create(payload),
    onSuccess: () => {
      toast.success('Prontuário registrado.');
      setOpen(false);
      resetForm();
      void qc.invalidateQueries({ queryKey: ['prontuarios'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const assinarMut = useMutation({
    mutationFn: (id: string) => prontuariosApi.assinar(id),
    onSuccess: () => { toast.success('Prontuário assinado.'); void qc.invalidateQueries({ queryKey: ['prontuarios'] }); },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const prontuarios = toItems<Prontuario>(listQ.data as never);
  const pacientes = toItems<Paciente>(pacientesQ.data as never);
  const nomePaciente = (pacienteId: string) => pacientes.find((p) => p.id === pacienteId)?.nome ?? pacienteId;

  async function buscarCid(q: string) {
    setCidSearch(q);
    if (!q || q.length < 2) return setCidOpts([]);
    try {
      const r = await prontuariosApi.cid10(q);
      setCidOpts((r ?? []).map((c) => ({ value: c.codigo, label: `${c.codigo} — ${c.descricao}` })));
    } catch { setCidOpts([]); }
  }

  function resetForm() {
    setFPacienteId(''); setFData(dayjs().format('YYYY-MM-DDTHH:mm')); setFTipo(TipoAtendimento.CONSULTA);
    setFQueixa(''); setFHistoria(''); setFExame(''); setFAvaliacao(''); setFConduta('');
    setCidSearch(''); setCidSelected(''); setCidOpts([]);
  }

  function submit() {
    if (!fPacienteId || !fQueixa) { toast.error('Preencha os campos obrigatórios.'); return; }
    createMut.mutate({
      clinicaId: user?.clinicaId,
      pacienteId: fPacienteId,
      dataAtendimento: dayjs(fData).toISOString(),
      tipo: fTipo,
      subjetivo: { queixaPrincipal: fQueixa, hda: fHistoria || undefined },
      objetivo: { exameFisico: fExame || undefined },
      avaliacao: { hipotesesDiagnosticas: fAvaliacao ? [fAvaliacao] : undefined, cid10: cidSelected ? [cidSelected] : undefined },
      plano: { conduta: fConduta || undefined },
    });
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Prontuários"
        subtitle="Registros clínicos SOAP com assinatura imutável"
        extra={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo prontuário
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          {listQ.isLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
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
                      {!p.assinado && (
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

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo prontuário (SOAP)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Paciente</Label>
                <Select value={fPacienteId} onValueChange={setFPacienteId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                  <SelectContent>
                    {pacientes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pData">Data do atendimento</Label>
                <Input id="pData" type="datetime-local" value={fData} onChange={(e) => setFData(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de atendimento</Label>
              <Select value={fTipo} onValueChange={(v) => setFTipo(v as TipoAtendimento)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(TipoAtendimento).map((t) => <SelectItem key={t} value={t}>{TIPO_ATENDIMENTO_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">S — Subjetivo</p>
            <div className="space-y-2">
              <Label htmlFor="queixa">Queixa principal *</Label>
              <Textarea id="queixa" rows={2} value={fQueixa} onChange={(e) => setFQueixa(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="historia">História da doença atual</Label>
              <Textarea id="historia" rows={2} value={fHistoria} onChange={(e) => setFHistoria(e.target.value)} />
            </div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">O — Objetivo</p>
            <div className="space-y-2">
              <Label htmlFor="exame">Exame físico</Label>
              <Textarea id="exame" rows={2} value={fExame} onChange={(e) => setFExame(e.target.value)} />
            </div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">A — Avaliação</p>
            <div className="space-y-2">
              <Label htmlFor="avaliacao">Hipótese diagnóstica</Label>
              <Textarea id="avaliacao" rows={2} value={fAvaliacao} onChange={(e) => setFAvaliacao(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidSearch">CID-10</Label>
              <Input id="cidSearch" placeholder="Digite para buscar (ex.: J11)" value={cidSearch} onChange={(e) => buscarCid(e.target.value)} />
              {cidOpts.length > 0 && (
                <div className="glass rounded-lg p-1 space-y-0.5 max-h-40 overflow-y-auto">
                  {cidOpts.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-secondary text-foreground"
                      onClick={() => { setCidSelected(o.value); setCidSearch(o.label); setCidOpts([]); }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">P — Plano</p>
            <div className="space-y-2">
              <Label htmlFor="conduta">Conduta</Label>
              <Textarea id="conduta" rows={2} value={fConduta} onChange={(e) => setFConduta(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={createMut.isPending}>{createMut.isPending ? 'Registrando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProntuarioDetailDialog
        prontuarioId={viewId}
        open={!!viewId}
        onOpenChange={(o) => { if (!o) setViewId(null); }}
      />
    </div>
  );
}
