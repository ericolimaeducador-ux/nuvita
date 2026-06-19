import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Plus, TrendingUp, TrendingDown, Clock, Scale, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { financeiroApi, type CreateLancamentoPayload } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toItems } from '@/utils';
import { useAuth } from '@/auth/AuthContext';
import { toast } from '@/components/ui/use-toast';
import {
  FormaPagamento,
  FORMA_PAGAMENTO_LABEL,
  StatusLancamento,
  STATUS_LANCAMENTO_LABEL,
  TipoLancamento,
  TIPO_LANCAMENTO_LABEL,
  type DashboardFinanceiro,
  type Lancamento,
} from '@/types';

function fmtValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function lancamentoVariant(s: StatusLancamento): 'warning' | 'success' | 'destructive' {
  if (s === StatusLancamento.PENDENTE) return 'warning';
  if (s === StatusLancamento.RECEBIDO) return 'success';
  return 'destructive';
}

export function FinanceiroPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const [fTipo, setFTipo] = useState<TipoLancamento | ''>('');
  const [fDescricao, setFDescricao] = useState('');
  const [fValor, setFValor] = useState('');
  const [fForma, setFForma] = useState<FormaPagamento | ''>('');
  const [fVencimento, setFVencimento] = useState('');
  const [fObs, setFObs] = useState('');

  const dashQ = useQuery<DashboardFinanceiro>({
    queryKey: ['financeiro', 'dashboard'],
    queryFn: () => financeiroApi.dashboard(),
  });

  const listQ = useQuery({
    queryKey: ['financeiro', 'lancamentos'],
    queryFn: () => financeiroApi.list(),
  });

  const createMut = useMutation({
    mutationFn: (payload: CreateLancamentoPayload) => financeiroApi.create(payload),
    onSuccess: () => {
      toast.success('Lançamento criado.');
      resetForm();
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['financeiro'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const receberMut = useMutation({
    mutationFn: (id: string) => financeiroApi.receber(id),
    onSuccess: () => { toast.success('Lançamento marcado como recebido.'); void qc.invalidateQueries({ queryKey: ['financeiro'] }); },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const cancelarMut = useMutation({
    mutationFn: (id: string) => financeiroApi.cancelar(id),
    onSuccess: () => { toast.success('Lançamento cancelado.'); void qc.invalidateQueries({ queryKey: ['financeiro'] }); },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  function resetForm() {
    setFTipo(''); setFDescricao(''); setFValor(''); setFForma(''); setFVencimento(''); setFObs('');
  }

  function submit() {
    if (!user?.clinicaId || !fTipo || !fDescricao || !fValor) { toast.error('Preencha os campos obrigatórios.'); return; }
    createMut.mutate({
      clinicaId: user.clinicaId,
      tipo: fTipo,
      descricao: fDescricao,
      valor: parseFloat(fValor),
      formaPagamento: fForma || undefined,
      vencimento: fVencimento ? dayjs(fVencimento).toISOString() : undefined,
      observacoes: fObs || undefined,
    });
  }

  const dash = dashQ.data;
  const lancamentos = toItems<Lancamento>(listQ.data as never);

  const statCards = [
    { label: 'Receitas', value: dash?.totalReceitas ?? 0, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Despesas', value: dash?.totalDespesas ?? 0, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Pendente', value: dash?.totalPendente ?? 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    {
      label: 'Saldo',
      value: dash?.saldo ?? 0,
      icon: Scale,
      color: (dash?.saldo ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400',
      bg: (dash?.saldo ?? 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Financeiro"
        extra={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo lançamento
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {dashQ.isLoading
          ? [1,2,3,4].map((i) => <Skeleton key={i} className="h-24 w-full" />)
          : statCards.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.label}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${c.bg}`}><Icon className={`h-5 w-5 ${c.color}`} /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                        <p className={`text-lg font-bold ${c.color}`}>{fmtValor(c.value)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <Card>
        <CardContent className="p-6">
          {listQ.isLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentos.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="max-w-xs truncate font-medium">{l.descricao}</TableCell>
                    <TableCell>
                      <Badge variant={l.tipo === TipoLancamento.RECEITA ? 'success' : 'destructive'}>
                        {TIPO_LANCAMENTO_LABEL[l.tipo] ?? l.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{fmtValor(l.valor)}</TableCell>
                    <TableCell><Badge variant={lancamentoVariant(l.status)}>{STATUS_LANCAMENTO_LABEL[l.status] ?? l.status}</Badge></TableCell>
                    <TableCell>{l.formaPagamento ? (FORMA_PAGAMENTO_LABEL[l.formaPagamento] ?? l.formaPagamento) : '—'}</TableCell>
                    <TableCell>{l.vencimento ? dayjs(l.vencimento).format('DD/MM/YYYY') : '—'}</TableCell>
                    <TableCell>
                      {l.status === StatusLancamento.PENDENTE && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="Marcar como recebido" onClick={() => receberMut.mutate(l.id)}>
                            <Check className="h-4 w-4 text-emerald-400" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Cancelar" onClick={() => cancelarMut.mutate(l.id)}>
                            <X className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {lancamentos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum lançamento encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={fTipo} onValueChange={(v) => setFTipo(v as TipoLancamento)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(TipoLancamento).map((t) => <SelectItem key={t} value={t}>{TIPO_LANCAMENTO_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fDesc">Descrição</Label>
              <Input id="fDesc" value={fDescricao} onChange={(e) => setFDescricao(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fVal">Valor (R$)</Label>
              <Input id="fVal" type="number" min="0" step="0.01" placeholder="0,00" value={fValor} onChange={(e) => setFValor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select value={fForma} onValueChange={(v) => setFForma(v as FormaPagamento)}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {Object.values(FormaPagamento).map((f) => <SelectItem key={f} value={f}>{FORMA_PAGAMENTO_LABEL[f]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fVenc">Vencimento</Label>
              <Input id="fVenc" type="date" value={fVencimento} onChange={(e) => setFVencimento(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fObsFin">Observações</Label>
              <Textarea id="fObsFin" rows={2} value={fObs} onChange={(e) => setFObs(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={createMut.isPending}>{createMut.isPending ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
