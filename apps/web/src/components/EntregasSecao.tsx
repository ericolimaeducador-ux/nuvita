import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Plus, Trash2 } from 'lucide-react';
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
import { entregasApi, produtosApi } from '@/api/resources';
import { useSaidaProtegida } from '@/lib/saida-protegida';
import { formatBRL, toItems } from '@/utils';
import {
  ORIGEM_ENTREGA_LABEL, OrigemEntrega, STATUS_ENTREGA_LABEL, StatusEntrega, type Entrega, type Produto,
} from '@/types';

/**
 * Entregas de insumo do paciente: registro (equipe) e confirmação (enfermeiro/admin). Confirmar pode levar o paciente
 * elegível ao fim do fluxo clínico — a decisão é do servidor; esta tela só pede e mostra.
 * TODO(conteudo): "insumo", "sonda" e as origens (SUS, plano…) são rótulos de incontinência urinária — revisar.
 */

interface ItemForm { produto: Produto; quantidade: number; valorUnitario: string }

function emCentavos(reais: string): number {
  const n = Number(reais.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}

export function EntregasSecao({ pacienteId, podeConfirmar }: { pacienteId: string; podeConfirmar: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dataEntrega, setDataEntrega] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [origem, setOrigem] = useState<OrigemEntrega | ''>('');
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [notaFiscal, setNotaFiscal] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [produtoSel, setProdutoSel] = useState<string>('');
  const [confirmando, setConfirmando] = useState<Entrega | null>(null);

  const sujo = itens.length > 0 || !!origem || !!notaFiscal.trim() || !!observacoes.trim();
  const reset = () => {
    setOpen(false);
    setDataEntrega(dayjs().format('YYYY-MM-DD'));
    setOrigem('');
    setItens([]);
    setNotaFiscal('');
    setObservacoes('');
    setProdutoSel('');
  };
  const saida = useSaidaProtegida(sujo, reset);

  const entregasQ = useQuery({
    queryKey: ['entregas', pacienteId],
    queryFn: () => entregasApi.listByPaciente(pacienteId),
  });
  const produtosQ = useQuery({ queryKey: ['produtos', false], queryFn: () => produtosApi.list(), enabled: open });

  const entregas = toItems<Entrega>(entregasQ.data as never);
  const produtos = toItems<Produto>(produtosQ.data as never);

  const totais = itens.map((i) => emCentavos(i.valorUnitario) * i.quantidade);
  const itensValidos = itens.length > 0 && itens.every((i, idx) => i.quantidade >= 1 && Number.isFinite(totais[idx]));
  const totalCentavos = itensValidos ? totais.reduce((a, b) => a + b, 0) : 0;

  const criarMut = useMutation({
    mutationFn: () =>
      entregasApi.create({
        pacienteId,
        dataEntrega,
        origem: origem as string,
        itens: itens.map((i, idx) => ({
          codigo: i.produto.codigo,
          descricao: i.produto.nome,
          quantidade: i.quantidade,
          valorUnitarioCentavos: emCentavos(i.valorUnitario),
          valorTotalCentavos: totais[idx],
        })),
        valorTotalCentavos: totalCentavos,
        notaFiscal: notaFiscal.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Entrega registrada.');
      reset();
      void qc.invalidateQueries({ queryKey: ['entregas', pacienteId] });
    },
    onError: (e) => toast.error('Erro ao registrar a entrega', apiErrorMessage(e)),
  });

  const confirmarMut = useMutation({
    mutationFn: (id: string) => entregasApi.confirmar(id),
    onSuccess: () => {
      toast.success('Entrega confirmada.');
      setConfirmando(null);
      void qc.invalidateQueries({ queryKey: ['entregas', pacienteId] });
      // A confirmação pode ter concluído a etapa do fluxo clínico do paciente.
      void qc.invalidateQueries({ queryKey: ['paciente', pacienteId] });
      void qc.invalidateQueries({ queryKey: ['pacientes-fluxo'] });
    },
    onError: (e) => toast.error('Erro ao confirmar a entrega', apiErrorMessage(e)),
  });

  function adicionarProduto() {
    const produto = produtos.find((p) => String(p.codigo) === produtoSel);
    if (!produto) return;
    setItens((atual) => [...atual, { produto, quantidade: 1, valorUnitario: '0' }]);
    setProdutoSel('');
  }

  return (
    <section aria-label="Entregas" className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 p-4">
        <span className="font-semibold text-foreground">Entregas</span>
        {!entregasQ.isError && <Badge variant="secondary">{entregas.length}</Badge>}
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Registrar entrega
        </Button>
      </div>

      <div className="px-4 pb-4">
        {entregasQ.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : entregasQ.isError ? (
          <ErroConsulta erro={entregasQ.error} refetch={entregasQ.refetch} recurso="as entregas" />
        ) : entregas.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Nenhuma entrega registrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entregas.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{dayjs(e.dataEntrega).format('DD/MM/YYYY')}</TableCell>
                  <TableCell className="text-sm">
                    {e.itens.map((i) => `${i.quantidade}× ${i.descricao}`).join('; ')}
                  </TableCell>
                  <TableCell>{ORIGEM_ENTREGA_LABEL[e.origem] ?? e.origem}</TableCell>
                  <TableCell>
                    <Badge variant={e.status === StatusEntrega.ENTREGUE ? 'secondary' : 'outline'}>
                      {STATUS_ENTREGA_LABEL[e.status] ?? e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatBRL(e.valorTotalCentavos / 100)}</TableCell>
                  <TableCell className="text-right">
                    {podeConfirmar && e.status !== StatusEntrega.ENTREGUE && (
                      <Button size="sm" variant="outline" onClick={() => setConfirmando(e)}>Confirmar</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={saida.onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" {...saida.contentProps}>
          <DialogHeader><DialogTitle>Registrar entrega</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="entregaData">Data da entrega</Label>
                <Input id="entregaData" type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Origem *</Label>
                <Select value={origem || undefined} onValueChange={(v) => setOrigem(v as OrigemEntrega)}>
                  <SelectTrigger aria-label="Origem"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.values(OrigemEntrega).map((o) => <SelectItem key={o} value={o}>{ORIGEM_ENTREGA_LABEL[o]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Itens *</Label>
              <div className="flex gap-2">
                <Select value={produtoSel || undefined} onValueChange={setProdutoSel}>
                  <SelectTrigger aria-label="Produto"><SelectValue placeholder={produtosQ.isLoading ? 'Carregando…' : 'Escolha um produto do catálogo'} /></SelectTrigger>
                  <SelectContent>
                    {produtos.map((p) => <SelectItem key={p.id} value={String(p.codigo)}>{p.codigo} — {p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={adicionarProduto} disabled={!produtoSel}>Adicionar</Button>
              </div>
              {!produtosQ.isLoading && produtos.length === 0 && (
                <p className="text-xs text-muted-foreground">Catálogo vazio: peça ao administrador para cadastrar os produtos.</p>
              )}
              {itens.map((i, idx) => (
                <div key={`${i.produto.codigo}-${idx}`} className="grid grid-cols-[1fr_5rem_7rem_2rem] items-center gap-2 text-sm">
                  <span className="truncate">{i.produto.nome}</span>
                  <Input type="number" min={1} aria-label={`Quantidade de ${i.produto.nome}`} value={i.quantidade}
                    onChange={(e) => setItens((l) => l.map((x, k) => (k === idx ? { ...x, quantidade: Math.max(1, Math.floor(Number(e.target.value) || 1)) } : x)))} />
                  <Input inputMode="decimal" aria-label={`Valor unitário de ${i.produto.nome} (R$)`} value={i.valorUnitario}
                    onChange={(e) => setItens((l) => l.map((x, k) => (k === idx ? { ...x, valorUnitario: e.target.value } : x)))} />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${i.produto.nome}`}
                    onClick={() => setItens((l) => l.filter((_, k) => k !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {itens.length > 0 && (
                <p className="text-sm font-medium">
                  Total: {itensValidos ? formatBRL(totalCentavos / 100) : '— (confira os valores)'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="entregaNF">Nota fiscal (opcional)</Label>
              <Input id="entregaNF" value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entregaObs">Observações (opcional)</Label>
              <Textarea id="entregaObs" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={saida.solicitarFechar}>Cancelar</Button>
            <Button onClick={() => criarMut.mutate()} disabled={!origem || !dataEntrega || !itensValidos || criarMut.isPending}>
              {criarMut.isPending ? 'Salvando…' : 'Registrar entrega'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmando !== null} onOpenChange={(aberto) => { if (!aberto) setConfirmando(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirmar entrega?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Confirma que os itens foram entregues ao paciente. Para um paciente no fluxo clínico de IU, isso pode concluir o fluxo.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmando(null)}>Cancelar</Button>
            <Button disabled={confirmarMut.isPending} onClick={() => confirmando && confirmarMut.mutate(confirmando.id)}>
              {confirmarMut.isPending ? 'Confirmando…' : 'Confirmar entrega'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
